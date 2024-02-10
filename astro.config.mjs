import markdoc from '@astrojs/markdoc';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import decapCmsOauth from 'astro-decap-cms-oauth';
import { defineConfig } from 'astro/config';
import path, { dirname } from 'path';
import remarkCodeTitles from 'remark-code-titles';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Full Astro Configuration API Documentation:
// https://docs.astro.build/reference/configuration-reference

// https://astro.build/config
export default defineConfig(
	/** @type {import('astro').AstroUserConfig} */ {
		output: 'server',
		site: 'https://blog-tarmo.vercel.app', // Your public domain, e.g.: https://my-site.dev/. Used to generate sitemaps and canonical URLs.
		server: {
			// port: 4321, // The port to run the dev server on.
		},
		markdown: {
			syntaxHighlight: 'shiki',
			shikiConfig: {
				theme: 'css-variables',
			},
			remarkPlugins: [remarkCodeTitles],
		},
		integrations: [
			mdx(),
			markdoc(),
			svelte(),
			tailwind({
				applyBaseStyles: false,
			}),
			sitemap(),
			decapCmsOauth(),
		],
		vite: {
			plugins: [],
			resolve: {
				alias: {
					$: path.resolve(__dirname, './src'),
				},
			},
			optimizeDeps: {
				allowNodeBuiltins: true,
			},
		},
		adapter: vercel(),
	}
);
