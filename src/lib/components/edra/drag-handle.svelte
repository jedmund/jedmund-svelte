<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { Node } from '@tiptap/pm/model'
	import { onMount } from 'svelte'
	import { DragHandlePlugin } from './extensions/drag-handle/index.js'
	import DropdownMenu from '../admin/DropdownMenu.svelte'
	import { toast } from '$lib/stores/toast'

	interface Props {
		editor: Editor
	}

	interface DropdownItem {
		id: string
		label?: string
		action?: () => void
		variant?: 'default' | 'danger'
		divider?: boolean
		children?: DropdownItem[]
		icon?: string
	}

	const { editor }: Props = $props()

	const pluginKey = 'globalDragHandle'

	// State
	let isMenuOpen = $state(false)
	let currentNode = $state<{ node: Node; pos: number } | null>(null)
	let menuNode = $state<{ node: Node; pos: number } | null>(null) // Node when menu was opened
	let dragHandleContainer = $state<HTMLElement>()

	// Generate menu items based on current node
	const menuItems = $derived(() => {
		// Use menuNode when menu is open, otherwise currentNode
		const activeNode = isMenuOpen && menuNode ? menuNode : currentNode
		if (!activeNode) return []

		const items: DropdownItem[] = []
		const nodeType = activeNode.node.type.name

		// Block type conversion options
		if (nodeType === 'paragraph' || nodeType === 'heading') {
			const turnIntoChildren = []

			turnIntoChildren.push({
				id: 'convert-paragraph',
				label: 'Paragraph',
				action: () => convertBlockType('paragraph')
			})
			turnIntoChildren.push({
				id: 'convert-h1',
				label: 'Heading 1',
				action: () => convertBlockType('heading', { level: 1 })
			})
			turnIntoChildren.push({
				id: 'convert-h2',
				label: 'Heading 2',
				action: () => convertBlockType('heading', { level: 2 })
			})
			turnIntoChildren.push({
				id: 'convert-h3',
				label: 'Heading 3',
				action: () => convertBlockType('heading', { level: 3 })
			})
			turnIntoChildren.push({
				id: 'convert-blockquote',
				label: 'Quote',
				action: () => convertBlockType('blockquote')
			})

			items.push({
				id: 'turn-into',
				label: 'Turn into',
				children: turnIntoChildren
			})
			items.push({
				id: 'divider-1',
				divider: true
			})
		}

		// List-specific actions
		if (nodeType === 'listItem') {
			const turnIntoChildren = []

			turnIntoChildren.push({
				id: 'convert-bullet',
				label: 'Bullet List',
				action: () => convertToList('bulletList')
			})
			turnIntoChildren.push({
				id: 'convert-numbered',
				label: 'Numbered List',
				action: () => convertToList('orderedList')
			})
			turnIntoChildren.push({
				id: 'convert-task',
				label: 'Task List',
				action: () => convertToList('taskList')
			})

			items.push({
				id: 'turn-into',
				label: 'Turn into',
				children: turnIntoChildren
			})
			items.push({
				id: 'divider-1',
				divider: true
			})
		}

		// URL embed specific actions
		if (nodeType === 'urlEmbed') {
			items.push({
				id: 'convert-to-link',
				label: 'Convert to Link',
				action: () => convertEmbedToLink()
			})
			items.push({
				id: 'divider-1',
				divider: true
			})
		}

		// Check if block contains links that could have cards added
		if ((nodeType === 'paragraph' || nodeType === 'heading') && hasLinks(activeNode.node)) {
			items.push({
				id: 'add-link-cards',
				label: 'Add cards for links',
				action: () => addCardsForLinks()
			})
			items.push({
				id: 'divider-1',
				divider: true
			})
		}

		// Common actions
		items.push({
			id: 'duplicate',
			label: 'Duplicate',
			action: () => duplicateBlock()
		})

		items.push({
			id: 'copy',
			label: 'Copy',
			action: () => copyBlock()
		})

		// Text formatting removal
		if (nodeType === 'paragraph' || nodeType === 'heading') {
			items.push({
				id: 'remove-formatting',
				label: 'Remove Formatting',
				action: () => removeFormatting()
			})
		}

		items.push({
			id: 'divider-2',
			divider: true
		})

		items.push({
			id: 'delete',
			label: 'Delete',
			action: () => deleteBlock(),
			variant: 'danger' as const
		})

		return items
	})

	// Helper functions
	function hasLinks(node: Node): boolean {
		let hasLink = false
		node.descendants((child) => {
			if (
				child.type.name === 'link' ||
				(child.isText && child.marks.some((mark) => mark.type.name === 'link'))
			) {
				hasLink = true
			}
		})
		return hasLink
	}

	// Block manipulation functions
	function convertBlockType(type: string, attrs?: Record<string, unknown>) {
		console.log('convertBlockType called:', type, attrs)
		// Use menuNode which was captured when menu was opened
		const nodeToConvert = menuNode || currentNode
		if (!nodeToConvert) {
			console.log('No node to convert')
			return
		}

		const { pos, node } = nodeToConvert
		console.log('Converting node:', node.type.name, 'at pos:', pos)

		// Calculate the actual position of the node
		const nodeStart = pos
		const nodeEnd = pos + node.nodeSize

		// Set selection to the specific node we want to convert
		editor.chain().focus().setTextSelection({ from: nodeStart, to: nodeEnd }).run()

		// Convert the block type using chain commands
		if (type === 'paragraph') {
			editor.chain().focus().setParagraph().run()
		} else if (type === 'heading' && attrs?.level) {
			editor.chain().focus().setHeading({ level: attrs.level }).run()
		} else if (type === 'blockquote') {
			editor.chain().focus().setBlockquote().run()
		}

		isMenuOpen = false
	}

	function convertToList(listType: string) {
		const nodeToConvert = menuNode || currentNode
		if (!nodeToConvert) return

		const { pos } = nodeToConvert
		const resolvedPos = editor.state.doc.resolve(pos)

		// Get the position of the list item
		let nodePos = pos
		if (resolvedPos.parent.type.name === 'listItem') {
			nodePos = resolvedPos.before(resolvedPos.depth)
		}

		// Set selection to the list item
		editor.commands.setNodeSelection(nodePos)

		// Convert to the appropriate list type
		if (listType === 'bulletList') {
			editor.commands.toggleBulletList()
		} else if (listType === 'orderedList') {
			editor.commands.toggleOrderedList()
		} else if (listType === 'taskList') {
			editor.commands.toggleTaskList()
		}

		isMenuOpen = false
	}

	function convertEmbedToLink() {
		const nodeToConvert = menuNode || currentNode
		if (!nodeToConvert) return

		const { node, pos } = nodeToConvert
		const url = node.attrs.url
		const title = node.attrs.title || url

		// Get the actual position of the urlEmbed node
		const nodePos = pos
		const nodeSize = node.nodeSize

		// Replace embed with a paragraph containing a link
		editor
			.chain()
			.focus()
			.deleteRange({ from: nodePos, to: nodePos + nodeSize })
			.insertContentAt(nodePos, {
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: title,
						marks: [
							{
								type: 'link',
								attrs: {
									href: url,
									target: '_blank'
								}
							}
						]
					}
				]
			})
			.run()

		isMenuOpen = false
	}

	function addCardsForLinks() {
		const nodeToUse = menuNode || currentNode
		if (!nodeToUse) return

		const { node, pos } = nodeToUse
		const links: { url: string; text: string }[] = []

		// Collect all links in the current block
		node.descendants((child) => {
			if (child.isText && child.marks.some((mark) => mark.type.name === 'link')) {
				const linkMark = child.marks.find((mark) => mark.type.name === 'link')
				if (linkMark && linkMark.attrs.href) {
					links.push({
						url: linkMark.attrs.href,
						text: child.text || linkMark.attrs.href
					})
				}
			}
		})

		// Insert embeds after the current block
		if (links.length > 0) {
			const nodeEnd = pos + node.nodeSize
			const embeds = links.map((link) => ({
				type: 'urlEmbed',
				attrs: {
					url: link.url,
					title: link.text
				}
			}))

			editor.chain().focus().insertContentAt(nodeEnd, embeds).run()
		}

		isMenuOpen = false
	}

	function removeFormatting() {
		const nodeToUse = menuNode || currentNode
		if (!nodeToUse) return

		const { pos } = nodeToUse
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeStart = resolvedPos.before(resolvedPos.depth)
		const nodeEnd = nodeStart + resolvedPos.node(resolvedPos.depth).nodeSize

		editor
			.chain()
			.focus()
			.setTextSelection({ from: nodeStart, to: nodeEnd })
			.clearNodes()
			.unsetAllMarks()
			.run()

		isMenuOpen = false
	}

	function duplicateBlock() {
		const nodeToUse = menuNode || currentNode
		if (!nodeToUse) return

		const { node, pos } = nodeToUse
		
		// Create a copy of the node
		const nodeCopy = node.toJSON()

		// Find the position after this node
		// We need to find the actual position of the node in the document
		const resolvedPos = editor.state.doc.resolve(pos)
		let nodePos = pos
		
		// If we're inside a node, get the position before it
		if (resolvedPos.depth > 0) {
			nodePos = resolvedPos.before(resolvedPos.depth)
		}
		
		// Get the actual node at this position
		const actualNode = editor.state.doc.nodeAt(nodePos)
		if (!actualNode) {
			console.error('Could not find node at position', nodePos)
			return
		}
		
		// Calculate the position after the node
		const afterPos = nodePos + actualNode.nodeSize

		// Insert the duplicated node
		editor.chain()
			.focus()
			.insertContentAt(afterPos, nodeCopy)
			.run()

		isMenuOpen = false
	}

	function copyBlock() {
		const nodeToUse = menuNode || currentNode
		if (!nodeToUse) return

		const { node, pos } = nodeToUse
		
		// Find the actual position of the node
		const resolvedPos = editor.state.doc.resolve(pos)
		let nodePos = pos
		
		// If we're inside a node, get the position before it
		if (resolvedPos.depth > 0) {
			nodePos = resolvedPos.before(resolvedPos.depth)
		}
		
		// Get the actual node at this position
		const actualNode = editor.state.doc.nodeAt(nodePos)
		if (!actualNode) {
			console.error('Could not find node at position', nodePos)
			return
		}
		
		const nodeEnd = nodePos + actualNode.nodeSize

		// Set selection to the entire block
		editor.chain().focus().setTextSelection({ from: nodePos, to: nodeEnd }).run()

		// Execute copy command
		setTimeout(() => {
			const success = document.execCommand('copy')
			
			// Clear selection after copy
			editor.chain().focus().setTextSelection(nodeEnd).run()

			if (success) {
				toast.success('Block copied to clipboard')
			} else {
				toast.error('Failed to copy block')
			}
		}, 50)

		isMenuOpen = false
	}

	function deleteBlock() {
		const nodeToUse = menuNode || currentNode
		if (!nodeToUse) return

		const { pos } = nodeToUse
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeStart = resolvedPos.before(resolvedPos.depth)
		const nodeEnd = nodeStart + resolvedPos.node(resolvedPos.depth).nodeSize

		editor.chain().focus().deleteRange({ from: nodeStart, to: nodeEnd }).run()

		isMenuOpen = false
	}

	function handleMenuClick(e: MouseEvent) {
		console.log('Drag handle clicked!', e)
		console.log('Current node:', currentNode)
		console.log('Menu items:', menuItems())
		e.preventDefault()
		e.stopPropagation()

		// Capture the current node when opening the menu
		if (!isMenuOpen) {
			menuNode = currentNode
		} else {
			menuNode = null
		}

		isMenuOpen = !isMenuOpen
		console.log('Menu open state:', isMenuOpen)
	}

	// Prevent drag handle from hiding when menu is open
	$effect(() => {
		if (dragHandleContainer && isMenuOpen) {
			dragHandleContainer.classList.add('menu-open')
		} else if (dragHandleContainer) {
			dragHandleContainer.classList.remove('menu-open')
		}
	})

	onMount(() => {
		// Register the plugin with onMouseMove callback
		const plugin = DragHandlePlugin({
			pluginKey: pluginKey,
			dragHandleWidth: 20,
			scrollTreshold: 100,
			excludedTags: ['pre', 'code', 'table p'],
			customNodes: ['urlEmbed', 'image', 'video', 'audio', 'gallery', 'iframe', 'geolocation'],
			onMouseMove: (data) => {
				console.log('Mouse move over node:', data)
				currentNode = data
			}
		})
		editor.registerPlugin(plugin)

		// Find the existing drag handle created by the plugin and add click listener
		const checkForDragHandle = setInterval(() => {
			const existingDragHandle = document.querySelector('.drag-handle')
			const element = existingDragHandle as HTMLElement & { __menuListener?: boolean }
			if (existingDragHandle && !element.__menuListener) {
				console.log('Found drag handle, adding click listener')
				existingDragHandle.addEventListener('click', handleMenuClick)
				element.__menuListener = true

				// Update our reference to use the existing drag handle
				dragHandleContainer = existingDragHandle as HTMLElement
				clearInterval(checkForDragHandle)
			}
		}, 100)

		return () => {
			editor.unregisterPlugin(pluginKey)
			clearInterval(checkForDragHandle)
			const existingDragHandle = document.querySelector('.drag-handle')
			if (existingDragHandle) {
				existingDragHandle.removeEventListener('click', handleMenuClick)
			}
		}
	})
</script>

{#if dragHandleContainer}
	<DropdownMenu
		bind:isOpen={isMenuOpen}
		triggerElement={dragHandleContainer}
		items={menuItems()}
		onClose={() => {
			console.log('Dropdown closed')
			isMenuOpen = false
		}}
	/>
{/if}
