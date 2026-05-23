<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Menu, X } from '@lucide/svelte';
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
		if (!navContainerEl) return;
		const scrolled = window.scrollY > 20;

		navContainerEl.style.boxShadow = scrolled ? '0 4px 12px color-mix(in srgb, var(--color-ink) 8%, transparent)' : 'none';
		navContainerEl.style.borderColor = scrolled ? 'color-mix(in srgb, var(--color-ink) 12%, transparent)' : 'transparent';
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

<!-- Mobile nav -->
<nav class="flex md:hidden items-center justify-between px-4 py-3">
	<a href="/" class="text-sm font-semibold text-ink cursor-pointer">
		Simon Lund
	</a>
	<button
		onclick={toggleMobile}
		class="p-2 text-ink cursor-pointer"
		aria-label="Toggle menu"
	>
		{#if mobileOpen}
			<X size={22} />
		{:else}
			<Menu size={22} />
		{/if}
	</button>
</nav>

<!-- Mobile overlay -->
{#if mobileOpen}
	<div class="fixed inset-0 z-40 flex flex-col md:hidden" style="background-color: var(--color-{navBgPath === '/' ? 'cream-dark' : 'cream'});">
		<div class="flex items-center justify-between px-4 py-3">
			<a href="/" onclick={closeMobile} class="text-sm font-semibold text-ink cursor-pointer">
				Simon Lund
			</a>
			<button
				onclick={toggleMobile}
				class="p-2 text-stone hover:text-ink transition-colors cursor-pointer"
				aria-label="Close menu"
			>
				<X size={22} />
			</button>
		</div>

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

		<div class="flex justify-center pb-8">
			<ThemeToggle />
		</div>
	</div>
{/if}
