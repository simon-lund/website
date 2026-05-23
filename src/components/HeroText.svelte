<script lang="ts">
	import AsciiPortrait from './AsciiPortrait.svelte';
</script>

{#snippet heroText()}
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
{/snippet}

<div class="relative max-w-5xl mx-auto">
	<!-- Mobile: portrait as watermark background, text on top -->
	<div class="md:hidden relative">
		<div class="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none overflow-hidden">
			<AsciiPortrait />
		</div>
		<div class="relative z-10 px-2">
			{@render heroText()}
		</div>
	</div>

	<!-- Desktop: two-column layout -->
	<div class="hidden md:grid md:grid-cols-2 gap-16 items-center">
		<div class="flex justify-end">
			<AsciiPortrait />
		</div>
		<div>
			{@render heroText()}
		</div>
	</div>
</div>
