<script lang="ts">
	import AsciiPortrait from './AsciiPortrait.svelte';
</script>

{#snippet heroText()}
	<h1
		class="text-3xl sm:text-4xl font-bold leading-snug text-ink mb-4"
		style="font-family: var(--font-heading);"
	>
		<a
			href="https://www.youtube.com/watch?v=rEq1Z0bjdwc"
			target="_blank"
			rel="noopener noreferrer"
			style="color: inherit;"
		>Hello there</a>
	</h1>
	<p class="text-lg text-ink-light leading-relaxed mb-4">
		I'm a software engineer with many hats 🧙: UX, design, backend, devops. Working across all of them is what taught me to appreciate <a href="https://boringtechnology.club/" target="_blank" rel="noopener noreferrer">boring technology</a>.
	</p>
	<p class="text-lg text-ink-light leading-relaxed">
		I write about software, design, and the occasional idea I can't let go of.
	</p>
{/snippet}

<div class="relative max-w-5xl mx-auto">
	<!-- Stacked (image → text) on mobile, two columns on desktop -->
	<div class="flex flex-col gap-10 md:grid md:grid-cols-2 md:gap-16 md:items-center">
		<div class="mx-auto w-60 sm:w-72 md:mx-0 md:w-auto md:flex md:justify-end">
			<AsciiPortrait />
		</div>
		<div class="px-2 md:px-0">
			{@render heroText()}
		</div>
	</div>
</div>
