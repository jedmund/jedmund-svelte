import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Suppresses the native browser context menu when right-clicking a link, so the
// link bubble menu (which is already visible because the cursor is on the link)
// remains the single, consistent UI for link actions.
export const LinkContextMenu = Extension.create({
	name: 'linkContextMenu',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('linkContextMenu'),
				props: {
					handleDOMEvents: {
						contextmenu: (view, event) => {
							const { state } = view
							const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })

							if (!pos) return false

							const $pos = state.doc.resolve(pos.pos)
							const linkMark = $pos.marks().find((mark) => mark.type.name === 'link')

							if (linkMark && linkMark.attrs.href) {
								event.preventDefault()
								return true
							}

							return false
						}
					}
				}
			})
		]
	}
})
