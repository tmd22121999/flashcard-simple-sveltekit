import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),  // ← required for lang="ts"
	kit: {
		adapter: adapter(),
		paths: {
			base: process.env.NODE_ENV === 'production'
				? '/flashcard-simple-sveltekit'
				: '',
		}
	}
};