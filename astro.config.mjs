// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { toString } from 'mdast-util-to-string';
import { existsSync, readFileSync } from 'node:fs';

// Remark plugin: count words in a post and expose "N min read" on its frontmatter.
function remarkReadingTime() {
	return function (tree, file) {
		const words = toString(tree).trim().split(/\s+/).filter(Boolean).length;
		const minutes = Math.max(1, Math.round(words / 200));
		file.data.astro.frontmatter.minutesRead = `${minutes} min read`;
	};
}

// Pages that ask not to be indexed (drafts, scheduled posts, the unlisted
// /work/ portfolio) stay out of the sitemap. Each page's robots tag is read
// once it's built; this must sit before sitemap() so it runs first.
const noindexPaths = new Set();
const collectNoindex = {
	name: 'collect-noindex',
	hooks: {
		'astro:build:done': ({ dir, pages }) => {
			for (const { pathname } of pages) {
				const file = new URL(`${pathname}index.html`, dir);
				if (!existsSync(file)) continue; // 404.html and other non-directory pages
				if (/<meta name="robots" content="noindex/.test(readFileSync(file, 'utf8'))) {
					noindexPaths.add(`/${pathname}`);
				}
			}
		},
	},
};

export default defineConfig({
	site: 'https://simon-lund.com',
	integrations: [
		mdx(),
		collectNoindex,
		sitemap({
			filter: (page) => !page.includes('/work/') && !noindexPaths.has(new URL(page).pathname),
		}),
		svelte(),
	],
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
		// Reader-selectable body fonts (FontPicker). Only downloaded when chosen.
		{
			provider: fontProviders.google(),
			name: 'Atkinson Hyperlegible',
			cssVariable: '--font-atkinson',
			fallbacks: ['system-ui', 'sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Lexend',
			cssVariable: '--font-lexend',
			fallbacks: ['system-ui', 'sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Literata',
			cssVariable: '--font-literata',
			fallbacks: ['Georgia', 'serif'],
		},
	],
});
