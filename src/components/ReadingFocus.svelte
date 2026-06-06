<script lang="ts">
	// Focus reading mode: dims the whole post except the current block (paragraph,
	// heading, list item, code block, image or embed) and steps through them with
	// the keyboard. Helps with tracking. Activates per blog post (.prose).
	type Line = { top: number; left: number; width: number; height: number; tight: boolean; radius: string };

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
		const els = container.querySelectorAll('p, li, h2, h3, h4, blockquote, pre, img, iframe, video');
		els.forEach((el) => {
			// Media and code blocks hug their own border exactly (no padding); text
			// blocks get a little breathing room.
			const tight = el.matches('img, iframe, video, pre');
			if (!tight) {
				// Avoid double counting: an <li>/<blockquote> already covers its <p>s,
				// and a <p> that only wraps an image is handled by the image itself.
				if (el.tagName === 'P' && (el.closest('li') || el.closest('blockquote'))) return;
				if (el.tagName === 'P' && !el.textContent?.trim() && el.querySelector('img, iframe, video')) return;
			}
			if (el.closest('pre') && el.tagName !== 'PRE') return;
			const r = el.getBoundingClientRect();
			if (r.width < 8 || r.height < 8) return;
			out.push({
				top: r.top + window.scrollY,
				left: r.left + window.scrollX,
				width: r.width,
				height: r.height,
				tight,
				radius: tight ? getComputedStyle(el).borderRadius : '7px'
			});
		});
		return out;
	}

	function position() {
		const l = lines[idx];
		if (!spotlight || !l) return;
		const pad = l.tight ? 0 : 6; // media/code hug their border exactly
		spotlight.style.borderRadius = l.radius;
		spotlight.style.top = `${l.top - pad}px`;
		spotlight.style.left = `${l.left - pad}px`;
		spotlight.style.width = `${l.width + pad * 2}px`;
		spotlight.style.height = `${l.height + pad * 2}px`;
	}

	function scrollToLine() {
		const l = lines[idx];
		if (!l) return;
		// Keep the focused block in the upper third so it scrolls into view early.
		window.scrollTo({ top: l.top - window.innerHeight * 0.3, behavior: 'smooth' });
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
		document.documentElement.classList.add('reading-focus-active'); // hides the rocket FAB
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
		document.documentElement.classList.remove('reading-focus-active');
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

	// Move the control bar to <body> so it shares the scrim's top-level stacking
	// context — otherwise an ancestor's stacking context traps it under the dim.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
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
		use:portal
		class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex w-max max-w-[calc(100vw-1.5rem)] items-center gap-1.5 whitespace-nowrap rounded-full
			border border-ink/10 bg-cream px-3 py-2 text-ink shadow-2xl ring-1 ring-black/10"
		role="toolbar"
		aria-label="Reading focus controls"
	>
		<button onclick={() => move(-1)} class="p-2 rounded-full text-ink hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Previous line">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg>
		</button>
		<span class="px-1.5 text-sm font-semibold tabular-nums whitespace-nowrap shrink-0 select-none">{idx + 1} / {count}</span>
		<button onclick={() => move(1)} class="p-2 rounded-full text-ink hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Next line">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
		</button>
		<span class="mx-1 h-5 w-px bg-ink/15"></span>
		<span class="px-1 text-xs text-ink-light font-medium select-none hidden sm:inline">↑ ↓ · Space · Esc</span>
		<button onclick={stop} class="p-2 rounded-full text-ink hover:text-accent hover:bg-cream-dark transition-colors cursor-pointer" aria-label="Exit focus mode">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
		</button>
	</div>
{/if}
