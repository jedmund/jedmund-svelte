// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import ts from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			// Disable @html warnings - all uses are for trusted content (static SVGs, sanitized content, JSON-LD)
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		// Edra is a pinned upstream snapshot; application-owned editor code stays linted.
		ignores: [
			'.pnpm-store/',
			'build/',
			'.svelte-kit/',
			'dist/',
			'storybook-static/',
			'artifacts/',
			'src/lib/components/edra/'
		]
	},
	...storybook.configs['flat/recommended']
]
