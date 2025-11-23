import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface UrlEmbedOptions {
	HTMLAttributes: Record<string, unknown>
	onShowDropdown?: (pos: number, url: string) => void
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		urlEmbed: {
			/**
			 * Set a URL embed
			 */
			setUrlEmbed: (options: {
				url: string
				title?: string
				description?: string
				image?: string
				favicon?: string
				siteName?: string
			}) => ReturnType
			/**
			 * Insert a URL embed placeholder
			 */
			insertUrlEmbedPlaceholder: () => ReturnType
			/**
			 * Convert a link at position to URL embed
			 */
			convertLinkToEmbed: (pos: number) => ReturnType
		}
	}
}

export const UrlEmbed = Node.create<UrlEmbedOptions>({
	name: 'urlEmbed',

	group: 'block',

	atom: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		}
	},

	addAttributes() {
		return {
			url: {
				default: null
			},
			title: {
				default: null
			},
			description: {
				default: null
			},
			image: {
				default: null
			},
			favicon: {
				default: null
			},
			siteName: {
				default: null
			}
		}
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-url-embed]'
			}
		]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes({ 'data-url-embed': '' }, this.options.HTMLAttributes, HTMLAttributes)
		]
	},

	addCommands() {
		return {
			setUrlEmbed:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: options
					})
				},
			insertUrlEmbedPlaceholder:
				() =>
				({ commands }) => {
					return commands.insertContent({
						type: 'urlEmbedPlaceholder'
					})
				},
			convertLinkToEmbed:
				(pos) =>
				({ state, commands, chain }) => {
					const { doc } = state

					// Find the link mark at the given position
					const $pos = doc.resolve(pos)
					const marks = $pos.marks()
					const linkMark = marks.find((mark) => mark.type.name === 'link')

					if (!linkMark) return false

					const url = linkMark.attrs.href
					if (!url) return false

					// Find the complete range of text with this link mark
					let from = pos
					let to = pos

					// Walk backwards to find the start
					doc.nodesBetween(Math.max(0, pos - 300), pos, (node, nodePos) => {
						if (
							node.isText &&
							node.marks.some((m) => m.type.name === 'link' && m.attrs.href === url)
						) {
							from = nodePos
						}
					})

					// Walk forwards to find the end
					doc.nodesBetween(pos, Math.min(doc.content.size, pos + 300), (node, nodePos) => {
						if (
							node.isText &&
							node.marks.some((m) => m.type.name === 'link' && m.attrs.href === url)
						) {
							to = nodePos + node.nodeSize
						}
					})

					// Use Tiptap's chain commands to replace content
					return chain()
						.focus()
						.deleteRange({ from, to })
						.insertContent([
							{
								type: 'urlEmbedPlaceholder',
								attrs: { url }
							},
							{
								type: 'paragraph'
							}
						])
						.run()
				}
		}
	},

	addProseMirrorPlugins() {
		const options = this.options
		return [
			new Plugin({
				key: new PluginKey('urlEmbedPaste'),
				state: {
					init: () => ({ lastPastedUrl: null, lastPastedPos: null }),
					apply: (tr, value) => {
						// Clear state if document changed significantly
						if (tr.docChanged && tr.steps.length > 0) {
							const meta = tr.getMeta('urlEmbedPaste')
							if (meta) {
								return meta
							}
							return { lastPastedUrl: null, lastPastedPos: null }
						}
						return value
					}
				},
				props: {
					handlePaste: (view, event) => {
						const { clipboardData } = event
						if (!clipboardData) return false

						const text = clipboardData.getData('text/plain')
						const html = clipboardData.getData('text/html')

						// Check if it's a plain text paste
						if (text && !html) {
							// Simple URL regex check
							const urlRegex =
								/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/

							if (urlRegex.test(text.trim())) {
								// It's a URL, let it paste as a link naturally (don't prevent default)
								// But track it so we can show dropdown after
								const pastedUrl = text.trim()

								// Get the position before paste
								const beforePos = view.state.selection.from

								setTimeout(() => {
									const { state } = view
									const { doc } = state

									// Find the link that was just inserted
									// Start from where we were before paste
									let linkStart = -1
									let linkEnd = -1

									// Search for the link in a reasonable range
									for (
										let pos = beforePos;
										pos < Math.min(doc.content.size, beforePos + pastedUrl.length + 10);
										pos++
									) {
										try {
											const $pos = doc.resolve(pos)
											const marks = $pos.marks()
											const linkMark = marks.find(
												(m) => m.type.name === 'link' && m.attrs.href === pastedUrl
											)

											if (linkMark) {
												// Found the link, now find its boundaries
												linkStart = pos

												// Find the end of the link
												for (
													let endPos = pos;
													endPos < Math.min(doc.content.size, pos + pastedUrl.length + 5);
													endPos++
												) {
													const $endPos = doc.resolve(endPos)
													const hasLink = $endPos
														.marks()
														.some((m) => m.type.name === 'link' && m.attrs.href === pastedUrl)
													if (hasLink) {
														linkEnd = endPos + 1
													} else {
														break
													}
												}
												break
											}
										} catch (e) {
											// Position might be invalid, continue
										}
									}

									if (linkStart !== -1) {
										// Store the pasted URL info with correct position
										const tr = state.tr.setMeta('urlEmbedPaste', {
											lastPastedUrl: pastedUrl,
											lastPastedPos: linkStart
										})
										view.dispatch(tr)

										// Notify the editor to show dropdown
										if (options.onShowDropdown) {
											options.onShowDropdown(linkStart, pastedUrl)
											// Ensure editor maintains focus
											view.focus()
										}
									}
								}, 100) // Small delay to let the link paste naturally
							}
						}

						return false
					}
				}
			})
		]
	}
})
