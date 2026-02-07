import { type Content, Editor, type EditorOptions, type Extensions } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { ColorHighlighter } from './extensions/ColorHighlighter.js';
import SearchAndReplace from './extensions/FindAndReplace.js';
import { SmilieReplacer } from './extensions/SmilieReplacer.js';
import { FontSize } from './extensions/FontSize.js';
import { Table, TableCell, TableHeader, TableRow } from './extensions/table/index.js';
import 'katex/dist/katex.min.css';
import { Markdown } from 'tiptap-markdown';
import { InlineMathReplacer } from './extensions/InlineMathReplacer.js';
import strings from './strings.js';

export default (
	element?: HTMLElement,
	content?: Content,
	extensions?: Extensions,
	options?: Partial<EditorOptions>
) => {
	const editor = new Editor({
		element,
		content,
		extensions: [
			StarterKit.configure({
				orderedList: {
					HTMLAttributes: {
						class: 'list-decimal'
					}
				},
				bulletList: {
					HTMLAttributes: {
						class: 'list-disc'
					}
				},
				heading: {
					levels: [1, 2, 3, 4]
				},
				link: false, // Disabled in StarterKit, using separate Link extension
				codeBlock: false
			}),
			Link.configure({
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
				HTMLAttributes: {
					target: '_blank',
					rel: 'noopener noreferrer nofollow'
				}
			}),
			CharacterCount,
			Highlight.configure({
				multicolor: true
			}),
			Placeholder.configure({
				emptyEditorClass: 'is-empty',
				// Use a placeholder:
				// Use different placeholders depending on the node type:
				placeholder: ({ node }) => {
					if (node.type.name === 'heading') {
						return strings.editor.headingPlaceholder;
					}
					if (node.type.name === 'paragraph') {
						return strings.editor.paragraphPlaceholder;
					}
					return '';
				}
			}),
			Color,
			Subscript,
			Superscript,
			Typography,
			ColorHighlighter,
			TextStyle,
			FontSize,
			TextAlign.configure({
				types: ['heading', 'paragraph']
			}),
			TaskList,
			TaskItem.configure({
				nested: true
			}),
			SearchAndReplace,
			SmilieReplacer,
			AutoJoiner,
			Table,
			TableHeader,
			TableRow,
			TableCell,
			InlineMathReplacer,
			Markdown,

			...(extensions ?? [])
		],
		...options
	});

	return editor;
};
