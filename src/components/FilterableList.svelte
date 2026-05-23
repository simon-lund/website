<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import TagFilter from './TagFilter.svelte';

	interface Item {
		tags: string[];
	}

	interface Props {
		items: Item[];
		tags: string[];
		children: Snippet;
	}

	let { items, tags, children }: Props = $props();
	let activeTag = $state<string | null>(null);
	let containerEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		function handleFilter(e: Event) {
			activeTag = (e as CustomEvent).detail;
			if (!containerEl) return;

			const cards = containerEl.querySelectorAll('[data-tags]');
			cards.forEach((card) => {
				const el = card as HTMLElement;
				const cardTags = el.dataset.tags?.split(',') || [];
				if (activeTag === null || cardTags.includes(activeTag)) {
					el.style.display = '';
				} else {
					el.style.display = 'none';
				}
			});
		}

		document.addEventListener('filter', handleFilter);
		return () => document.removeEventListener('filter', handleFilter);
	});
</script>

<TagFilter {tags} />
<div bind:this={containerEl}>
	{@render children()}
</div>
