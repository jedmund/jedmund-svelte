import { isMac } from '../utils.js'
import type { EdraCommandGroup } from './types.js'

export const commands: Record<string, EdraCommandGroup> = {
	'undo-redo': {
		name: 'redo undo',
		label: 'Redo/Undo',
		commands: [
			{
				iconName: 'Undo',
				name: 'undo',
				label: 'Undo',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Z`],
				action: (editor) => {
					editor.chain().focus().undo().run()
				}
			},
			{
				iconName: 'Redo',
				name: 'redo',
				label: 'Redo',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Y`, `${isMac ? 'Cmd' : 'Ctrl'}+Shift+Z`],
				action: (editor) => {
					editor.chain().focus().redo().run()
				}
			}
		]
	},
	headings: {
		name: 'Headings',
		label: 'Headings',
		commands: [
			{
				iconName: 'Heading1',
				name: 'heading1',
				label: 'Heading 1',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Alt+1`],
				action: (editor) => {
					editor.chain().focus().toggleHeading({ level: 1 }).run()
				},
				isActive: (editor) => editor.isActive('heading', { level: 1 })
			},
			{
				iconName: 'Heading2',
				name: 'heading2',
				label: 'Heading 2',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Alt+2`],
				action: (editor) => {
					editor.chain().focus().toggleHeading({ level: 2 }).run()
				},
				isActive: (editor) => editor.isActive('heading', { level: 2 })
			},
			{
				iconName: 'Heading3',
				name: 'heading3',
				label: 'Heading 3',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Alt+3`],
				action: (editor) => {
					editor.chain().focus().toggleHeading({ level: 3 }).run()
				},
				isActive: (editor) => editor.isActive('heading', { level: 3 })
			}
		]
	},
	'text-formatting': {
		name: 'Text Formatting',
		label: 'Text Formatting',
		commands: [
			{
				iconName: 'Link',
				name: 'link',
				label: 'Link',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+K`],
				action: (editor) => {
					const href = prompt('Enter the URL of the link:')
					if (href !== null) editor.chain().focus().setLink({ href, target: '_blank' }).run()
				}
			},
			{
				iconName: 'Bold',
				name: 'bold',
				label: 'Bold',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+B`],
				action: (editor) => {
					editor.chain().focus().toggleBold().run()
				}
			},
			{
				iconName: 'Italic',
				name: 'italic',
				label: 'Italic',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+I`],
				action: (editor) => {
					editor.chain().focus().toggleItalic().run()
				}
			},
			{
				iconName: 'Underline',
				name: 'underline',
				label: 'Underline',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+U`],
				action: (editor) => {
					editor.chain().focus().toggleUnderline().run()
				}
			},
			{
				iconName: 'Strikethrough',
				name: 'strike',
				label: 'Strikethrough',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+S`],
				action: (editor) => {
					editor.chain().focus().toggleStrike().run()
				}
			},
			{
				iconName: 'Quote',
				name: 'blockquote',
				label: 'Blockquote',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+B`],
				action: (editor) => {
					editor.chain().focus().toggleBlockquote().run()
				}
			},
			{
				iconName: 'Superscript',
				name: 'superscript',
				label: 'Superscript',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Period`],
				action: (editor) => {
					editor.chain().focus().toggleSuperscript().run()
				}
			},
			{
				iconName: 'Subscript',
				name: 'subscript',
				label: 'Subscript',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Comma`],
				action: (editor) => {
					editor.chain().focus().toggleSubscript().run()
				}
			},
			{
				iconName: 'Code',
				name: 'code',
				label: 'Code',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+E`],
				action: (editor) => {
					editor.chain().focus().toggleCode().run()
				}
			},
			{
				iconName: 'Braces',
				name: 'codeBlock',
				label: 'Code Block',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Alt+C`],
				action: (editor) => {
					editor.chain().focus().toggleCodeBlock().run()
				}
			}
		]
	},
	lists: {
		name: 'Lists',
		label: 'Lists',
		commands: [
			{
				iconName: 'List',
				name: 'bulletList',
				label: 'Bullet List',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+8`],
				action: (editor) => {
					editor.chain().focus().toggleBulletList().run()
				}
			},
			{
				iconName: 'ListOrdered',
				name: 'orderedList',
				label: 'Ordered List',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+7`],
				action: (editor) => {
					editor.chain().focus().toggleOrderedList().run()
				}
			},
			{
				iconName: 'ListChecks',
				name: 'taskList',
				label: 'Task List',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+9`],
				action: (editor) => {
					editor.chain().focus().toggleTaskList().run()
				}
			}
		]
	},
	media: {
		name: 'Media',
		label: 'Media',
		commands: [
			{
				iconName: 'AudioLines',
				name: 'audio-placeholder',
				label: 'Audio',
				action: (editor) => {
					editor.chain().focus().insertAudioPlaceholder().run()
				}
			},
			{
				iconName: 'Image',
				name: 'image-placeholder',
				label: 'Image',
				action: (editor) => {
					// Set flag to auto-open modal and insert placeholder
					editor.storage.imageModal = { autoOpen: true }
					editor.chain().focus().insertImagePlaceholder().run()
				}
			},
			{
				iconName: 'Images',
				name: 'gallery-placeholder',
				label: 'Gallery',
				action: (editor) => {
					editor.chain().focus().insertGalleryPlaceholder().run()
				}
			},
			{
				iconName: 'Video',
				name: 'video-placeholder',
				label: 'Video',
				action: (editor) => {
					editor.chain().focus().insertVideoPlaceholder().run()
				}
			},
			{
				iconName: 'CodeXml',
				name: 'iframe-placeholder',
				label: 'IFrame',
				action: (editor) => {
					editor.chain().focus().insertIFramePlaceholder().run()
				}
			},
			{
				iconName: 'MapPin',
				name: 'geolocation-placeholder',
				label: 'Location',
				action: (editor) => {
					editor.chain().focus().insertGeolocationPlaceholder().run()
				}
			}
		]
	},
	colors: {
		name: 'Colors',
		label: 'Highlight',
		commands: [
			{
				iconName: 'Highlighter',
				name: 'highlight',
				label: 'Highlight',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+H`],
				action: (editor) => {
					editor.chain().focus().toggleHighlight().run()
				},
				isActive: (editor) => editor.isActive('highlight')
			}
		]
	},
	table: {
		name: 'Table',
		label: 'Table',
		commands: [
			{
				iconName: 'Table',
				name: 'table',
				label: 'Table',
				shortCuts: [`${isMac ? 'Cmd' : 'Ctrl'}+Shift+T`],
				action: (editor) => {
					if (editor.isActive('table')) editor.chain().focus().deleteTable().run()
					else editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()
				}
			}
		]
	}
}
