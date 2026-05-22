<script lang="ts">
	import { onMount } from 'svelte';

	let containerEl: HTMLDivElement | undefined = $state();

	const RADIUS = 60;
	const PUSH_FORCE = 18;
	const RETURN_SPEED = 0.12;

	let mouseX = -1000;
	let mouseY = -1000;
	let animId: number;

	type CharNode = {
		els: SVGElement[];
		homeX: number;
		homeY: number;
		dx: number;
		dy: number;
		active: boolean;
	};

	onMount(async () => {
		const res = await fetch('/portrait.svg');
		const svgText = await res.text();

		if (!containerEl) return;
		containerEl.innerHTML = svgText;
		const svgEl = containerEl.querySelector('svg');
		if (!svgEl) return;

		svgEl.style.width = '100%';
		svgEl.style.height = '100%';
		svgEl.classList.add('rounded-lg');

		const allRects = Array.from(svgEl.querySelectorAll('rect'));
		const allTexts = Array.from(svgEl.querySelectorAll('text'));

		const rectByPos = new Map<string, SVGRectElement>();
		for (const r of allRects) {
			rectByPos.set(`${r.getAttribute('x')},${r.getAttribute('y')}`, r);
		}

		const textPositions = new Set(allTexts.map(t =>
			`${t.getAttribute('x')},${parseFloat(t.getAttribute('y') || '0') - 8}`
		));

		const nodes: CharNode[] = allTexts.map((t) => {
			const tx = parseFloat(t.getAttribute('x') || '0');
			const ty = parseFloat(t.getAttribute('y') || '0');
			const rect = rectByPos.get(`${tx},${ty - 8}`);
			const els: SVGElement[] = [t];
			if (rect) els.push(rect);
			return { els, homeX: tx, homeY: ty, dx: 0, dy: 0, active: false };
		});

		for (const r of allRects) {
			const key = `${r.getAttribute('x')},${r.getAttribute('y')}`;
			if (!textPositions.has(key)) {
				const rx = parseFloat(r.getAttribute('x') || '0');
				const ry = parseFloat(r.getAttribute('y') || '0');
				nodes.push({ els: [r], homeX: rx, homeY: ry + 8, dx: 0, dy: 0, active: false });
			}
		}

		// Spatial grid for fast lookup
		const CELL = 20;
		const gridCols = Math.ceil(600 / CELL);
		const spatialGrid: CharNode[][] = Array.from({ length: gridCols * gridCols }, () => []);

		for (const n of nodes) {
			const gx = Math.floor(n.homeX / CELL);
			const gy = Math.floor(n.homeY / CELL);
			const idx = gy * gridCols + gx;
			if (idx >= 0 && idx < spatialGrid.length) spatialGrid[idx].push(n);
		}

		const activeSet = new Set<CharNode>();

		function render() {
			let mx = -1000, my = -1000;

			if (mouseX > -500 && svgEl) {
				const rect = svgEl.getBoundingClientRect();
				mx = mouseX * (600 / rect.width);
				my = mouseY * (600 / rect.height);

				// Query spatial grid cells near cursor
				const minGx = Math.max(0, Math.floor((mx - RADIUS) / CELL));
				const maxGx = Math.min(gridCols - 1, Math.floor((mx + RADIUS) / CELL));
				const minGy = Math.max(0, Math.floor((my - RADIUS) / CELL));
				const maxGy = Math.min(gridCols - 1, Math.floor((my + RADIUS) / CELL));

				for (let gy = minGy; gy <= maxGy; gy++) {
					for (let gx = minGx; gx <= maxGx; gx++) {
						for (const n of spatialGrid[gy * gridCols + gx]) {
							const dx = n.homeX - mx;
							const dy = n.homeY - my;
							const distSq = dx * dx + dy * dy;

							if (distSq < RADIUS * RADIUS && distSq > 0) {
								const dist = Math.sqrt(distSq);
								const force = (1 - dist / RADIUS) * PUSH_FORCE;
								n.dx += (dx / dist) * force;
								n.dy += (dy / dist) * force;
								activeSet.add(n);
								n.active = true;
							}
						}
					}
				}
			}

			// Update only active nodes
			for (const n of activeSet) {
				n.dx *= (1 - RETURN_SPEED);
				n.dy *= (1 - RETURN_SPEED);

				if (Math.abs(n.dx) < 0.15 && Math.abs(n.dy) < 0.15) {
					n.dx = 0;
					n.dy = 0;
					for (const el of n.els) (el as HTMLElement).style.transform = '';
					activeSet.delete(n);
					n.active = false;
				} else {
					const t = `translate(${n.dx.toFixed(1)}px,${n.dy.toFixed(1)}px)`;
					for (const el of n.els) (el as HTMLElement).style.transform = t;
				}
			}

			animId = requestAnimationFrame(render);
		}

		render();

		return () => {
			if (animId) cancelAnimationFrame(animId);
		};
	});

	function handleMouseMove(e: MouseEvent) {
		if (!containerEl) return;
		const r = containerEl.getBoundingClientRect();
		mouseX = e.clientX - r.left;
		mouseY = e.clientY - r.top;
	}

	function handleMouseLeave() {
		mouseX = -1000;
		mouseY = -1000;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={containerEl}
	class="cursor-pointer select-none w-full max-w-lg aspect-square"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
</div>
