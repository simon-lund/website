<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Rocket } from '@lucide/svelte';

	let fabEl: HTMLButtonElement | undefined = $state();
	let isVisible = false;
	let launching = false;
	let justLaunched = false;
	let rafId = 0;

	onMount(() => {
		if (fabEl) gsap.set(fabEl, { scale: 0, opacity: 0 });

		function handleScroll() {
			if (launching) return;
			// After a launch, stay hidden until the page is actually back near the top.
			if (justLaunched) {
				if (window.scrollY <= 300) justLaunched = false;
				return;
			}
			const shouldShow = window.scrollY > 300;
			if (shouldShow === isVisible) return;

			isVisible = shouldShow;
			if (!fabEl) return;

			gsap.to(fabEl, shouldShow
				? { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }
				: { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in' });
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => { window.removeEventListener('scroll', handleScroll); cancelAnimationFrame(rafId); };
	});

	function scrollToTop() {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!fabEl || launching || reduce) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}

		launching = true;
		const vh = window.innerHeight;
		const flame = fabEl.querySelector('.flame');
		fabEl.classList.add('launching'); // CSS fades the orange disc + shadow away

		// 1) ignite + lift off to ~30% from the top, then hover there
		let riseDone = false;
		const tl = gsap.timeline();
		tl.to(flame, { scaleY: 1, opacity: 1, duration: 0.18, ease: 'power1.out' }, 0);
		tl.to(fabEl, { y: -(vh * 0.68), duration: 0.8, ease: 'power2.out', onComplete: () => (riseDone = true) }, 0.05);
		tl.to(flame, { scaleY: 1.3, duration: 0.28, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0.6); // flicker while hovering

		// 2) scroll the page to the top
		window.scrollTo({ top: 0, behavior: 'smooth' });

		// 3) once risen AND the page has reached the top, blast out beyond the window
		let frames = 0;
		const watch = () => {
			frames++;
			if ((riseDone && window.scrollY <= 4) || frames > 240) {
				gsap.killTweensOf(flame);
				const out = gsap.timeline({ onComplete: reset });
				out.to(flame, { scaleY: 2.6, opacity: 1, duration: 0.16, ease: 'power1.in' }, 0);
				out.to(fabEl, { y: -(vh + 160), duration: 0.5, ease: 'power2.in' }, 0);
				out.to(fabEl, { opacity: 0, duration: 0.28, ease: 'power1.in' }, 0.22);
			} else {
				rafId = requestAnimationFrame(watch);
			}
		};

		function reset() {
			if (!fabEl) return;
			fabEl.classList.remove('launching');
			gsap.set(fabEl, { y: 0, scale: 0, opacity: 0 });
			gsap.set(flame, { scaleY: 0, opacity: 0 });
			isVisible = false;
			launching = false;
			justLaunched = true;
		}

		rafId = requestAnimationFrame(watch);
	}
</script>

<button
	bind:this={fabEl}
	onclick={scrollToTop}
	class="rocket-fab fixed bottom-6 right-6 lg:right-auto lg:left-[calc(50%_+_22rem)] z-40 w-12 h-12 rounded-full
		bg-accent text-white shadow-lg hover:bg-accent-hover
		flex items-center justify-center cursor-pointer will-change-transform"
	aria-label="Scroll to top"
	style="transform-origin: center center;"
>
	<span class="rocket-bob">
		<Rocket size={20} class="rotate-[-45deg]" />
		<span class="flame" aria-hidden="true"></span>
	</span>
</button>

<style>
	.rocket-fab {
		transition: background-color 0.25s ease, box-shadow 0.3s ease;
	}
	/* On launch the orange disc + shadow melt away, leaving just the rocket.
	   :global so Svelte doesn't prune it — `launching` is added at runtime. */
	.rocket-fab:global(.launching) {
		background-color: transparent !important;
		box-shadow: none !important;
	}

	/* Idle: a gentle hover-bob; revs faster on hover, like it's spooling up. */
	.rocket-bob {
		position: relative;
		display: inline-flex;
		animation: rocket-bob 2.2s ease-in-out infinite;
	}
	.rocket-fab:hover .rocket-bob {
		animation-duration: 0.6s;
	}
	@keyframes rocket-bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-3px); }
	}

	/* Exhaust flame — hidden until launch, grows out of the rocket's tail. */
	.flame {
		position: absolute;
		top: 68%;
		left: 50%;
		margin-left: -4px;
		width: 8px;
		height: 15px;
		transform: scaleY(0);
		transform-origin: top center;
		opacity: 0;
		pointer-events: none;
		border-radius: 45% 45% 50% 50% / 25% 25% 100% 100%;
		background: linear-gradient(to bottom, #ffe39a, #ff9a3d 55%, rgba(255, 120, 50, 0));
		filter: blur(0.3px);
	}

	@media (prefers-reduced-motion: reduce) {
		.rocket-bob { animation: none; }
	}
</style>
