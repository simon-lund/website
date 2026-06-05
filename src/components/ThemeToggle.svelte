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

	function applyTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
		const icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
		if (icon) icon.href = dark ? '/favicon.svg' : '/favicon-light.svg';
	}

	function toggle(event: MouseEvent) {
		const root = document.documentElement;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const start = (document as any).startViewTransition?.bind(document);

		// No View Transitions support (or reduced motion) → switch instantly.
		if (!start || reduce) {
			applyTheme();
			return;
		}

		// Ripple origin = centre of the toggle button.
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

		// Astro gives persisted/animated elements (nav, main) their own snapshots,
		// which would cross-fade separately. Fold them into the root snapshot so the
		// whole page ripples as one wave, then restore them afterwards.
		const named = Array.from(
			document.querySelectorAll<HTMLElement>('[data-astro-transition-persist],[data-astro-transition-scope]')
		);
		named.forEach((el) => (el.style.viewTransitionName = 'none'));
		root.dataset.themeRipple = '';

		const transition = start(applyTheme);
		transition.ready.then(() => {
			root.animate(
				{
					clipPath: [
						`circle(0px at ${x}px ${y}px)`,
						`circle(${endRadius}px at ${x}px ${y}px)`,
					],
				},
				{
					duration: 520,
					easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
					pseudoElement: '::view-transition-new(root)',
				}
			);
		});
		transition.finished.finally(() => {
			delete root.dataset.themeRipple;
			named.forEach((el) => (el.style.viewTransitionName = ''));
		});
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
