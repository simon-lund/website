<script lang="ts">
	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = window.location.href;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<button
	onclick={copyLink}
	class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone hover:text-ink
		bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-all duration-200 cursor-pointer"
	aria-label="Copy link to this post"
>
	{#if copied}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="20 6 9 17 4 12" />
		</svg>
		Copied!
	{:else}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
		Copy link
	{/if}
</button>
