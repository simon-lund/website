<script lang="ts">
	// Lets the reader pick the body font for posts. Persists in localStorage and
	// is re-applied early by the inline script in BaseHead (so no flash on load).
	type Font = { key: string; label: string; note: string; css: string };

	const FONTS: Font[] = [
		{ key: 'default', label: 'Inter', note: 'the default', css: 'var(--font-body)' },
		{ key: 'atkinson', label: 'Atkinson Hyperlegible', note: 'max legibility', css: 'var(--font-atkinson)' },
		{ key: 'lexend', label: 'Lexend', note: 'reading fluency', css: 'var(--font-lexend)' },
		{ key: 'serif', label: 'Literata', note: 'a serif for reading', css: 'var(--font-literata)' },
	];

	let open = $state(false);
	let current = $state('default');
	let rootEl: HTMLDivElement | undefined = $state();

	function apply(key: string) {
		current = key;
		const root = document.documentElement;
		if (key === 'default') {
			root.removeAttribute('data-reading-font');
			localStorage.removeItem('reading-font');
		} else {
			root.setAttribute('data-reading-font', key);
			localStorage.setItem('reading-font', key);
		}
		open = false;
	}

	$effect(() => {
		current = localStorage.getItem('reading-font') || 'default';
		const onDoc = (e: MouseEvent) => {
			if (open && rootEl && !rootEl.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('click', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative" bind:this={rootEl}>
	<button
		onclick={(e) => { e.stopPropagation(); open = !open; }}
		class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone hover:text-ink
			bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-all duration-200 cursor-pointer"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Reading font"
	>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 7V5h16v2" /><path d="M9 19h6" /><path d="M12 5v14" />
		</svg>
		Font
	</button>

	{#if open}
		<div
			class="absolute right-0 mt-2 z-50 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-ink/10 bg-cream p-1 shadow-2xl ring-1 ring-black/5"
			role="listbox"
			aria-label="Reading font"
		>
			{#each FONTS as f}
				<button
					onclick={() => apply(f.key)}
					class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-cream-dark transition-colors cursor-pointer"
					style={`font-family: ${f.css}`}
					role="option"
					aria-selected={current === f.key}
				>
					<span class="min-w-0">
						<span class="block text-sm text-ink truncate">{f.label}</span>
						<span class="block text-xs text-stone">{f.note}</span>
					</span>
					{#if current === f.key}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-accent shrink-0">
							<path d="M20 6 9 17l-5-5" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
