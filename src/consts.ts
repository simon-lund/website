export const SITE_TITLE = 'Simon Lund';
export const SITE_DESCRIPTION =
	'Making AI productive and secure. Building tools that augment human capability.';

export const NAV_LINKS = [
	{ label: 'Home', href: '/' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Now', href: '/now' },
] as const;

export const SOCIAL_LINKS = {
	bluesky: import.meta.env.PUBLIC_BLUESKY_URL ?? 'https://bsky.app',
	github: import.meta.env.PUBLIC_GITHUB_URL ?? 'https://github.com',
} as const;
