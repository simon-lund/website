<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import AsciiPortrait from './AsciiPortrait.svelte';

	let contentEl: HTMLElement | undefined = $state();

	onMount(() => {
		if (contentEl) gsap.set(contentEl, { opacity: 0, y: 8 });

		gsap.to(contentEl, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			delay: 0.4,
			ease: 'power2.out',
		});
	});
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center max-w-5xl mx-auto">
	<div class="flex justify-center md:justify-end">
		<AsciiPortrait />
	</div>

	<div bind:this={contentEl}>
		<p
			class="text-3xl sm:text-4xl font-bold leading-snug text-ink mb-6"
			style="font-family: var(--font-heading);"
		>
			Reimagining software with intelligence at its heart.
		</p>
		<p class="text-lg text-ink-light leading-relaxed mb-4">
			Most AI products today are <a href="https://koomen.dev/essays/horseless-carriages/" target="_blank" rel="noopener noreferrer">horseless carriages</a> —
			old interfaces with AI tacked on, not reimagined around it.
		</p>
		<p class="text-lg text-ink-light leading-relaxed">
			I'm working on what comes after.
		</p>
	</div>
</div>
