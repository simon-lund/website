import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const links = defineCollection({
	loader: glob({ base: './src/content/links', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		url: z.string().url(),
		comment: z.string(),
		pubDate: z.coerce.date(),
		tags: z.array(z.string()).optional(),
	}),
});

export const collections = { blog, links };
