<script lang="ts">
	import { onMount } from 'svelte';

	// Pixelated portrait: the image is sampled into a grid of colored squares
	// (downscale-with-averaging), reacts to the cursor like water, and shatters
	// with physics on click. "Reparo" eases every pixel back to its exact origin.
	const PIXEL_GRID = 69; // squares per side
	const SCALE = 50; // pixels per physics-metre
	const GRAVITY = 150; // higher = pixels fall/settle faster (snappier explosion)
	const BURST = 32;
	const VANISH_FRAC = 0; // 0 = every pixel falls & stacks
	const REPARO_MS = 750;

	const RADIUS = 60;
	const PUSH_FORCE = 18;
	const RETURN_SPEED = 0.12;

	// Collision groups (membership<<16 | filter):
	const G_WALL = (0x0001 << 16) | 0xffff;
	const G_BURST = (0x0002 << 16) | 0x0001;
	const G_STACK = (0x0002 << 16) | 0x0003;

	let containerEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

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
	let pileCleanup: (() => void) | null = null; // remove ball-pit listeners

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
				} catch (e) { /* best effort */ }
				RAPIER = R;
				return R;
			});
		}
		return rapierPromise;
	}

	async function loadSource(): Promise<CanvasImageSource> {
		// Prefer a real photo; fall back to the existing portrait.svg.
		try {
			const img = new Image();
			img.src = '/test-portrait.png';
			await img.decode();
			return img;
		} catch (e) {
			const res = await fetch('/portrait.svg');
			const txt = await res.text();
			const url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
			const svg = new Image();
			svg.width = 600;
			svg.height = 600;
			svg.src = url;
			await svg.decode();
			return svg;
		}
	}

	const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

	onMount(async () => {
		const sourceImg = await loadSource();

		// Sample the source into PIXEL_GRID^2 averaged colors (once).
		const gridLen = PIXEL_GRID * PIXEL_GRID;
		const small = document.createElement('canvas');
		small.width = PIXEL_GRID;
		small.height = PIXEL_GRID;
		const sctx = small.getContext('2d')!;
		sctx.imageSmoothingEnabled = true;
		sctx.imageSmoothingQuality = 'high';
		sctx.drawImage(sourceImg, 0, 0, PIXEL_GRID, PIXEL_GRID);
		const data = sctx.getImageData(0, 0, PIXEL_GRID, PIXEL_GRID).data;

		const colorStr: (string | null)[] = new Array(gridLen);
		for (let i = 0; i < gridLen; i++) {
			const o = i * 4;
			colorStr[i] = data[o + 3] < 8 ? null : `rgb(${data[o]},${data[o + 1]},${data[o + 2]})`;
		}
		const pixDx = new Float32Array(gridLen);
		const pixDy = new Float32Array(gridLen);

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

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const resizeObserver = new ResizeObserver(() => { resizeCanvas(); kickRender?.(); });
		resizeObserver.observe(containerEl);

		const r2 = RADIUS * scale;

		let renderActive = false;
		function render() {
			if (!ctx) return;
			renderActive = true;
			const cell = size / PIXEL_GRID;
			const half = cell / 2;
			ctx.clearRect(0, 0, size, size);
			let active = mouseX > -500;

			if (mouseX > -500) {
				for (let i = 0; i < gridLen; i++) {
					if (!colorStr[i]) continue;
					const cx = (i % PIXEL_GRID) * cell + half;
					const cy = ((i / PIXEL_GRID) | 0) * cell + half;
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
				const col = colorStr[i];
				if (!col) continue;
				pixDx[i] *= (1 - RETURN_SPEED);
				pixDy[i] *= (1 - RETURN_SPEED);
				if (pixDx[i] * pixDx[i] + pixDy[i] * pixDy[i] > 0.04) active = true;
				ctx.fillStyle = col;
				ctx.fillRect(
					(i % PIXEL_GRID) * cell + pixDx[i],
					((i / PIXEL_GRID) | 0) * cell + pixDy[i],
					cell + 0.6,
					cell + 0.6
				);
			}

			if (active) animId = requestAnimationFrame(render);
			else renderActive = false;
		}

		kickRender = () => {
			if (!renderActive && !exploded && !restoring) { renderActive = true; render(); }
		};
		render();

		async function explode() {
			if (exploded || !canvasEl) return;
			exploded = true;
			cancelAnimationFrame(animId);

			const R = RAPIER ?? (await loadRapier());
			const rect = canvasEl.getBoundingClientRect();
			const cell = size / PIXEL_GRID;
			const half = cell / 2;
			const cx = rect.left + size / 2;
			const cy = rect.top + size / 2;
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			const world = new R.World({ x: 0, y: GRAVITY });
			physicsWorld = world;
			const Wm = 100 / SCALE;
			const addWall = (x: number, y: number, hx: number, hy: number) => {
				const b = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y));
				world.createCollider(R.ColliderDesc.cuboid(hx, hy).setCollisionGroups(G_WALL), b);
			};
			addWall(vw / 2 / SCALE, vh / SCALE + Wm, vw / SCALE, Wm);
			addWall(-Wm, vh / 2 / SCALE, Wm, (vh * 2) / SCALE);
			addWall(vw / SCALE + Wm, vh / 2 / SCALE, Wm, (vh * 2) / SCALE);

			const he = (cell * 0.46) / SCALE;
			const bodies: any[] = [];
			const colliders: any[] = [];
			const ox: number[] = [];
			const oy: number[] = [];
			const cols: string[] = [];
			const lasting: boolean[] = [];

			for (let i = 0; i < gridLen; i++) {
				const col = colorStr[i];
				if (!col) continue;
				const gx = i % PIXEL_GRID;
				const gy = (i / PIXEL_GRID) | 0;
				const lx = gx * cell + half + pixDx[i];
				const ly = gy * cell + half + pixDy[i];
				const x = rect.left + lx;
				const y = rect.top + ly;
				const ang = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5);
				const sp = 5 + Math.random() * BURST;
				const desc = R.RigidBodyDesc.dynamic()
					.setTranslation(x / SCALE, y / SCALE)
					.setLinvel((Math.cos(ang) * sp * 60) / SCALE, ((Math.sin(ang) * sp - 4 - Math.random() * 7) * 60) / SCALE)
					.setLinearDamping(0.12)
					.lockRotations();
				const body = world.createRigidBody(desc);
				const collider = world.createCollider(
					R.ColliderDesc.cuboid(he, he).setRestitution(0.35).setFriction(0.6).setCollisionGroups(G_BURST),
					body
				);
				bodies.push(body);
				colliders.push(collider);
				ox.push(lx);
				oy.push(ly);
				cols.push(col);
				lasting.push(Math.random() >= VANISH_FRAC);
			}
			const n = bodies.length;

			const overlay = document.createElement('canvas');
			overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
			overlay.width = vw;
			overlay.height = vh;
			document.body.appendChild(overlay);
			overlayCanvas = overlay;
			const octx = overlay.getContext('2d');
			if (!octx) { world.free(); physicsWorld = null; return; }

			canvasEl.style.visibility = 'hidden';
			const dw = cell + 0.6;

			// Ball-pit interaction: the cursor shoves nearby pixels. Most of a
			// settled pile sleeps (≈free); only disturbed pixels wake & cost work,
			// and the loop pauses entirely once everything re-settles.
			const PILE_R = 95;
			const PILE_R2 = PILE_R * PILE_R;
			const PILE_PUSH = 6;
			let curX = -1e9;
			let curY = -1e9;
			let curMoveT = -1e9;
			let looping = true;

			function tick() {
				if (!octx) return;
				world.step();
				frame++;
				if (frame === 14) for (let i = 0; i < n; i++) colliders[i].setCollisionGroups(G_STACK);

				octx.clearRect(0, 0, vw, vh);
				const stir = performance.now() - curMoveT < 120;
				let awake = 0;
				for (let i = 0; i < n; i++) {
					const t = bodies[i].translation();
					const x = t.x * SCALE;
					const y = t.y * SCALE;
					let v = bodies[i].linvel();
					if (stir) {
						const dx = x - curX;
						const dy = y - curY;
						const d2 = dx * dx + dy * dy;
						if (d2 < PILE_R2 && d2 > 1) {
							const d = Math.sqrt(d2);
							const f = (1 - d / PILE_R) * PILE_PUSH;
							bodies[i].setLinvel({ x: v.x + (dx / d) * f, y: v.y + (dy / d) * f }, true);
							v = bodies[i].linvel();
						}
					}
					if (Math.abs(v.x) + Math.abs(v.y) > 0.06) awake++;
					octx.fillStyle = cols[i];
					octx.fillRect(x - half, y - half, dw, dw);
				}

				if (awake > 0) {
					explodeAnimId = requestAnimationFrame(tick);
				} else {
					looping = false; // pile asleep — pause until the cursor stirs it
				}
			}

			let frame = 0;

			// Stir the pile from anywhere over the page while it's exploded.
			const onCur = (cx: number, cy: number) => {
				curX = cx;
				curY = cy;
				curMoveT = performance.now();
				if (!looping && exploded && !restoring) {
					looping = true;
					explodeAnimId = requestAnimationFrame(tick);
				}
			};
			const pmMouse = (e: MouseEvent) => onCur(e.clientX, e.clientY);
			const pmTouch = (e: TouchEvent) => { if (e.touches[0]) onCur(e.touches[0].clientX, e.touches[0].clientY); };
			window.addEventListener('mousemove', pmMouse);
			window.addEventListener('touchmove', pmTouch, { passive: true });
			pileCleanup = () => {
				window.removeEventListener('mousemove', pmMouse);
				window.removeEventListener('touchmove', pmTouch);
				pileCleanup = null;
			};

			explodeAnimId = requestAnimationFrame(tick);

			restoreFn = () => {
				if (!octx) return;
				cancelAnimationFrame(explodeAnimId);
				restoring = true;
				pileCleanup?.();
				const sx = new Float32Array(n);
				const sy = new Float32Array(n);
				for (let i = 0; i < n; i++) {
					const t = bodies[i].translation();
					sx[i] = t.x * SCALE;
					sy[i] = t.y * SCALE;
				}
				world.free();
				physicsWorld = null;

				const r3 = canvasEl!.getBoundingClientRect();
				const start = performance.now();
				function back(now: number) {
					if (!octx || !canvasEl) return;
					const t = Math.min(1, (now - start) / REPARO_MS);
					const e = easeInOut(t);
					octx.clearRect(0, 0, vw, vh);
					for (let i = 0; i < n; i++) {
						const tx = r3.left + ox[i];
						const ty = r3.top + oy[i];
						const x = sx[i] + (tx - sx[i]) * e;
						const y = sy[i] + (ty - sy[i]) * e;
						octx.fillStyle = cols[i];
						octx.fillRect(x - half, y - half, dw, dw);
					}
					if (t < 1) {
						explodeAnimId = requestAnimationFrame(back);
					} else {
						overlay.remove();
						overlayCanvas = undefined;
						canvasEl.style.visibility = '';
						pixDx.fill(0);
						pixDy.fill(0);
						exploded = false;
						restoring = false;
						render();
					}
				}
				explodeAnimId = requestAnimationFrame(back);
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
			pileCleanup?.();
		};
	});

	function getCanvasCoords(clientX: number, clientY: number) {
		if (!canvasEl) return;
		const r = canvasEl.getBoundingClientRect();
		mouseX = clientX - r.left;
		mouseY = clientY - r.top;
		kickRender?.();
	}
	function handleMouseMove(e: MouseEvent) { getCanvasCoords(e.clientX, e.clientY); }
	function handleTouchStart(e: TouchEvent) { if (e.touches[0]) getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY); }
	function handleTouchMove(e: TouchEvent) { if (e.touches[0]) getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY); }
	function handleLeave() { mouseX = -1000; mouseY = -1000; }
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
			<canvas bind:this={canvasEl} class="w-full h-full rounded-lg" style="cursor:pointer;"></canvas>
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
