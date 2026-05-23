export const SITE_TITLE = 'Simon Lund';
export const SITE_DESCRIPTION =
	'Reimagining software with intelligence at its heart.';

export const SOCIAL_LINKS = {
	bluesky: import.meta.env.PUBLIC_BLUESKY_URL ?? 'https://bsky.app',
	github: import.meta.env.PUBLIC_GITHUB_URL ?? 'https://github.com',
	linkedin: import.meta.env.PUBLIC_LINKEDIN_URL ?? 'https://linkedin.com',
	email: import.meta.env.PUBLIC_EMAIL ?? 'mail@example.com',
} as const;
