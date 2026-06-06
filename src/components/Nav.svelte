<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import gsap from 'gsap';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		currentPath: string;
	}

	let { currentPath }: Props = $props();

	const links = [
		{ label: 'Writing', href: '/blog' },
		{ label: 'Links', href: '/links' },
		{ label: 'Now', href: '/now' },
	];

	let linkEls: HTMLElement[] = $state([]);
	let indicatorEl: HTMLDivElement | undefined = $state();
	let navContainerEl: HTMLDivElement | undefined = $state();
	let activePath = $state(currentPath);
	let navBgPath = $state(currentPath);
	let mobileOpen = $state(false);
	let scrolled = $state(false);

	// Mobile pills reuse the desktop bar's look: page-coloured background, a
	// hairline border, and a soft shadow that lifts in once you scroll.
	const INK_BORDER = 'color-mix(in srgb, var(--color-ink) 12%, transparent)';
	const LIFT_SHADOW = '0 4px 12px color-mix(in srgb, var(--color-ink) 8%, transparent)';
	let chipStyle = $derived(
		`background-color: var(--color-${navBgPath === '/' ? 'cream-dark' : 'cream'}); ` +
		`border: 0.5px solid ${scrolled ? INK_BORDER : 'transparent'}; ` +
		`box-shadow: ${scrolled ? LIFT_SHADOW : 'none'}; ` +
		`transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;`
	);

	function getActiveIndex(path: string): number {
		const idx = links.findIndex(
			(l) => path === l.href || (l.href !== '/' && path.startsWith(l.href))
		);
		return idx;
	}

	function moveIndicator(targetEl: HTMLElement | null, animate: boolean = true) {
		if (!indicatorEl || !navContainerEl) return;

		if (!targetEl) {
			if (animate) {
				gsap.to(indicatorEl, { opacity: 0, duration: 0.2 });
			} else {
				gsap.set(indicatorEl, { opacity: 0 });
			}
			return;
		}

		const containerRect = navContainerEl.getBoundingClientRect();
		const targetRect = targetEl.getBoundingClientRect();
		const x = targetRect.left - containerRect.left;
		const width = targetRect.width;

		if (!animate) {
			gsap.set(indicatorEl, { x, width, opacity: 1 });
			return;
		}

		gsap.to(indicatorEl, {
			x,
			width,
			opacity: 1,
			duration: 0.35,
			ease: 'power3.out',
		});

		gsap.to(indicatorEl, {
			scaleY: 0.85,
			duration: 0.12,
			yoyo: true,
			repeat: 1,
			ease: 'power2.inOut',
		});
	}

	function handleMouseEnter(index: number) {
		if (linkEls[index]) {
			moveIndicator(linkEls[index]);
		}
	}

	function handleMouseLeave() {
		const activeIndex = getActiveIndex(activePath);
		moveIndicator(activeIndex >= 0 ? linkEls[activeIndex] : null);
	}

	function updateScrollStyles() {
		scrolled = window.scrollY > 20;
		if (!navContainerEl) return;
		navContainerEl.style.boxShadow = scrolled ? LIFT_SHADOW : 'none';
		navContainerEl.style.borderColor = scrolled ? INK_BORDER : 'transparent';
	}

	function toggleMobile() {
		mobileOpen = !mobileOpen;
		if (mobileOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	function closeMobile() {
		mobileOpen = false;
		document.body.style.overflow = '';
	}

	onMount(() => {
		if (navContainerEl) navContainerEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';

		updateScrollStyles();

		setTimeout(() => {
			const activeIndex = getActiveIndex(activePath);
			moveIndicator(activeIndex >= 0 ? linkEls[activeIndex] : null, false);
		}, 100);

		window.addEventListener('scroll', updateScrollStyles, { passive: true });

		document.addEventListener('astro:before-preparation', (e: any) => {
			const newPath = new URL(e.to, window.location.origin).pathname;
			activePath = newPath;

			const newIndex = getActiveIndex(newPath);
			moveIndicator(newIndex >= 0 ? linkEls[newIndex] : null);

			closeMobile();
		});

		document.addEventListener('astro:after-swap', () => {
			navBgPath = window.location.pathname;
		});

		return () => {
			window.removeEventListener('scroll', updateScrollStyles);
		};
	});
</script>

<!-- Desktop nav -->
<nav class="hidden md:flex justify-center py-3">
	<div
		bind:this={navContainerEl}
		class="relative flex items-center gap-1 rounded-xl px-1.5 py-1.5"
		style="background-color: var(--color-{navBgPath === '/' ? 'cream-dark' : 'cream'}); transition: background-color 0.3s ease; border: 0.5px solid transparent;"
		role="navigation"
		onmouseleave={handleMouseLeave}
	>
		<div
			bind:this={indicatorEl}
			class="absolute top-1.5 left-0 h-[calc(100%-0.75rem)] bg-accent-light rounded-lg pointer-events-none"
			style="opacity: 0; will-change: transform;"
		></div>

		<a href="/" class="relative z-10 px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer"
			onmouseenter={() => moveIndicator(null)}
		>
			Simon Lund
		</a>

		<div class="w-px h-5 bg-stone-light/50 mx-0.5"></div>

		{#each links as link, i}
			<a
				bind:this={linkEls[i]}
				href={link.href}
				class="relative z-10 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer
					{activePath === link.href || activePath.startsWith(link.href)
						? 'text-ink'
						: 'text-stone hover:text-ink'}"
				onmouseenter={() => handleMouseEnter(i)}
			>
				{link.label}
			</a>
		{/each}

		<div class="w-px h-5 bg-stone-light/50 mx-0.5"></div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div onmouseenter={() => moveIndicator(null)}>
			<ThemeToggle />
		</div>
	</div>
</nav>

<!-- Mobile nav — frosted chips so the header reads over content; the bar sits
	above the overlay (z-60 > z-40) so the burger animates open in place. -->
<nav class="relative z-[60] flex md:hidden items-center justify-between px-4 py-3">
	<a
		href="/"
		onclick={closeMobile}
		class="text-sm font-semibold text-ink px-3 py-1.5 rounded-full cursor-pointer"
		style={chipStyle}
	>
		Simon Lund
	</a>
	<button
		onclick={toggleMobile}
		class="grid place-items-center w-10 h-10 rounded-full cursor-pointer"
		style={chipStyle}
		aria-label="Toggle menu"
		aria-expanded={mobileOpen}
	>
		<svg class="burger" class:open={mobileOpen} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
			<g class="b-top">
				<path d="M3.2 9.2C3.2 4.7 7.4 2.6 12 2.6s8.8 2.1 8.8 6.6z" fill="#dca15a" />
				<circle cx="8.6" cy="6" r=".7" fill="#fff1da" />
				<circle cx="12" cy="5" r=".7" fill="#fff1da" />
				<circle cx="15.4" cy="6" r=".7" fill="#fff1da" />
			</g>
			<rect class="b-lettuce" x="2.6" y="9.2" width="18.8" height="2.3" rx="1.15" fill="#8cae46" />
			<rect class="b-patty" x="3.6" y="11.7" width="16.8" height="2.8" rx="1.4" fill="#7a4a28" />
			<path class="b-bottom" d="M3.4 14.6H20.6c0 3.8-4.2 5.6-8.6 5.6s-8.6-1.8-8.6-5.6z" fill="#dca15a" />
		</svg>
	</button>
</nav>

<!-- Mobile overlay -->
{#if mobileOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 200 }}
		onclick={closeMobile}
		class="fixed inset-0 z-40 flex flex-col md:hidden"
		style="background-color: var(--color-{navBgPath === '/' ? 'cream-dark' : 'cream'});"
	>
		<div class="flex-1 flex flex-col items-center justify-center gap-4">
			<a
				href="/"
				onclick={closeMobile}
				class="text-2xl font-light text-ink cursor-pointer px-6 py-2 rounded-xl transition-colors duration-200
					{activePath === '/' ? 'bg-accent-light' : 'hover:bg-cream-dark'}"
				style="font-family: var(--font-heading);"
			>
				Home
			</a>
			{#each links as link}
				<a
					href={link.href}
					onclick={closeMobile}
					class="text-2xl font-light text-ink cursor-pointer px-6 py-2 rounded-xl transition-colors duration-200
						{activePath === link.href || activePath.startsWith(link.href)
							? 'bg-accent-light'
							: 'hover:bg-cream-dark'}"
					style="font-family: var(--font-heading);"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex justify-center pb-8" onclick={(e) => e.stopPropagation()}>
			<ThemeToggle />
		</div>
	</div>
{/if}

<style>
	/* The hamburger menu, but an actual burger — it opens when you tap it. */
	.burger :is(.b-top, .b-lettuce, .b-patty, .b-bottom) {
		transform-box: fill-box;
		transform-origin: center;
		transition: transform 0.4s cubic-bezier(0.34, 1.45, 0.5, 1);
	}
	.burger.open .b-top { transform: translateY(-3px) rotate(-13deg); }
	.burger.open .b-lettuce { transform: translateY(-1px); }
	.burger.open .b-patty { transform: translateY(0.5px); }
	.burger.open .b-bottom { transform: translateY(2.5px); }
	@media (prefers-reduced-motion: reduce) {
		.burger :is(.b-top, .b-lettuce, .b-patty, .b-bottom) { transition: none; }
	}
</style>
