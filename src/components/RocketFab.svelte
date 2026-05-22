<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Rocket } from '@lucide/svelte';

	let fabEl: HTMLButtonElement | undefined = $state();
	let isVisible = false;

	onMount(() => {
		if (fabEl) {
			gsap.set(fabEl, { scale: 0, opacity: 0 });
		}

		function handleScroll() {
			const shouldShow = window.scrollY > 300;
			if (shouldShow === isVisible) return;

			isVisible = shouldShow;
			if (!fabEl) return;

			if (shouldShow) {
				gsap.to(fabEl, {
					scale: 1,
					opacity: 1,
					duration: 0.5,
					ease: 'back.out(2)',
				});
			} else {
				gsap.to(fabEl, {
					scale: 0,
					opacity: 0,
					duration: 0.25,
					ease: 'power2.in',
				});
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<button
	bind:this={fabEl}
	onclick={scrollToTop}
	class="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full
		bg-accent text-white shadow-lg hover:bg-accent-hover
		flex items-center justify-center transition-colors duration-200
		cursor-pointer will-change-transform"
	aria-label="Scroll to top"
	style="transform-origin: center center;"
>
	<Rocket size={20} class="rotate-[-45deg]" />
</button>
