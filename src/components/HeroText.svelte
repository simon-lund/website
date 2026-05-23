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
		Most AI products today are <a href="https://koomen.dev/essays/horseless-carriages/" target="_blank" rel="noopener noreferrer">horseless carriages</a>.
		Old interfaces with AI tacked on, not reimagined around it.
	</p>
	<p class="text-lg text-ink-light leading-relaxed">
		I'm working on what comes after.
	</p>
{/snippet}

<div class="relative max-w-5xl mx-auto">
	<!-- Mobile: text only -->
	<div class="md:hidden px-2">
		{@render heroText()}
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
