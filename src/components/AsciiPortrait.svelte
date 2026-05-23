<script lang="ts">
	import { onMount } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

	const RADIUS = 60;
	const PUSH_FORCE = 18;
	const RETURN_SPEED = 0.12;

	let loaded = $state(false);
	let mouseX = -1000;
	let mouseY = -1000;
	let animId: number;

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

		const resizeObserver = new ResizeObserver(() => {
			resizeCanvas();
		});
		resizeObserver.observe(containerEl);

		// Build displacement arrays for rects and chars separately
		const rectDx = new Float32Array(rects.length);
		const rectDy = new Float32Array(rects.length);
		const charDx = new Float32Array(chars.length);
		const charDy = new Float32Array(chars.length);

		const fontStr = `bold ${10 * scale}px monospace`;
		const r2 = RADIUS * scale;

		function render() {
			if (!ctx) return;
			ctx.clearRect(0, 0, size, size);

			// Apply forces from cursor
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

			// Draw all rects
			for (let i = 0; i < rects.length; i++) {
				rectDx[i] *= (1 - RETURN_SPEED);
				rectDy[i] *= (1 - RETURN_SPEED);
				ctx.fillStyle = rects[i].color;
				ctx.fillRect(
					rects[i].x * scale + rectDx[i],
					rects[i].y * scale + rectDy[i],
					rects[i].w * scale,
					rects[i].h * scale
				);
			}

			// Draw all chars
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

		const el = containerEl;
		const onTouchStart = (e: TouchEvent) => { e.preventDefault(); handleTouchStart(e); };
		const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleTouchMove(e); };
		const onTouchEnd = () => handleLeave();
		el.addEventListener('touchstart', onTouchStart, { passive: false });
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		el.addEventListener('touchend', onTouchEnd);

		return () => {
			if (animId) cancelAnimationFrame(animId);
			resizeObserver.disconnect();
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
			el.removeEventListener('touchend', onTouchEnd);
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
