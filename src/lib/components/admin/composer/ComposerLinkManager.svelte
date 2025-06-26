<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import UrlConvertDropdown from '$lib/components/edra/headless/components/UrlConvertDropdown.svelte'
	import LinkContextMenuComponent from '$lib/components/edra/headless/components/LinkContextMenu.svelte'
	import LinkEditDialog from '$lib/components/edra/headless/components/LinkEditDialog.svelte'

	interface Props {
		editor: Editor
		features: {
			urlEmbed?: boolean
		}
	}

	let { editor, features }: Props = $props()

	// URL convert dropdown state
	let showUrlConvertDropdown = $state(false)
	let urlConvertDropdownPosition = $state({ x: 0, y: 0 })
	let urlConvertPos = $state<number | null>(null)

	// Link context menu state
	let showLinkContextMenu = $state(false)
	let linkContextMenuPosition = $state({ x: 0, y: 0 })
	let linkContextUrl = $state<string | null>(null)
	let linkContextPos = $state<number | null>(null)

	// Link edit dialog state
	let showLinkEditDialog = $state(false)
	let linkEditDialogPosition = $state({ x: 0, y: 0 })
	let linkEditUrl = $state<string>('')
	let linkEditPos = $state<number | null>(null)

	// URL convert handlers
	export function handleShowUrlConvertDropdown(pos: number, url: string) {
		if (!editor) return
		const coords = editor.view.coordsAtPos(pos)
		urlConvertDropdownPosition = { x: coords.left, y: coords.bottom + 5 }
		urlConvertPos = pos
		showUrlConvertDropdown = true
	}

	function handleConvertToEmbed() {
		if (!editor || urlConvertPos === null) return
		editor.commands.convertLinkToEmbed(urlConvertPos)
		showUrlConvertDropdown = false
		urlConvertPos = null
	}

	// Link context menu handlers
	export function handleShowLinkContextMenu(pos: number, url: string) {
		if (!editor) return
		const coords = editor.view.coordsAtPos(pos)
		linkContextMenuPosition = { x: coords.left, y: coords.bottom + 5 }
		linkContextUrl = url
		linkContextPos = pos
		showLinkContextMenu = true
	}

	function handleConvertLinkToEmbed() {
		if (!editor || linkContextPos === null) return
		editor.commands.convertLinkToEmbed(linkContextPos)
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	function handleEditLink() {
		if (!editor || linkContextPos === null || !linkContextUrl) return
		const coords = editor.view.coordsAtPos(linkContextPos)
		linkEditDialogPosition = { x: coords.left, y: coords.bottom + 5 }
		linkEditUrl = linkContextUrl
		linkEditPos = linkContextPos
		showLinkEditDialog = true
		showLinkContextMenu = false
	}

	function handleSaveLink(newUrl: string) {
		if (!editor || linkEditPos === null) return
		// Update link by setting selection and re-applying link mark
		const { state } = editor
		const { doc } = state
		const node = doc.nodeAt(linkEditPos)
		if (node) {
			editor
				.chain()
				.focus()
				.setTextSelection({ from: linkEditPos, to: linkEditPos + node.nodeSize })
				.setLink({ href: newUrl })
				.run()
		}
		showLinkEditDialog = false
		linkEditPos = null
		linkEditUrl = ''
	}

	function handleCopyLink() {
		if (!linkContextUrl) return
		navigator.clipboard.writeText(linkContextUrl)
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	function handleRemoveLink() {
		if (!editor || linkContextPos === null) return
		// Remove link by unset link command
		editor.chain().focus().unsetLink().run()
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	function handleOpenLink() {
		if (!linkContextUrl) return
		window.open(linkContextUrl, '_blank')
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.url-convert-dropdown')) {
			showUrlConvertDropdown = false
		}
		if (!target.closest('.link-context-menu')) {
			showLinkContextMenu = false
		}
		if (!target.closest('.link-edit-dialog')) {
			showLinkEditDialog = false
		}
	}

	// Dismiss dropdowns on typing
	export function dismissOnTyping(transaction: any) {
		if (showUrlConvertDropdown && transaction.docChanged) {
			const hasTextChange = transaction.steps.some(
				(step: any) =>
					step.toJSON().stepType === 'replace' || step.toJSON().stepType === 'replaceAround'
			)
			if (hasTextChange) {
				showUrlConvertDropdown = false
				urlConvertPos = null
			}
		}
	}

	$effect(() => {
		if (showUrlConvertDropdown || showLinkContextMenu || showLinkEditDialog) {
			document.addEventListener('click', handleClickOutside)
			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})

	// Export state for parent to check if any menus are open
	export function hasOpenMenus() {
		return showUrlConvertDropdown || showLinkContextMenu || showLinkEditDialog
	}
</script>

<!-- URL Convert Dropdown -->
{#if showUrlConvertDropdown && features.urlEmbed}
	<UrlConvertDropdown
		x={urlConvertDropdownPosition.x}
		y={urlConvertDropdownPosition.y}
		onConvert={handleConvertToEmbed}
		onDismiss={() => {
			showUrlConvertDropdown = false
			urlConvertPos = null
		}}
	/>
{/if}

<!-- Link Context Menu -->
{#if showLinkContextMenu && linkContextUrl}
	<LinkContextMenuComponent
		x={linkContextMenuPosition.x}
		y={linkContextMenuPosition.y}
		url={linkContextUrl}
		onConvertToCard={features.urlEmbed ? handleConvertLinkToEmbed : undefined}
		onEditLink={handleEditLink}
		onCopyLink={handleCopyLink}
		onRemoveLink={handleRemoveLink}
		onOpenLink={handleOpenLink}
		onDismiss={() => {
			showLinkContextMenu = false
			linkContextPos = null
			linkContextUrl = null
		}}
	/>
{/if}

<!-- Link Edit Dialog -->
{#if showLinkEditDialog}
	<LinkEditDialog
		x={linkEditDialogPosition.x}
		y={linkEditDialogPosition.y}
		currentUrl={linkEditUrl}
		onSave={handleSaveLink}
		onCancel={() => {
			showLinkEditDialog = false
			linkEditPos = null
			linkEditUrl = ''
		}}
	/>
{/if}