<script lang="ts">
	import { onMount } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

	const RADIUS = 60;
	const PUSH_FORCE = 18;
	const RETURN_SPEED = 0.12;

	// MODE 'glyphs' renders the ASCII portrait; 'pixels' renders the image as a
	// grid of colored squares. Both share the explosion physics (Rapier/WASM).
	const MODE: 'glyphs' | 'pixels' = 'glyphs';
	const GLYPH_STEP = 4; // sample every Nth glyph (~1400 particles)
	const DISPLAY_GRID = 84; // resting pixelation resolution (finer image)
	const EXPLODE_GRID = 52; // explosion body resolution (kept light for physics)
	const SCALE = 50; // pixels per physics-metre (Rapier is tuned for ~1m bodies)
	const GRAVITY = 44; // m/s^2 (snappy fall)
	const REST_SPEED = 0.06;
	const MAX_FRAMES = 360;
	const N_ROT = 24; // rotation buckets for the glyph sprite atlas

	// Most particles burst and vanish quickly (then leave the physics world); only
	// a minority fall and stack. Vanishing early + deep keeps the heavy full-count
	// phase short — that phase is the whole "slow start".
	const VANISH_FRAC = 0.58;
	const VANISH_START = 2;
	const VANISH_END = 10;
	const ENABLE_COLLISION_FRAME = 12;

	// Collision groups (membership<<16 | filter):
	const G_WALL = (0x0001 << 16) | 0xffff;
	const G_BURST = (0x0002 << 16) | 0x0001;
	const G_STACK = (0x0002 << 16) | 0x0003;

	const PIXEL = MODE === 'pixels';

	let loaded = $state(false);
	let exploded = $state(false);
	let restoring = $state(false);
	let mouseX = -1000;
	let mouseY = -1000;
	let animId: number;
	let explodeAnimId: number;
	let overlayCanvas: HTMLCanvasElement | undefined;
	let restoreFn: (() => void) | undefined;
	let physicsWorld: any = null;
	let kickRender: (() => void) | null = null;

	let RAPIER: any = null;
	let rapierPromise: Promise<any> | null = null;
	function loadRapier() {
		if (!rapierPromise) {
			rapierPromise = import('@dimforge/rapier2d-compat').then(async (mod: any) => {
				const R = mod.default ?? mod;
				await R.init();
				try {
					const w = new R.World({ x: 0, y: 9.8 });
					for (let i = 0; i < 60; i++) {
						const b = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i * 0.1, 0));
						w.createCollider(R.ColliderDesc.cuboid(0.05, 0.05), b);
					}
					for (let s = 0; s < 40; s++) w.step();
					w.free();
				} catch (e) { /* warmup is best-effort */ }
				RAPIER = R;
				return R;
			});
		}
		return rapierPromise;
	}

	type CharData = { char: string; x: number; y: number; color: string };
	type RectData = { x: number; y: number; w: number; h: number; color: string };

	onMount(async () => {
		const res = await fetch('/portrait.svg');
		const svgText = await res.text();

		const parser = new DOMParser();
		const doc = parser.parseFromString(svgText, 'image/svg+xml');
		const svgEl = doc.querySelector('svg');
		if (!svgEl) return;

		const chars: CharData[] = [];
		const rects: RectData[] = [];

		for (const t of svgEl.querySelectorAll('text')) {
			chars.push({
				char: t.textContent || '',
				x: parseFloat(t.getAttribute('x') || '0'),
				y: parseFloat(t.getAttribute('y') || '0'),
				color: t.style.fill || '#000',
			});
		}

		for (const r of svgEl.querySelectorAll('rect')) {
			rects.push({
				x: parseFloat(r.getAttribute('x') || '0'),
				y: parseFloat(r.getAttribute('y') || '0'),
				w: parseFloat(r.getAttribute('width') || '0'),
				h: parseFloat(r.getAttribute('height') || '0'),
				color: r.style.fill || '#000',
			});
		}

		loaded = true;
		loadRapier();
		await new Promise((r) => requestAnimationFrame(r));
		if (!canvasEl || !containerEl) return;

		let size = containerEl.offsetWidth;
		let scale = size / 600;
		const dpr = window.devicePixelRatio || 1;

		function resizeCanvas() {
			if (!canvasEl || !containerEl) return;
			size = containerEl.offsetWidth;
			scale = size / 600;
			canvasEl.width = size * dpr;
			canvasEl.height = size * dpr;
			const c = canvasEl.getContext('2d');
			if (c) c.scale(dpr, dpr);
		}

		resizeCanvas();

		const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		const resizeObserver = new ResizeObserver(() => {
			resizeCanvas();
			kickRender?.();
		});
		resizeObserver.observe(containerEl);

		const rectDx = new Float32Array(rects.length);
		const rectDy = new Float32Array(rects.length);
		const charDx = new Float32Array(chars.length);
		const charDy = new Float32Array(chars.length);

		const fontStr = `bold ${12 * scale}px monospace`;
		const r2 = RADIUS * scale;

		ctx.font = fontStr;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		const gm = ctx.measureText('8');
		const cOffX = gm.width / 2;
		const cOffY = (((gm.actualBoundingBoxDescent ?? 2) - (gm.actualBoundingBoxAscent ?? 8)) / 2) || -3 * scale;

		// --- Pixel grid: sample the rendered portrait once into colored squares ---
		const gridLen = DISPLAY_GRID * DISPLAY_GRID;
		const colorGrid: (string | null)[] = new Array(gridLen).fill(null);
		const pixDx = new Float32Array(gridLen);
		const pixDy = new Float32Array(gridLen);
		const explodeLen = EXPLODE_GRID * EXPLODE_GRID;
		const colorGridE: (string | null)[] = new Array(explodeLen).fill(null);

		function drawAsciiPortrait() {
			if (!ctx) return;
			for (let i = 0; i < rects.length; i++) {
				ctx.fillStyle = rects[i].color;
				ctx.fillRect(rects[i].x * scale, rects[i].y * scale, rects[i].w * scale + 0.5, rects[i].h * scale + 0.5);
			}
			ctx.font = fontStr;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			for (let i = 0; i < chars.length; i++) {
				ctx.fillStyle = chars[i].color;
				ctx.fillText(chars[i].char, chars[i].x * scale, chars[i].y * scale);
			}
		}

		function sampleColors() {
			if (!ctx || !canvasEl) return;
			ctx.clearRect(0, 0, size, size);
			drawAsciiPortrait();
			const img = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
			const bw = canvasEl.width;
			const bh = canvasEl.height;
			const sampleInto = (grid: (string | null)[], G: number) => {
				const cell = size / G;
				for (let gy = 0; gy < G; gy++) {
					for (let gx = 0; gx < G; gx++) {
						const bx = Math.min(bw - 1, ((gx * cell + cell / 2) * dpr) | 0);
						const by = Math.min(bh - 1, ((gy * cell + cell / 2) * dpr) | 0);
						const idx = (by * bw + bx) * 4;
						grid[gy * G + gx] = img[idx + 3] < 12 ? null : `rgb(${img[idx]},${img[idx + 1]},${img[idx + 2]})`;
					}
				}
			};
			sampleInto(colorGrid, DISPLAY_GRID);
			sampleInto(colorGridE, EXPLODE_GRID);
		}

		if (PIXEL) sampleColors();

		let renderActive = false;
		function render() {
			if (!ctx) return;
			renderActive = true;
			ctx.clearRect(0, 0, size, size);
			let active = mouseX > -500;

			if (PIXEL) {
				const cell = size / DISPLAY_GRID;
				const half = cell / 2;
				if (mouseX > -500) {
					for (let i = 0; i < gridLen; i++) {
						if (!colorGrid[i]) continue;
						const cx = (i % DISPLAY_GRID) * cell + half;
						const cy = ((i / DISPLAY_GRID) | 0) * cell + half;
						const dx = cx - mouseX;
						const dy = cy - mouseY;
						const distSq = dx * dx + dy * dy;
						if (distSq < r2 * r2 && distSq > 0) {
							const dist = Math.sqrt(distSq);
							const force = (1 - dist / r2) * PUSH_FORCE * scale;
							pixDx[i] += (dx / dist) * force;
							pixDy[i] += (dy / dist) * force;
						}
					}
				}
				for (let i = 0; i < gridLen; i++) {
					const col = colorGrid[i];
					if (!col) continue;
					pixDx[i] *= (1 - RETURN_SPEED);
					pixDy[i] *= (1 - RETURN_SPEED);
					if (pixDx[i] * pixDx[i] + pixDy[i] * pixDy[i] > 0.04) active = true;
					ctx.fillStyle = col;
					ctx.fillRect(
						(i % DISPLAY_GRID) * cell + pixDx[i],
						((i / DISPLAY_GRID) | 0) * cell + pixDy[i],
						cell + 0.6,
						cell + 0.6
					);
				}
			} else {
				if (mouseX > -500) {
					for (let i = 0; i < rects.length; i++) {
						const cx = (rects[i].x + rects[i].w / 2) * scale;
						const cy = (rects[i].y + rects[i].h / 2) * scale;
						const dx = cx - mouseX;
						const dy = cy - mouseY;
						const distSq = dx * dx + dy * dy;
						if (distSq < r2 * r2 && distSq > 0) {
							const dist = Math.sqrt(distSq);
							const force = (1 - dist / r2) * PUSH_FORCE * scale;
							rectDx[i] += (dx / dist) * force;
							rectDy[i] += (dy / dist) * force;
						}
					}
					for (let i = 0; i < chars.length; i++) {
						const cx = chars[i].x * scale;
						const cy = chars[i].y * scale;
						const dx = cx - mouseX;
						const dy = cy - mouseY;
						const distSq = dx * dx + dy * dy;
						if (distSq < r2 * r2 && distSq > 0) {
							const dist = Math.sqrt(distSq);
							const force = (1 - dist / r2) * PUSH_FORCE * scale;
							charDx[i] += (dx / dist) * force;
							charDy[i] += (dy / dist) * force;
						}
					}
				}
				for (let i = 0; i < rects.length; i++) {
					rectDx[i] *= (1 - RETURN_SPEED);
					rectDy[i] *= (1 - RETURN_SPEED);
					if (rectDx[i] * rectDx[i] + rectDy[i] * rectDy[i] > 0.04) active = true;
					ctx.fillStyle = rects[i].color;
					ctx.fillRect(
						rects[i].x * scale + rectDx[i],
						rects[i].y * scale + rectDy[i],
						rects[i].w * scale + 0.5,
						rects[i].h * scale + 0.5
					);
				}
				ctx.font = fontStr;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'alphabetic';
				for (let i = 0; i < chars.length; i++) {
					charDx[i] *= (1 - RETURN_SPEED);
					charDy[i] *= (1 - RETURN_SPEED);
					if (charDx[i] * charDx[i] + charDy[i] * charDy[i] > 0.04) active = true;
					ctx.fillStyle = chars[i].color;
					ctx.fillText(chars[i].char, chars[i].x * scale + charDx[i], chars[i].y * scale + charDy[i]);
				}
			}

			if (active) {
				animId = requestAnimationFrame(render);
			} else {
				renderActive = false;
			}
		}

		kickRender = () => {
			if (!renderActive && !exploded && !restoring) {
				renderActive = true;
				render();
			}
		};

		render();

		// --- Glyph rotation sprite atlas (glyph mode only) ---
		let glyphAtlas: Map<string, HTMLCanvasElement[]> | null = null;
		let glyphAtlasFont = '';
		let glyphCellPx = 0;
		function ensureAtlas(comboMap: Map<string, { ch: string; color: string }>) {
			if (!glyphAtlas || glyphAtlasFont !== fontStr) {
				glyphAtlas = new Map();
				glyphAtlasFont = fontStr;
				glyphCellPx = Math.ceil(10 * scale * 2);
			}
			const cp = glyphCellPx;
			for (const [key, { ch, color }] of comboMap) {
				if (glyphAtlas.has(key)) continue;
				const arr: HTMLCanvasElement[] = new Array(N_ROT);
				for (let k = 0; k < N_ROT; k++) {
					const cv = document.createElement('canvas');
					cv.width = Math.ceil(cp * dpr);
					cv.height = cv.width;
					const sx = cv.getContext('2d')!;
					sx.scale(dpr, dpr);
					sx.translate(cp / 2, cp / 2);
					sx.rotate((k * 2 * Math.PI) / N_ROT);
					sx.font = fontStr;
					sx.textAlign = 'left';
					sx.textBaseline = 'alphabetic';
					sx.fillStyle = color;
					sx.fillText(ch, -cOffX, -cOffY);
					arr[k] = cv;
				}
				glyphAtlas.set(key, arr);
			}
			return cp;
		}

		if (!PIXEL) {
			setTimeout(() => {
				const cm = new Map<string, { ch: string; color: string }>();
				for (let i = 0; i < chars.length; i += GLYPH_STEP) {
					const k = chars[i].char + '@@' + chars[i].color;
					if (!cm.has(k)) cm.set(k, { ch: chars[i].char, color: chars[i].color });
				}
				ensureAtlas(cm);
			}, 400);
		}

		async function explode() {
			if (exploded || !canvasEl || !ctx) return;
			exploded = true;
			cancelAnimationFrame(animId);

			const R = RAPIER ?? (await loadRapier());

			const rect = canvasEl.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const odpr = 1;
			const useGlyph = !PIXEL;

			const world = new R.World({ x: 0, y: GRAVITY });
			physicsWorld = world;

			const W = 100 / SCALE;
			const vwm = vw / SCALE;
			const vhm = vh / SCALE;
			const addWall = (cx: number, cy: number, hx: number, hy: number) => {
				const b = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(cx, cy));
				world.createCollider(R.ColliderDesc.cuboid(hx, hy).setCollisionGroups(G_WALL), b);
			};
			addWall(vwm / 2, vhm + W, vwm, W);
			addWall(-W, vhm / 2, W, vhm * 2);
			addWall(vwm + W, vhm / 2, W, vhm * 2);

			const gOffX = useGlyph ? cOffX : 0;
			const gOffY = useGlyph ? cOffY : 0;
			type P = { lx: number; ly: number; color: string; glyph: string };
			const items: P[] = [];
			let cell = size / EXPLODE_GRID;

			if (useGlyph) {
				for (let i = 0; i < chars.length; i += GLYPH_STEP) {
					items.push({
						lx: chars[i].x * scale + charDx[i] + gOffX,
						ly: chars[i].y * scale + charDy[i] + gOffY,
						color: chars[i].color,
						glyph: chars[i].char,
					});
				}
			} else {
				const half = cell / 2;
				for (let i = 0; i < explodeLen; i++) {
					const col = colorGridE[i];
					if (!col) continue;
					items.push({
						lx: (i % EXPLODE_GRID) * cell + half,
						ly: ((i / EXPLODE_GRID) | 0) * cell + half,
						color: col,
						glyph: '',
					});
				}
			}

			const cap = items.length;
			const ox = new Float32Array(cap);
			const oy = new Float32Array(cap);
			const colors: string[] = new Array(cap);
			const keys: string[] = new Array(cap);
			const lasting = new Uint8Array(cap);
			const alive = new Uint8Array(cap).fill(1);
			const bodies: any[] = new Array(cap);
			const colliders: any[] = new Array(cap);
			const comboMap = new Map<string, { ch: string; color: string }>();

			const he = useGlyph ? (5 * scale * 0.5) / SCALE : (cell * 0.46) / SCALE;

			for (let m = 0; m < cap; m++) {
				const it = items[m];
				ox[m] = it.lx;
				oy[m] = it.ly;
				colors[m] = it.color;
				lasting[m] = Math.random() > VANISH_FRAC ? 1 : 0;
				const key = it.glyph + '@@' + it.color;
				keys[m] = key;
				if (useGlyph && !comboMap.has(key)) comboMap.set(key, { ch: it.glyph, color: it.color });

				const x = rect.left + it.lx;
				const y = rect.top + it.ly;
				const angle = Math.atan2(y - centerY, x - centerX) + (Math.random() - 0.5);
				const speed = 5 + Math.random() * 18;
				const vxp = Math.cos(angle) * speed;
				const vyp = Math.sin(angle) * speed - 4 - Math.random() * 7;

				let desc = R.RigidBodyDesc.dynamic()
					.setTranslation(x / SCALE, y / SCALE)
					.setLinvel((vxp * 60) / SCALE, (vyp * 60) / SCALE)
					.setLinearDamping(0.12);
				if (useGlyph) desc = desc.setAngvel((Math.random() - 0.5) * 11);
				else desc = desc.lockRotations();

				const body = world.createRigidBody(desc);
				const collider = world.createCollider(
					R.ColliderDesc.cuboid(he, he).setRestitution(0.35).setFriction(0.6).setCollisionGroups(G_BURST),
					body
				);
				bodies[m] = body;
				colliders[m] = collider;
			}
			const n = cap;

			const cp = useGlyph ? ensureAtlas(comboMap) : 0;
			const cpHalf = cp / 2;
			const sprites: HTMLCanvasElement[][] = useGlyph ? keys.map((k) => glyphAtlas!.get(k)!) : [];
			const ROT_STEP = (2 * Math.PI) / N_ROT;

			const overlay = document.createElement('canvas');
			overlay.style.cssText =
				'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
			overlay.width = Math.round(vw * odpr);
			overlay.height = Math.round(vh * odpr);
			document.body.appendChild(overlay);
			overlayCanvas = overlay;

			const octx = overlay.getContext('2d');
			if (!octx) { world.free(); physicsWorld = null; return; }

			canvasEl.style.visibility = 'hidden';
			const drawW = useGlyph ? 0 : cell + 0.6;
			const pixHalf = useGlyph ? 0 : cell / 2;

			if (useGlyph && glyphAtlas) {
				octx.setTransform(odpr, 0, 0, odpr, 0, 0);
				octx.globalAlpha = 0.01;
				let pi = 0;
				const spx = cp * 0.5;
				for (const arr of glyphAtlas.values()) {
					for (let k = 0; k < arr.length; k++) { octx.drawImage(arr[k], (pi % 90) * spx, ((pi / 90) | 0) * spx, cp, cp); pi++; }
				}
				octx.globalAlpha = 1;
			}

			const ephAlpha = (f: number) =>
				f >= VANISH_START ? Math.max(0, 1 - (f - VANISH_START) / (VANISH_END - VANISH_START)) : 1;

			function drawParticle(i: number, x: number, y: number, ang: number, alpha: number) {
				if (!octx || alpha <= 0) return;
				if (alpha !== 1) octx.globalAlpha = alpha;
				if (useGlyph) {
					let b = Math.round(ang / ROT_STEP) % N_ROT;
					if (b < 0) b += N_ROT;
					octx.drawImage(sprites[i][b], x - cpHalf, y - cpHalf, cp, cp);
				} else {
					octx.fillStyle = colors[i];
					octx.fillRect(x - pixHalf, y - pixHalf, drawW, drawW);
				}
				if (alpha !== 1) octx.globalAlpha = 1;
			}

			const frames: Float32Array[] = [];
			let frame = 0;

			function tick() {
				if (!octx) return;
				world.step();
				frame++;

				if (frame === ENABLE_COLLISION_FRAME) {
					for (let i = 0; i < n; i++) if (alive[i]) colliders[i].setCollisionGroups(G_STACK);
				}

				octx.setTransform(odpr, 0, 0, odpr, 0, 0);
				octx.clearRect(0, 0, vw, vh);

				const fr = new Float32Array(n * 3);
				let moving = 0;
				for (let i = 0; i < n; i++) {
					if (!alive[i]) { fr[i * 3] = NaN; continue; }
					const t = bodies[i].translation();
					const x = t.x * SCALE;
					const y = t.y * SCALE;
					const ang = useGlyph ? bodies[i].rotation() : 0;
					fr[i * 3] = x;
					fr[i * 3 + 1] = y;
					fr[i * 3 + 2] = ang;

					let alpha = 1;
					if (lasting[i]) {
						const v = bodies[i].linvel();
						if (Math.abs(v.x) + Math.abs(v.y) > REST_SPEED) moving++;
					} else {
						alpha = ephAlpha(frame);
					}
					drawParticle(i, x, y, ang, alpha);
				}
				frames.push(fr);

				if (frame === VANISH_END) {
					for (let i = 0; i < n; i++) {
						if (!lasting[i] && alive[i]) {
							world.removeRigidBody(bodies[i]);
							alive[i] = 0;
						}
					}
				}

				if (moving > n * 0.01 && frame < MAX_FRAMES) {
					explodeAnimId = requestAnimationFrame(tick);
				}
			}

			{
				const fr0 = new Float32Array(n * 3);
				for (let i = 0; i < n; i++) {
					fr0[i * 3] = rect.left + ox[i];
					fr0[i * 3 + 1] = rect.top + oy[i];
					fr0[i * 3 + 2] = 0;
				}
				frames.push(fr0);
			}

			explodeAnimId = requestAnimationFrame(tick);

			restoreFn = () => {
				if (!octx) return;
				cancelAnimationFrame(explodeAnimId);
				restoring = true;
				if (physicsWorld) { physicsWorld.free(); physicsWorld = null; }

				let cursor = frames.length - 1;
				const REVERSE_STEP = 1.6;

				function rewind() {
					if (!octx || !canvasEl) return;
					const idx = Math.max(0, Math.round(cursor));
					const fr = frames[idx];
					octx.setTransform(odpr, 0, 0, odpr, 0, 0);
					octx.clearRect(0, 0, vw, vh);

					for (let i = 0; i < n; i++) {
						const x = fr[i * 3];
						if (Number.isNaN(x)) continue;
						const alpha = lasting[i] ? 1 : ephAlpha(idx);
						drawParticle(i, x, fr[i * 3 + 1], fr[i * 3 + 2], alpha);
					}

					if (idx <= 0) {
						overlay.remove();
						overlayCanvas = undefined;
						canvasEl!.style.visibility = '';
						charDx.fill(0); charDy.fill(0); rectDx.fill(0); rectDy.fill(0); pixDx.fill(0); pixDy.fill(0);
						exploded = false;
						restoring = false;
						render();
					} else {
						cursor -= REVERSE_STEP;
						explodeAnimId = requestAnimationFrame(rewind);
					}
				}

				rewind();
			};
		}

		const el = containerEl;
		const onTouchStart = (e: TouchEvent) => { e.preventDefault(); handleTouchStart(e); };
		const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleTouchMove(e); };
		const onTouchEnd = () => handleLeave();
		const onClick = () => { explode(); };
		el.addEventListener('touchstart', onTouchStart, { passive: false });
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		el.addEventListener('touchend', onTouchEnd);
		el.addEventListener('click', onClick);

		return () => {
			if (animId) cancelAnimationFrame(animId);
			if (explodeAnimId) cancelAnimationFrame(explodeAnimId);
			resizeObserver.disconnect();
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
			el.removeEventListener('touchend', onTouchEnd);
			el.removeEventListener('click', onClick);
			if (overlayCanvas) overlayCanvas.remove();
			if (physicsWorld) { physicsWorld.free(); physicsWorld = null; }
		};
	});

	function getCanvasCoords(clientX: number, clientY: number) {
		if (!canvasEl) return;
		const r = canvasEl.getBoundingClientRect();
		mouseX = clientX - r.left;
		mouseY = clientY - r.top;
		kickRender?.();
	}

	function handleMouseMove(e: MouseEvent) {
		getCanvasCoords(e.clientX, e.clientY);
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches[0]) getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches[0]) getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
	}

	function handleLeave() {
		mouseX = -1000;
		mouseY = -1000;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative">
	<div
		bind:this={containerEl}
		class="select-none w-full md:max-w-lg aspect-square touch-none"
		onmousemove={handleMouseMove}
		onmouseleave={handleLeave}
	>
		{#if loaded}
			<canvas
				bind:this={canvasEl}
				class="w-full h-full rounded-lg"
			></canvas>
		{/if}
	</div>
	{#if exploded && !restoring}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<button
				onclick={() => restoreFn?.()}
				class="pointer-events-auto px-4 py-2 text-sm text-stone hover:text-ink transition-colors"
				style="font-style: italic;"
			>
				Reparo
			</button>
		</div>
	{/if}
</div>
