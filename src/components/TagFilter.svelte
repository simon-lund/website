<script lang="ts">
	interface Props {
		tags: string[];
	}

	let { tags }: Props = $props();

	let active = $state<string | null>(null);

	function toggle(tag: string) {
		active = active === tag ? null : tag;
		const event = new CustomEvent('filter', { detail: active });
		document.dispatchEvent(event);
	}
</script>

<div class="flex flex-wrap gap-2 mb-8">
	<button
		onclick={() => { active = null; document.dispatchEvent(new CustomEvent('filter', { detail: null })); }}
		class="px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors duration-150
			{active === null ? 'bg-ink text-cream' : 'bg-cream-dark text-stone hover:text-ink'}"
	>
		All
	</button>
	{#each tags as tag}
		<button
			onclick={() => toggle(tag)}
			class="px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors duration-150
				{active === tag ? 'bg-ink text-cream' : 'bg-cream-dark text-stone hover:text-ink'}"
		>
			{tag}
		</button>
	{/each}
</div>
