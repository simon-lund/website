<script lang="ts">
	import { onMount } from 'svelte';

	// Live-tunable params
	let grid = $state(48); // pixelation resolution (squares per side)
	let gravityV = $state(44); // m/s^2
	let burst = $state(20); // initial outward speed
	let vanishFrac = $state(0); // 0 = every pixel falls & stacks
	let reparoMs = $state(650); // duration of the eased return
	let rotate = $state(false); // let squares tumble

	const SCALE = 50;
	const DISPLAY = 460; // css px of the square canvas

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let exploded = $state(false);
	let restoring = $state(false);
	let srcReady = $state(false);
	let usingFallback = $state(false);

	let RAPIER: any = null;
	let sourceImg: CanvasImageSource | null = null;
	let dpr = 1;
	let ctx: CanvasRenderingContext2D | null = null;

	// colorGrid: flat [r,g,b,a] * grid*grid, sampled by downscaling the source.
	let colorGrid = new Uint8ClampedArray(0);

	const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

	async function loadRapier() {
		if (RAPIER) return RAPIER;
		const mod: any = await import('@dimforge/rapier2d-compat');
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
	}

	async function loadSource(): Promise<CanvasImageSource> {
		// Prefer a real photo; fall back to the existing portrait.svg.
		try {
			const img = new Image();
			img.src = '/test-portrait.png';
			await img.decode();
			usingFallback = false;
			return img;
		} catch (e) {
			usingFallback = true;
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

	// Downscale the source to grid x grid with smoothing -> averaged pixel colors.
	function sample() {
		if (!sourceImg) return;
		const small = document.createElement('canvas');
		small.width = grid;
		small.height = grid;
		const sx = small.getContext('2d')!;
		sx.imageSmoothingEnabled = true;
		sx.imageSmoothingQuality = 'high';
		sx.drawImage(sourceImg, 0, 0, grid, grid);
		colorGrid = sx.getImageData(0, 0, grid, grid).data;
	}

	function renderStatic() {
		if (!ctx || !canvasEl) return;
		const cell = DISPLAY / grid;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, DISPLAY, DISPLAY);
		for (let gy = 0; gy < grid; gy++) {
			for (let gx = 0; gx < grid; gx++) {
				const i = (gy * grid + gx) * 4;
				if (colorGrid[i + 3] < 8) continue;
				ctx.fillStyle = `rgb(${colorGrid[i]},${colorGrid[i + 1]},${colorGrid[i + 2]})`;
				ctx.fillRect(gx * cell, gy * cell, cell + 0.6, cell + 0.6);
			}
		}
	}

	function rebuild() {
		if (!srcReady || exploded) return;
		sample();
		renderStatic();
	}

	let explodeAnimId = 0;
	let overlay: HTMLCanvasElement | undefined;

	async function explode() {
		if (exploded || !canvasEl) return;
		exploded = true;

		const R = await loadRapier();
		const rect = canvasEl.getBoundingClientRect();
		const cell = DISPLAY / grid;
		const half = cell / 2;
		const cx = rect.left + DISPLAY / 2;
		const cy = rect.top + DISPLAY / 2;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const world = new R.World({ x: 0, y: gravityV });
		const W = 100 / SCALE;
		const addWall = (x: number, y: number, hx: number, hy: number) => {
			const b = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y));
			world.createCollider(R.ColliderDesc.cuboid(hx, hy).setCollisionGroups((1 << 16) | 0xffff), b);
		};
		addWall(vw / 2 / SCALE, vh / SCALE + W, vw / SCALE, W);
		addWall(-W, vh / 2 / SCALE, W, (vh * 2) / SCALE);
		addWall(vw / SCALE + W, vh / 2 / SCALE, W, (vh * 2) / SCALE);

		const G_BURST = (2 << 16) | 1;
		const G_STACK = (2 << 16) | 3;
		const he = (cell * 0.46) / SCALE;

		const bodies: any[] = [];
		const colliders: any[] = [];
		const ox: number[] = []; // local origin (within canvas) for the eased return
		const oy: number[] = [];
		const cols: string[] = [];
		const lasting: boolean[] = [];

		for (let gy = 0; gy < grid; gy++) {
			for (let gx = 0; gx < grid; gx++) {
				const ci = (gy * grid + gx) * 4;
				if (colorGrid[ci + 3] < 8) continue;
				const lx = gx * cell + half;
				const ly = gy * cell + half;
				const x = rect.left + lx;
				const y = rect.top + ly;
				const ang = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5);
				const sp = 5 + Math.random() * burst;
				let desc = R.RigidBodyDesc.dynamic()
					.setTranslation(x / SCALE, y / SCALE)
					.setLinvel((Math.cos(ang) * sp * 60) / SCALE, ((Math.sin(ang) * sp - 4 - Math.random() * 7) * 60) / SCALE)
					.setLinearDamping(0.12);
				if (rotate) desc = desc.setAngvel((Math.random() - 0.5) * 9);
				else desc = desc.lockRotations();
				const body = world.createRigidBody(desc);
				const collider = world.createCollider(
					R.ColliderDesc.cuboid(he, he).setRestitution(0.35).setFriction(0.6).setCollisionGroups(G_BURST),
					body
				);
				bodies.push(body);
				colliders.push(collider);
				ox.push(lx);
				oy.push(ly);
				cols.push(`rgb(${colorGrid[ci]},${colorGrid[ci + 1]},${colorGrid[ci + 2]})`);
				lasting.push(Math.random() >= vanishFrac);
			}
		}
		const n = bodies.length;

		overlay = document.createElement('canvas');
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
		overlay.width = vw;
		overlay.height = vh;
		document.body.appendChild(overlay);
		const octx = overlay.getContext('2d')!;
		canvasEl.style.visibility = 'hidden';

		const dw = cell + 0.6;
		const VANISH_END = 12;
		const alive = new Uint8Array(n).fill(1);
		let frame = 0;

		function tick() {
			world.step();
			frame++;
			if (frame === 14) for (let i = 0; i < n; i++) if (alive[i]) colliders[i].setCollisionGroups(G_STACK);

			octx.clearRect(0, 0, vw, vh);
			let moving = 0;
			for (let i = 0; i < n; i++) {
				if (!alive[i]) continue;
				const t = bodies[i].translation();
				const x = t.x * SCALE;
				const y = t.y * SCALE;
				if (!lasting[i]) {
					const a = Math.max(0, 1 - (frame - 2) / (VANISH_END - 2));
					if (a <= 0) continue;
					octx.globalAlpha = a;
				}
				const v = bodies[i].linvel();
				if (lasting[i] && Math.abs(v.x) + Math.abs(v.y) > 0.06) moving++;
				if (rotate) {
					const r = bodies[i].rotation();
					const c = Math.cos(r), s = Math.sin(r);
					octx.setTransform(c, s, -s, c, x, y);
					octx.fillStyle = cols[i];
					octx.fillRect(-half, -half, dw, dw);
					octx.setTransform(1, 0, 0, 1, 0, 0);
				} else {
					octx.fillStyle = cols[i];
					octx.fillRect(x - half, y - half, dw, dw);
				}
				if (!lasting[i]) octx.globalAlpha = 1;
			}
			if (frame === VANISH_END) for (let i = 0; i < n; i++) if (!lasting[i] && alive[i]) { world.removeRigidBody(bodies[i]); alive[i] = 0; }

			if (moving > n * 0.01 && frame < 360) explodeAnimId = requestAnimationFrame(tick);
		}
		explodeAnimId = requestAnimationFrame(tick);

		// Fluent Reparo: snapshot scattered positions, ease them home exactly.
		restore = () => {
			cancelAnimationFrame(explodeAnimId);
			restoring = true;
			const sxArr = new Float32Array(n);
			const syArr = new Float32Array(n);
			const present = new Uint8Array(n);
			for (let i = 0; i < n; i++) {
				if (!alive[i]) { present[i] = 0; continue; }
				const t = bodies[i].translation();
				sxArr[i] = t.x * SCALE;
				syArr[i] = t.y * SCALE;
				present[i] = 1;
			}
			world.free();

			const r2 = canvasEl!.getBoundingClientRect();
			const start = performance.now();
			function back(now: number) {
				const t = Math.min(1, (now - start) / reparoMs);
				const e = easeInOut(t);
				octx.clearRect(0, 0, vw, vh);
				for (let i = 0; i < n; i++) {
					const tx = r2.left + ox[i];
					const ty = r2.top + oy[i];
					// vanished pixels fade back in at home; the rest glide home.
					if (!present[i]) {
						octx.globalAlpha = e;
						octx.fillStyle = cols[i];
						octx.fillRect(tx - half, ty - half, dw, dw);
						octx.globalAlpha = 1;
						continue;
					}
					const x = sxArr[i] + (tx - sxArr[i]) * e;
					const y = syArr[i] + (ty - syArr[i]) * e;
					octx.fillStyle = cols[i];
					octx.fillRect(x - half, y - half, dw, dw);
				}
				if (t < 1) {
					explodeAnimId = requestAnimationFrame(back);
				} else {
					overlay!.remove();
					overlay = undefined;
					canvasEl!.style.visibility = '';
					exploded = false;
					restoring = false;
					renderStatic();
				}
			}
			explodeAnimId = requestAnimationFrame(back);
		};
	}

	let restore: (() => void) | null = null;

	onMount(() => {
		dpr = window.devicePixelRatio || 1;
		if (canvasEl) {
			canvasEl.width = DISPLAY * dpr;
			canvasEl.height = DISPLAY * dpr;
			ctx = canvasEl.getContext('2d', { willReadFrequently: true });
		}
		loadRapier();
		loadSource().then((img) => {
			sourceImg = img;
			srcReady = true;
			sample();
			renderStatic();
		});
		return () => { if (overlay) overlay.remove(); };
	});

	// re-pixelate when the grid changes
	$effect(() => {
		grid;
		if (srcReady && !exploded) rebuild();
	});
</script>

<div class="flex flex-col items-center gap-5">
	<canvas
		bind:this={canvasEl}
		onclick={() => explode()}
		style="width:{DISPLAY}px;height:{DISPLAY}px;cursor:pointer;border-radius:0.5rem;"
		class="select-none"
	></canvas>

	<div class="flex items-center gap-3">
		{#if exploded && !restoring}
			<button class="px-4 py-2 text-sm rounded-md bg-cream-dark hover:bg-accent-light transition-colors" onclick={() => restore?.()}>Reparo</button>
		{:else}
			<span class="text-sm text-stone">click the image to explode</span>
		{/if}
		{#if usingFallback}<span class="text-xs text-stone">(using portrait.svg — drop a photo at <code>public/test-portrait.png</code>)</span>{/if}
	</div>

	<div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm w-full max-w-md">
		<label class="flex items-center justify-between gap-3">pixels <input type="range" min="16" max="120" bind:value={grid} /> <span class="w-8 text-right text-stone">{grid}</span></label>
		<label class="flex items-center justify-between gap-3">gravity <input type="range" min="10" max="90" bind:value={gravityV} /> <span class="w-8 text-right text-stone">{gravityV}</span></label>
		<label class="flex items-center justify-between gap-3">burst <input type="range" min="5" max="45" bind:value={burst} /> <span class="w-8 text-right text-stone">{burst}</span></label>
		<label class="flex items-center justify-between gap-3">vanish <input type="range" min="0" max="0.8" step="0.05" bind:value={vanishFrac} /> <span class="w-8 text-right text-stone">{vanishFrac}</span></label>
		<label class="flex items-center justify-between gap-3">reparo ms <input type="range" min="250" max="1500" step="50" bind:value={reparoMs} /> <span class="w-10 text-right text-stone">{reparoMs}</span></label>
		<label class="flex items-center justify-between gap-3">rotate <input type="checkbox" bind:checked={rotate} /></label>
	</div>
</div>
