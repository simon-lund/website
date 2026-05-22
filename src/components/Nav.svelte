<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		currentPath: string;
	}

	let { currentPath }: Props = $props();

	const links = [
		{ label: 'Home', href: '/' },
		{ label: 'Writing', href: '/blog' },
		{ label: 'Links', href: '/links' },
		{ label: 'Now', href: '/now' },
	];

	let linkEls: HTMLElement[] = [];
	let indicatorEl: HTMLDivElement | undefined = $state();
	let navContainerEl: HTMLDivElement | undefined = $state();
	let navEl: HTMLElement | undefined = $state();
	let activePath = $state(currentPath);

	function getActiveIndex(path: string): number {
		if (path === '/') return 0;
		const idx = links.findIndex(
			(l) => l.href !== '/' && path.startsWith(l.href)
		);
		return idx >= 0 ? idx : 0;
	}

	function moveIndicator(targetEl: HTMLElement, animate: boolean = true) {
		if (!indicatorEl || !navContainerEl) return;

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
		if (linkEls[activeIndex]) {
			moveIndicator(linkEls[activeIndex]);
		}
	}

	function updateScrollStyles() {
		if (!navContainerEl) return;
		const scrolled = window.scrollY > 20;

		navContainerEl.style.boxShadow = scrolled ? '0 4px 12px color-mix(in srgb, var(--color-ink) 8%, transparent)' : 'none';
		navContainerEl.style.borderColor = scrolled ? 'color-mix(in srgb, var(--color-ink) 12%, transparent)' : 'transparent';
	}

	onMount(() => {
		// Set transition styles
		if (navContainerEl) navContainerEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';

		updateScrollStyles();

		// Init indicator after fonts and layout are ready
		setTimeout(() => {
			const activeIndex = getActiveIndex(activePath);
			if (linkEls[activeIndex]) {
				moveIndicator(linkEls[activeIndex], false);
			}
		}, 100);

		window.addEventListener('scroll', updateScrollStyles, { passive: true });

		document.addEventListener('astro:before-preparation', (e: any) => {
			const newPath = new URL(e.to, window.location.origin).pathname;
			const newIndex = getActiveIndex(newPath);

			activePath = newPath;

			if (linkEls[newIndex]) {
				moveIndicator(linkEls[newIndex]);
			}
		});

		return () => {
			window.removeEventListener('scroll', updateScrollStyles);
		};
	});
</script>

<nav
	bind:this={navEl}
	class="flex justify-center py-3"
>
	<div
		bind:this={navContainerEl}
		class="relative flex items-center gap-1 bg-cream rounded-xl px-1.5 py-1.5"
		style="border: 0.5px solid transparent;"
		role="navigation"
		onmouseleave={handleMouseLeave}
	>
		<!-- Indicator pill -->
		<div
			bind:this={indicatorEl}
			class="absolute top-1.5 left-0 h-[calc(100%-0.75rem)] bg-accent-light rounded-lg pointer-events-none"
			style="opacity: 0; will-change: transform;"
		></div>

		<!-- Site title -->
		<a href="/" class="relative z-10 px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer">
			Simon Lund
		</a>

		<div class="w-px h-5 bg-stone-light/50 mx-0.5"></div>

		<!-- Nav links -->
		{#each links as link, i}
			<a
				bind:this={linkEls[i]}
				href={link.href}
				class="relative z-10 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer
					{activePath === link.href || (link.href !== '/' && activePath.startsWith(link.href))
						? 'text-ink'
						: 'text-stone hover:text-ink'}"
				onmouseenter={() => handleMouseEnter(i)}
			>
				{link.label}
			</a>
		{/each}

		<div class="w-px h-5 bg-stone-light/50 mx-0.5"></div>

		<ThemeToggle />
	</div>
</nav>
