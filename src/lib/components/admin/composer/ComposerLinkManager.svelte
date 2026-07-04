<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import UrlConvertDropdown from '$lib/components/edra/headless/components/UrlConvertDropdown.svelte'

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

	// URL convert handlers
	export function handleShowUrlConvertDropdown(pos: number, _url: string) {
		if (!editor || !editor.view) return
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

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.url-convert-dropdown')) {
			showUrlConvertDropdown = false
		}
	}

	// Dismiss dropdowns on typing
	export function dismissOnTyping(transaction: unknown) {
		const tr = transaction as { docChanged?: boolean; steps?: { toJSON(): { stepType: string } }[] }
		if (showUrlConvertDropdown && tr.docChanged) {
			const hasTextChange = tr.steps?.some(
				(step) => step.toJSON().stepType === 'replace' || step.toJSON().stepType === 'replaceAround'
			)
			if (hasTextChange) {
				showUrlConvertDropdown = false
				urlConvertPos = null
			}
		}
	}

	$effect(() => {
		if (showUrlConvertDropdown) {
			document.addEventListener('click', handleClickOutside)
			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})

	// Export state for parent to check if any menus are open
	export function hasOpenMenus() {
		return showUrlConvertDropdown
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
