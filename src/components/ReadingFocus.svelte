<script lang="ts">
	// Line-focus reading mode: dims the whole post except the current line and
	// steps through it one line at a time with the keyboard. Helps with line
	// tracking — no more jumping between lines. Activates per blog post (.prose).
	type Line = { top: number; left: number; width: number; height: number };

	let active = $state(false);
	let idx = $state(0);
	let count = $state(0);
	let lines: Line[] = [];
	let spotlight: HTMLDivElement | null = null;
	let resizeRaf = 0;

	function collectLines(): Line[] {
		const container = document.querySelector('.prose');
		if (!container) return [];
		const out: Line[] = [];
		const blocks = container.querySelectorAll('p, li, h2, h3, h4, blockquote');
		blocks.forEach((el) => {
			if (el.closest('pre')) return;
			const range = document.createRange();
			range.selectNodeContents(el);
			const rects = Array.from(range.getClientRects()).filter((r) => r.width > 2 && r.height > 6);
			// Merge fragments that sit on the same visual line into one rect.
			const rows: { top: number; bottom: number; left: number; right: number }[] = [];
			for (const r of rects) {
				const row = rows.find((R) => Math.abs(R.top - r.top) < r.height * 0.6);
				if (row) {
					row.left = Math.min(row.left, r.left);
					row.right = Math.max(row.right, r.right);
					row.top = Math.min(row.top, r.top);
					row.bottom = Math.max(row.bottom, r.bottom);
				} else {
					rows.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
				}
			}
			for (const row of rows) {
				out.push({
					top: row.top + window.scrollY,
					left: row.left + window.scrollX,
					width: row.right - row.left,
					height: row.bottom - row.top
				});
			}
		});
		return out;
	}

	function position() {
		const l = lines[idx];
		if (!spotlight || !l) return;
		const px = 8, py = 5;
		spotlight.style.top = `${l.top - py}px`;
		spotlight.style.left = `${l.left - px}px`;
		spotlight.style.width = `${l.width + px * 2}px`;
		spotlight.style.height = `${l.height + py * 2}px`;
	}

	function scrollToLine() {
		const l = lines[idx];
		if (!l) return;
		window.scrollTo({ top: l.top - window.innerHeight / 2 + l.height / 2, behavior: 'smooth' });
	}

	function move(d: number) {
		idx = Math.max(0, Math.min(lines.length - 1, idx + d));
		position();
		scrollToLine();
	}

	function start() {
		const article = document.querySelector('.prose');
		if (!article) return;
		article.classList.add('reading-focus');
		active = true;
		// Wait a frame so the looser line spacing applies before we measure.
		requestAnimationFrame(() => {
			lines = collectLines();
			count = lines.length;
			if (!count) { stop(); return; }
			const startY = window.scrollY + 120;
			const i = lines.findIndex((l) => l.top + l.height >= startY);
			idx = i === -1 ? lines.length - 1 : i;
			spotlight = document.createElement('div');
			spotlight.className = 'reading-spotlight';
			document.body.appendChild(spotlight);
			position();
			scrollToLine();
		});
	}

	function stop() {
		active = false;
		document.querySelector('.prose')?.classList.remove('reading-focus');
		spotlight?.remove();
		spotlight = null;
	}

	function onKey(e: KeyboardEvent) {
		if (!active) return;
		if (e.key === 'ArrowDown' || e.key === 'j' || e.key === ' ') { e.preventDefault(); move(1); }
		else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); move(-1); }
		else if (e.key === 'Escape') { e.preventDefault(); stop(); }
	}

	function onResize() {
		if (!active) return;
		cancelAnimationFrame(resizeRaf);
		resizeRaf = requestAnimationFrame(() => {
			lines = collectLines();
			count = lines.length;
			idx = Math.min(idx, lines.length - 1);
			position();
		});
	}

	$effect(() => {
		window.addEventListener('keydown', onKey);
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onResize);
			stop();
		};
	});
</script>

<button
	onclick={start}
	class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone hover:text-ink
		bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-all duration-200 cursor-pointer"
	aria-label="Focus reading mode — read one line at a time"
	title="Read one line at a time (↑ ↓ to move, Esc to exit)"
>
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M3 7V5a2 2 0 0 1 2-2h2" />
		<path d="M17 3h2a2 2 0 0 1 2 2v2" />
		<path d="M21 17v2a2 2 0 0 1-2 2h-2" />
		<path d="M7 21H5a2 2 0 0 1-2-2v-2" />
		<path d="M7 12h10" />
	</svg>
	Focus
</button>

{#if active}
	<div
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 rounded-full
			border border-stone-light/30 bg-cream/95 backdrop-blur px-2 py-1.5 shadow-lg text-stone"
		role="toolbar"
		aria-label="Reading focus controls"
	>
		<button onclick={() => move(-1)} class="p-1.5 rounded-full hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Previous line">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg>
		</button>
		<span class="px-1.5 text-xs tabular-nums select-none">{idx + 1} / {count}</span>
		<button onclick={() => move(1)} class="p-1.5 rounded-full hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Next line">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
		</button>
		<span class="mx-1 h-4 w-px bg-stone-light/40"></span>
		<span class="px-1 text-xs select-none hidden sm:inline">↑ ↓ · Space</span>
		<button onclick={stop} class="p-1.5 rounded-full hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Exit focus mode">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
		</button>
	</div>
{/if}
