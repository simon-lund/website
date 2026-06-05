<script lang="ts">
	import AsciiPortrait from './AsciiPortrait.svelte';
</script>

{#snippet heroText()}
	<h1
		class="text-3xl sm:text-4xl font-bold leading-snug text-ink mb-4"
		style="font-family: var(--font-heading);"
	>
		Hi there
	</h1>
	<p class="text-lg text-ink-light leading-relaxed mb-4">
		I'm a software engineer with many hats 🧙: UX, design, backend, devops. This sometimes makes it hard to stay true to the <a href="https://boringtechnology.club/" target="_blank" rel="noopener noreferrer">boring technology</a> principle.
	</p>
	<p class="text-lg text-stone">
		I write about where AI should live, what makes it useful, and what makes it trustworthy.
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
