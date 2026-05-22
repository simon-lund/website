<script lang="ts">
	import { onMount } from 'svelte';

	let opacity = $state(1);

	onMount(() => {
		function handleScroll() {
			opacity = Math.max(0, 1 - window.scrollY / 150);
		}
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

{#if opacity > 0}
	<div
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center text-stone-light pointer-events-none"
		style="opacity: {opacity};"
	>
		<svg width="22" height="32" viewBox="0 0 22 32" fill="none" stroke="currentColor" stroke-width="1.5">
			<rect x="1" y="1" width="20" height="30" rx="10" />
			<circle cx="11" cy="9" r="2" fill="currentColor" class="scroll-dot" />
		</svg>
	</div>
{/if}

<style>
	.scroll-dot {
		animation: scroll-down 1.5s ease-in-out infinite;
	}

	@keyframes scroll-down {
		0% { cy: 9; opacity: 1; }
		50% { cy: 21; opacity: 0.3; }
		100% { cy: 9; opacity: 1; }
	}
</style>
