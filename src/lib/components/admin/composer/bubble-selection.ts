import { isTextSelection } from '$lib/components/edra/tiptap/index.js'
import type { ShouldShowProps } from '$lib/editor/jedmund/types'

export function shouldShowComposerBubble(props: ShouldShowProps) {
	const { editor, state } = props
	const { selection } = state
	const { empty, from, to } = selection

	// Don't show if not editable
	if (!editor.isEditable) return false

	// Don't show if selection is empty
	if (empty) return false

	// Don't show if selection is not text
	if (!isTextSelection(selection)) return false

	// Don't show in code blocks
	if (editor.isActive('codeBlock')) return false

	// Don't show if we're in a table (has its own menus)
	if (editor.isActive('table')) return false

	// Check if selection contains only whitespace
	const text = state.doc.textBetween(from, to)
	if (!text.trim()) return false

	// Don't show when selection contains a link — the link bubble menu handles that.
	// We walk document marks rather than using editor.isActive('link'), which
	// requires the link to cover the entire selection and misses partial overlaps.
	let hasLink = false
	state.doc.nodesBetween(from, to, (node) => {
		if (hasLink) return false
		if (node.marks?.some((m: { type: { name: string } }) => m.type.name === 'link')) {
			hasLink = true
		}
	})
	if (hasLink) return false

	return true
}
