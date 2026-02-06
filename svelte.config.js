import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			// Increase body size limit to 10MB for file uploads
			bodyParser: {
				sizeLimit: 10485760 // 10MB in bytes
			}
		}),

		csrf: {
			checkOrigin: true
		},

		alias: {
			$icons: 'src/assets/icons',
			$illos: 'src/assets/illos',
			$components: 'src/lib/components',
			$utils: 'src/lib/utils',
			$styles: 'src/assets/styles'
		}
	}
}

export default config
