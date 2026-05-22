// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

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
