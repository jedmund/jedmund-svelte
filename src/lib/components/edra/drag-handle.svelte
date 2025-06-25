<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { Node } from '@tiptap/pm/model'
	import { onMount } from 'svelte'
	import { DragHandlePlugin } from './extensions/drag-handle/index.js'
	import DropdownMenu from '../admin/DropdownMenu.svelte'

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
	let dragHandleContainer = $state<HTMLElement>()

	// Generate menu items based on current node
	const menuItems = $derived(() => {
		if (!currentNode) return []
		
		const items: DropdownItem[] = []
		const nodeType = currentNode.node.type.name
		
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
		if ((nodeType === 'paragraph' || nodeType === 'heading') && hasLinks(currentNode.node)) {
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
			if (child.type.name === 'link' || (child.isText && child.marks.some(mark => mark.type.name === 'link'))) {
				hasLink = true
			}
		})
		return hasLink
	}

	// Block manipulation functions
	function convertBlockType(type: string, attrs?: any) {
		console.log('convertBlockType called:', type, attrs)
		if (!currentNode) {
			console.log('No current node')
			return
		}
		
		const { pos } = currentNode
		console.log('Current node:', currentNode.node.type.name, 'at pos:', pos)
		
		// Focus the editor first
		editor.commands.focus()
		
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
		if (!currentNode) return
		
		const { pos } = currentNode
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
		if (!currentNode) return
		
		const { node, pos } = currentNode
		const url = node.attrs.url
		const title = node.attrs.title || url
		
		// Get the actual position of the urlEmbed node
		const nodePos = pos
		const nodeSize = node.nodeSize
		
		// Replace embed with a paragraph containing a link
		editor.chain()
			.focus()
			.deleteRange({ from: nodePos, to: nodePos + nodeSize })
			.insertContentAt(nodePos, {
				type: 'paragraph',
				content: [{
					type: 'text',
					text: title,
					marks: [{
						type: 'link',
						attrs: {
							href: url,
							target: '_blank'
						}
					}]
				}]
			})
			.run()
		
		isMenuOpen = false
	}

	function addCardsForLinks() {
		if (!currentNode) return
		
		const { node, pos } = currentNode
		const links: { url: string; text: string }[] = []
		
		// Collect all links in the current block
		node.descendants((child) => {
			if (child.isText && child.marks.some(mark => mark.type.name === 'link')) {
				const linkMark = child.marks.find(mark => mark.type.name === 'link')
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
			const embeds = links.map(link => ({
				type: 'urlEmbed',
				attrs: {
					url: link.url,
					title: link.text
				}
			}))
			
			editor.chain()
				.focus()
				.insertContentAt(nodeEnd, embeds)
				.run()
		}
		
		isMenuOpen = false
	}

	function removeFormatting() {
		if (!currentNode) return
		
		const { pos } = currentNode
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeStart = resolvedPos.before(resolvedPos.depth)
		const nodeEnd = nodeStart + resolvedPos.node(resolvedPos.depth).nodeSize
		
		editor.chain()
			.focus()
			.setTextSelection({ from: nodeStart, to: nodeEnd })
			.clearNodes()
			.unsetAllMarks()
			.run()
		
		isMenuOpen = false
	}

	function duplicateBlock() {
		if (!currentNode) return
		
		const { node, pos } = currentNode
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeEnd = resolvedPos.after(resolvedPos.depth)
		
		editor.chain()
			.focus()
			.insertContentAt(nodeEnd, node.toJSON())
			.run()
		
		isMenuOpen = false
	}

	function copyBlock() {
		if (!currentNode) return
		
		const { pos } = currentNode
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeStart = resolvedPos.before(resolvedPos.depth)
		const nodeEnd = nodeStart + resolvedPos.node(resolvedPos.depth).nodeSize
		
		editor.chain()
			.focus()
			.setTextSelection({ from: nodeStart, to: nodeEnd })
			.run()
		
		document.execCommand('copy')
		
		// Clear selection after copy
		editor.chain()
			.focus()
			.setTextSelection(nodeEnd)
			.run()
		
		isMenuOpen = false
	}

	function deleteBlock() {
		if (!currentNode) return
		
		const { pos } = currentNode
		const resolvedPos = editor.state.doc.resolve(pos)
		const nodeStart = resolvedPos.before(resolvedPos.depth)
		const nodeEnd = nodeStart + resolvedPos.node(resolvedPos.depth).nodeSize
		
		editor.chain()
			.focus()
			.deleteRange({ from: nodeStart, to: nodeEnd })
			.run()
		
		isMenuOpen = false
	}

	function handleMenuClick(e: MouseEvent) {
		console.log('Drag handle clicked!', e)
		console.log('Current node:', currentNode)
		console.log('Menu items:', menuItems())
		e.preventDefault()
		e.stopPropagation()
		
		// Only toggle if we're clicking on the same node
		// If clicking on a different node while menu is open, just update the menu
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
			dragHandleWidth: 24,
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
			if (existingDragHandle && !(existingDragHandle as any).__menuListener) {
				console.log('Found drag handle, adding click listener')
				existingDragHandle.addEventListener('click', handleMenuClick)
				;(existingDragHandle as any).__menuListener = true
				
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
