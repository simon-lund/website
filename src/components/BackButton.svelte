<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';

	function goBack() {
		const referrer = document.referrer;
		if (referrer && new URL(referrer).origin === window.location.origin) {
			window.history.back();
		} else {
			window.location.href = '/blog';
		}
	}
</script>

<button
	onclick={goBack}
	class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone hover:text-ink
		bg-cream-dark/50 hover:bg-cream-dark rounded-full transition-all duration-200 cursor-pointer"
	aria-label="Go back"
>
	<ArrowLeft size={14} />
	Back
</button>
