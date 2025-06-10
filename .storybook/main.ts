import type { StorybookConfig } from '@storybook/sveltekit'
import { mergeConfig } from 'vite'
import path from 'path'

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-docs', '@storybook/addon-a11y'],
	framework: {
		name: '@storybook/sveltekit',
		options: {}
	},
	viteFinal: async (config) => {
		return mergeConfig(config, {
			resolve: {
				alias: {
					$lib: path.resolve('./src/lib'),
					$components: path.resolve('./src/lib/components'),
					$icons: path.resolve('./src/assets/icons'),
					$illos: path.resolve('./src/assets/illos'),
					$styles: path.resolve('./src/assets/styles')
				}
			},
			css: {
				preprocessorOptions: {
					scss: {
						additionalData: `
              @import './src/assets/styles/variables.scss';
              @import './src/assets/styles/fonts.scss';
              @import './src/assets/styles/themes.scss';
            `,
						api: 'modern-compiler'
					}
				}
			}
		})
	}
}

export default config
