import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface LinkContextMenuOptions {
	onShowContextMenu?: (pos: number, url: string, coords: { x: number; y: number }) => void
}

export const LinkContextMenu = Extension.create<LinkContextMenuOptions>({
	name: 'linkContextMenu',

	addOptions() {
		return {
			onShowContextMenu: undefined
		}
	},

	addProseMirrorPlugins() {
		const options = this.options

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
							const marks = $pos.marks()
							const linkMark = marks.find((mark) => mark.type.name === 'link')

							if (linkMark && linkMark.attrs.href) {
								event.preventDefault()

								if (options.onShowContextMenu) {
									options.onShowContextMenu(pos.pos, linkMark.attrs.href, {
										x: event.clientX,
										y: event.clientY
									})
								}

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
