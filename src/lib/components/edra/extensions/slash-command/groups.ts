import Minus from '@lucide/svelte/icons/minus';
import Quote from '@lucide/svelte/icons/quote';
import SquareCode from '@lucide/svelte/icons/square-code';
import type { Editor } from '@tiptap/core';
import commands from '../../commands/toolbar-commands.js';
import type { EdraToolBarCommands } from '../../commands/types.js';
import strings from '../../strings.js';

export interface Group {
	name: string;
	title: string;
	actions: EdraToolBarCommands[];
}

export const GROUPS: Group[] = [
	{
		name: 'text',
		title: strings.command.textGroup,
		actions: [
			...commands.headings,
			{
				icon: Quote,
				name: 'blockquote',
				tooltip: strings.command.blockQuote,
				syntax: '>',
				onClick: (editor: Editor) => {
					editor.chain().focus().setBlockquote().run();
				}
			},
			{
				icon: SquareCode,
				name: 'codeBlock',
				tooltip: strings.command.codeBlock,
				syntax: '```',
				onClick: (editor: Editor) => {
					editor.chain().focus().setCodeBlock().run();
				}
			},
			...commands.lists
		]
	},
	{
		name: 'media',
		title: strings.command.mediaGroup,
		actions: commands.media.filter((cmd) => cmd.name !== 'iframe-placeholder')
	},
	{
		name: 'embed',
		title: strings.command.embedGroup,
		actions: [
			...commands.media.filter((cmd) => cmd.name === 'iframe-placeholder'),
			...commands.table,
			{
				icon: Minus,
				name: 'horizontalRule',
				tooltip: strings.command.horizontalRule,
				syntax: '---',
				onClick: (editor: Editor) => {
					editor.chain().focus().setHorizontalRule().run();
				}
			}
		]
	}
];

export default GROUPS;
