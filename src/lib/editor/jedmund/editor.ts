import { type Content, type EditorOptions, type Extensions } from '@tiptap/core'
import { Editor } from '$lib/components/edra/tiptap/index.js'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { BulletList, OrderedList, TaskItem, TaskList } from '@tiptap/extension-list'
import TextAlign from '@tiptap/extension-text-align'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import AutoJoiner from './extensions/AutoJoiner.js'
import { ColorHighlighter } from './extensions/ColorHighlighter.js'
import SearchAndReplace from './extensions/FindAndReplace.js'
import { SmilieReplacer } from './extensions/SmilieReplacer.js'
import { FontSize } from './extensions/FontSize.js'
import { Table, TableCell, TableHeader, TableRow } from './extensions/table/index.js'
import { Markdown } from '@tiptap/markdown'
import Mathematics from '@tiptap/extension-mathematics'
import { LinkColorStrip } from './extensions/LinkColorStrip.js'
import { InlineMathReplacer } from './extensions/InlineMathReplacer.js'
import strings from './strings.js'

const CompatibleBulletList = BulletList.extend({
	addAttributes() {
		return { tight: { default: null } }
	}
})

const CompatibleOrderedList = OrderedList.extend({
	addAttributes() {
		return { tight: { default: null } }
	}
})

export const getBaseEditorExtensions = (): Extensions => [
	StarterKit.configure({
		orderedList: false,
		bulletList: false,
		heading: {
			levels: [1, 2, 3, 4]
		},
		link: false,
		codeBlock: false
	}),
	CompatibleOrderedList.configure({ HTMLAttributes: { class: 'list-decimal' } }),
	CompatibleBulletList.configure({ HTMLAttributes: { class: 'list-disc' } }),
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
	Highlight.configure({ multicolor: true }),
	Placeholder.configure({
		emptyEditorClass: 'is-empty',
		placeholder: ({ node }) => {
			if (node.type.name === 'heading') return strings.editor.headingPlaceholder
			if (node.type.name === 'paragraph') return strings.editor.paragraphPlaceholder
			return ''
		}
	}),
	Color,
	Subscript,
	Superscript,
	Typography,
	ColorHighlighter,
	TextStyle,
	FontSize,
	TextAlign.configure({ types: ['heading', 'paragraph'] }),
	TaskList,
	TaskItem.configure({ nested: true }),
	SearchAndReplace,
	SmilieReplacer,
	AutoJoiner,
	Table,
	TableHeader,
	TableRow,
	TableCell,
	Markdown,
	Mathematics,
	InlineMathReplacer,
	LinkColorStrip
]

export default (
	element?: HTMLElement,
	content?: Content,
	extensions?: Extensions,
	options?: Partial<EditorOptions>
) => {
	const editor = new Editor({
		element,
		content,
		enableContentCheck: true,
		extensions: [...getBaseEditorExtensions(), ...(extensions ?? [])],
		...options
	})

	return editor
}
