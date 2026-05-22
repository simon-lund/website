<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Moon } from '@lucide/svelte';

	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');

		if (!dark && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			dark = true;
			document.documentElement.classList.add('dark');
		}

		const saved = localStorage.getItem('theme');
		if (saved === 'dark') {
			dark = true;
			document.documentElement.classList.add('dark');
		} else if (saved === 'light') {
			dark = false;
			document.documentElement.classList.remove('dark');
		}
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
</script>

<button
	onclick={toggle}
	class="p-2 text-stone hover:text-ink transition-colors duration-200 cursor-pointer"
	aria-label="Toggle dark mode"
>
	{#if dark}
		<Sun size={18} />
	{:else}
		<Moon size={18} />
	{/if}
</button>
