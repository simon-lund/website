<script lang="ts">
	import { onMount } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

	const RADIUS = 60;
	const PUSH_FORCE = 18;
	const RETURN_SPEED = 0.12;

	let loaded = $state(false);
	let exploded = $state(false);
	let restoring = $state(false);
	let mouseX = -1000;
	let mouseY = -1000;
	let animId: number;
	let explodeAnimId: number;
	let overlayEl: HTMLDivElement | undefined;
	let overlayCanvas: HTMLCanvasElement | undefined;
	let restoreFn: (() => void) | undefined;

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

		const resizeObserver = new ResizeObserver(() => resizeCanvas());
		resizeObserver.observe(containerEl);

		const rectDx = new Float32Array(rects.length);
		const rectDy = new Float32Array(rects.length);
		const charDx = new Float32Array(chars.length);
		const charDy = new Float32Array(chars.length);

		const fontStr = `bold ${10 * scale}px monospace`;
		const r2 = RADIUS * scale;

		function render() {
			if (!ctx) return;
			ctx.clearRect(0, 0, size, size);

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
				ctx.fillStyle = rects[i].color;
				ctx.fillRect(
					rects[i].x * scale + rectDx[i],
					rects[i].y * scale + rectDy[i],
					rects[i].w * scale + 0.5,
					rects[i].h * scale + 0.5
				);
			}

			ctx.font = fontStr;
			ctx.textBaseline = 'alphabetic';
			for (let i = 0; i < chars.length; i++) {
				charDx[i] *= (1 - RETURN_SPEED);
				charDy[i] *= (1 - RETURN_SPEED);
				ctx.fillStyle = chars[i].color;
				ctx.fillText(
					chars[i].char,
					chars[i].x * scale + charDx[i],
					chars[i].y * scale + charDy[i]
				);
			}

			animId = requestAnimationFrame(render);
		}

		render();

		function explode() {
			if (exploded || !canvasEl) return;
			exploded = true;
			cancelAnimationFrame(animId);

			const canvasRect = canvasEl.getBoundingClientRect();
			const scrollY = window.scrollY;
			const centerX = canvasRect.left + canvasRect.width / 2;
			const centerY = canvasRect.top + scrollY + canvasRect.height / 2;

			const pageW = document.documentElement.scrollWidth;
			const pageH = document.documentElement.scrollHeight;

			const step = 10;
			const n = Math.ceil(chars.length / step);

			const px = new Float32Array(n);
			const py = new Float32Array(n);
			const vx = new Float32Array(n);
			const vy = new Float32Array(n);
			const ox = new Float32Array(n);
			const oy = new Float32Array(n);
			const colors: string[] = [];
			const glyphs: string[] = [];

			for (let i = 0, j = 0; i < chars.length; i += step, j++) {
				const x = canvasRect.left + chars[i].x * scale + charDx[i];
				const y = canvasRect.top + scrollY + chars[i].y * scale + charDy[i];
				px[j] = x;
				py[j] = y;
				ox[j] = x;
				oy[j] = y;
				const angle = Math.atan2(y - centerY, x - centerX) + (Math.random() - 0.5) * 1.2;
				const speed = 10 + Math.random() * 18;
				vx[j] = Math.cos(angle) * speed;
				vy[j] = Math.sin(angle) * speed - Math.random() * 8;
				colors.push(chars[i].color);
				glyphs.push(chars[i].char);
			}

			const wrapper = document.createElement('div');
			wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:9999;';
			wrapper.style.height = pageH + 'px';
			document.body.appendChild(wrapper);
			overlayEl = wrapper;

			const canvas = document.createElement('canvas');
			canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
			const odpr = window.devicePixelRatio || 1;
			canvas.width = pageW * odpr;
			canvas.height = pageH * odpr;
			wrapper.appendChild(canvas);
			overlayCanvas = canvas;

			const octx = canvas.getContext('2d');
			if (!octx) return;
			octx.scale(odpr, odpr);

			canvasEl.style.visibility = 'hidden';
			const fontSize = `bold ${10 * scale}px monospace`;
			const GRAVITY = 0.5;
			const BOUNCE = 0.3;
			const FRICTION = 0.99;
			const floorY = pageH - 10;

			function tick() {
				if (!octx) return;
				octx.clearRect(0, 0, pageW, pageH);
				octx.font = fontSize;
				octx.textBaseline = 'middle';
				let active = 0;

				for (let i = 0; i < n; i++) {
					vy[i] += GRAVITY;
					vx[i] *= FRICTION;
					px[i] += vx[i];
					py[i] += vy[i];

					if (py[i] > floorY) {
						py[i] = floorY;
						vy[i] *= -BOUNCE;
						vx[i] *= 0.8;
					}
					if (px[i] < 0) { px[i] = 0; vx[i] *= -0.5; }
					if (px[i] > pageW) { px[i] = pageW; vx[i] *= -0.5; }

					if (Math.abs(vx[i]) > 0.1 || Math.abs(vy[i]) > 0.1) active++;

					octx.fillStyle = colors[i];
					octx.fillText(glyphs[i], px[i], py[i]);
				}

				if (active > 0) {
					explodeAnimId = requestAnimationFrame(tick);
				}
			}

			tick();

			restoreFn = () => {
				if (!octx || !canvasEl) return;
				cancelAnimationFrame(explodeAnimId);
				restoring = true;

				function restore() {
					if (!octx) return;
					octx.clearRect(0, 0, pageW, pageH);
					octx.font = fontSize;
					octx.textBaseline = 'middle';
					let done = 0;

					for (let i = 0; i < n; i++) {
						px[i] += (ox[i] - px[i]) * 0.15;
						py[i] += (oy[i] - py[i]) * 0.15;

						const dx = ox[i] - px[i];
						const dy = oy[i] - py[i];
						if (dx * dx + dy * dy < 1) {
							px[i] = ox[i];
							py[i] = oy[i];
							done++;
						}

						octx.fillStyle = colors[i];
						octx.fillText(glyphs[i], px[i], py[i]);
					}

					if (done < n) {
						explodeAnimId = requestAnimationFrame(restore);
					} else {
						wrapper.remove();
						overlayEl = undefined;
						overlayCanvas = undefined;
						if (canvasEl) canvasEl.style.visibility = '';
						charDx.fill(0);
						charDy.fill(0);
						rectDx.fill(0);
						rectDy.fill(0);
						exploded = false;
						restoring = false;
						render();
					}
				}

				restore();
			};
		}

		const el = containerEl;
		const onTouchStart = (e: TouchEvent) => { e.preventDefault(); handleTouchStart(e); };
		const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleTouchMove(e); };
		const onTouchEnd = () => handleLeave();
		const onClick = () => explode();
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
			if (overlayEl) overlayEl.remove();
		};
	});

	function getCanvasCoords(clientX: number, clientY: number) {
		if (!canvasEl) return;
		const r = canvasEl.getBoundingClientRect();
		mouseX = clientX - r.left;
		mouseY = clientY - r.top;
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
		<button
			onclick={() => restoreFn?.()}
			class="absolute inset-0 flex items-center justify-center text-sm text-stone hover:text-ink transition-colors"
			style="font-style: italic;"
		>
			Reparo
		</button>
	{/if}
</div>
