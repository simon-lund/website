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
