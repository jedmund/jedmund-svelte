import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
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
				additionalData: `
          @import './src/assets/styles/variables.scss';
          @import './src/assets/styles/fonts.scss';
          @import './src/assets/styles/themes.scss';
          @import './src/assets/styles/globals.scss';
        `
			}
		},
		postcss: {
			plugins: [autoprefixer]
		}
	}
})
