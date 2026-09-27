import type { Editor } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

/** Hover actions must target the hovered node, not the current text selection. */
export function duplicateNode(editor: Editor, node: Node, getPos: () => number | undefined) {
	const pos = getPos()
	if (typeof pos !== 'number') return
	editor
		.chain()
		.insertContentAt(pos + node.nodeSize, node.toJSON())
		.focus()
		.run()
}
