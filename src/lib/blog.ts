export function hashSlug(slug: string): string {
	let hash = 5381;
	for (const char of slug) {
		hash = ((hash << 5) + hash) + char.charCodeAt(0);
	}
	return Math.abs(hash).toString(36).slice(0, 7);
}

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function getBlogUrl(postSlug: string, title: string): string {
	return `/blog/${hashSlug(postSlug)}/${slugify(title)}`;
}

/** Where a post stands. A draft never goes out; otherwise its date decides. */
export type PostStatus = 'draft' | 'scheduled' | 'published';

/**
 * Judged at build time, so a scheduled post goes live with the first deploy
 * on or after its `pubDate` (the deploy workflow rebuilds daily for this).
 */
export function postStatus(
	{ draft, pubDate }: { draft: boolean; pubDate: Date },
	now: Date = new Date()
): PostStatus {
	// A draft flag wins over any date
	if (draft) return 'draft';
	// Not draft, but its day hasn't come
	if (pubDate > now) return 'scheduled';
	return 'published';
}
