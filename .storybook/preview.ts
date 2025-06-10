import type { Preview } from '@storybook/sveltekit'
import '../src/assets/styles/reset.css'
import '../src/assets/styles/globals.scss'

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: '^on[A-Z].*' },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/
			}
		},
		backgrounds: {
			default: 'light',
			values: [
				{ name: 'light', value: '#ffffff' },
				{ name: 'dark', value: '#333333' },
				{ name: 'admin', value: '#f5f5f5' },
				{ name: 'grey-95', value: '#f8f9fa' }
			]
		},
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: { width: '375px', height: '667px' }
				},
				tablet: {
					name: 'Tablet',
					styles: { width: '768px', height: '1024px' }
				},
				desktop: {
					name: 'Desktop',
					styles: { width: '1440px', height: '900px' }
				}
			}
		}
	}
}

export default preview
