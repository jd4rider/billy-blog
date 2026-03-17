// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://jd4rider.github.io',
	base: '/billy-blog',
	integrations: [mdx(), sitemap()],
});
