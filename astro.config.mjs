// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { toString } from 'mdast-util-to-string';

// Remark plugin: count words in a post and expose "N min read" on its frontmatter.
function remarkReadingTime() {
	return function (tree, file) {
		const words = toString(tree).trim().split(/\s+/).filter(Boolean).length;
		const minutes = Math.max(1, Math.round(words / 200));
		file.data.astro.frontmatter.minutesRead = `${minutes} min read`;
	};
}

export default defineConfig({
	site: 'https://simon-lund.de',
	integrations: [mdx(), sitemap(), svelte()],
	vite: {
		plugins: [tailwindcss()],
	},
	markdown: {
		shikiConfig: {
			theme: 'vitesse-dark',
		},
		remarkPlugins: [remarkReadingTime],
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Libre Baskerville',
			cssVariable: '--font-heading',
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Inter',
			cssVariable: '--font-body',
			fallbacks: ['system-ui', 'sans-serif'],
		},
	],
});
