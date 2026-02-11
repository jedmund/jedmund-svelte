import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Strips the `color` attribute from `textStyle` marks on text that also
 * has a `link` mark. This prevents inline color styles from overriding
 * the link's CSS color in the editor.
 */
export const LinkColorStrip = Extension.create({
	name: 'linkColorStrip',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('linkColorStrip'),
				appendTransaction: (transactions, _oldState, newState) => {
					if (!transactions.some((tr) => tr.docChanged)) return null

					const { tr, doc, schema } = newState
					const linkType = schema.marks.link
					const textStyleType = schema.marks.textStyle
					if (!linkType || !textStyleType) return null

					let modified = false

					doc.descendants((node, pos) => {
						if (!node.isText) return

						const hasLink = node.marks.some((m) => m.type === linkType)
						if (!hasLink) return

						const textStyleMark = node.marks.find((m) => m.type === textStyleType)
						if (!textStyleMark || !textStyleMark.attrs.color) return

						// Remove color but keep other textStyle attrs (e.g. fontSize)
						const newAttrs = { ...textStyleMark.attrs, color: null }
						const hasOtherAttrs = Object.values(newAttrs).some((v) => v !== null)

						tr.removeMark(pos, pos + node.nodeSize, textStyleMark)
						if (hasOtherAttrs) {
							tr.addMark(pos, pos + node.nodeSize, textStyleType.create(newAttrs))
						}
						modified = true
					})

					return modified ? tr : null
				}
			})
		]
	}
})
