import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),  // ← required for lang="ts"
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html'
		}),
		paths: {
			base: process.env.NODE_ENV === 'production'
				? '/flashcard-simple-sveltekit'
				: '',
		}
	}
};