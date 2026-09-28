import type { Editor, JSONContent } from '@tiptap/core'

/** Find the upload's own node after intervening edits; never undo unrelated user work. */
export function replaceUploadPlaceholder(
	editor: Editor,
	source: string,
	replacement?: JSONContent
) {
	if (editor.isDestroyed) return false
	let position: number | undefined
	let size = 0
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name === 'image' && node.attrs.src === source) {
			position = pos
			size = node.nodeSize
			return false
		}
	})
	if (position === undefined) return false
	const range = { from: position, to: position + size }
	return replacement
		? editor.commands.insertContentAt(range, replacement, { updateSelection: false })
		: editor.commands.deleteRange(range)
}
