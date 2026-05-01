import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
	server: {
		port: 5175,
		strictPort: true,
		watch: {
			usePolling: true
		},
		fs: {
			allow: ['../../../']
		}
	},
	preview: {
		port: 5175,
		strictPort: true
	},
	plugins: [
		sveltekit(),
		svg({
			includePaths: ['./src/assets/icons/'],
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: 'preset-default',
						params: {
							overrides: {
								removeViewBox: false
							}
						}
					},
					{
						name: 'removeAttrs',
						params: {
							attrs: ['fill', 'stroke']
						}
					},
					{
						name: 'addAttributesToSVGElement',
						params: {
							attributes: [{ fill: 'currentColor' }]
						}
					}
				]
			}
		}),
		svg({
			includePaths: ['./src/assets/illos/'],
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: 'preset-default',
						params: {
							overrides: {
								removeViewBox: false
							}
						}
					}
				]
			}
		})
	],
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use 'sass:color';\n@use 'sass:math';\n@use '$styles/imports.scss' as *;`,
				api: 'modern-compiler'
			}
		},
		postcss: {
			plugins: [autoprefixer]
		}
	}
})
