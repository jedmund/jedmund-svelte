<script lang="ts">
	import type { Editor } from '$lib/components/edra/tiptap/index.js'
	import type { ComposerFeatures, ComposerVariant } from './types'
	import ComposerToolbar from './ComposerToolbar.svelte'
	import TextStyleDropdown from './TextStyleDropdown.svelte'
	import MediaInsertDropdown from './MediaInsertDropdown.svelte'
	import { useDropdown } from './useDropdown.svelte'
	import { getFilteredCommands, getCurrentTextStyle, excludedCommands } from './editorConfig'
	let {
		editor,
		variant,
		features,
		albumId,
		onOpenMediaLibrary
	}: {
		editor: Editor
		variant: ComposerVariant
		features: ComposerFeatures
		albumId?: number
		onOpenMediaLibrary: () => void
	} = $props()
	let toolbarRef = $state<ComposerToolbar>()
	// Command configuration
	const filteredCommands = getFilteredCommands(variant, features)
	const currentTextStyle = $derived(editor ? getCurrentTextStyle(editor) : 'Paragraph')

	// Dropdown states
	let showTextStyleDropdown = $state(false)
	let showMediaDropdown = $state(false)

	// Text style dropdown
	const textStyleDropdown = $derived.by(() => {
		return useDropdown({
			triggerRef: toolbarRef?.getDropdownRefs()?.textStyle,
			isOpen: showTextStyleDropdown,
			onClose: () => (showTextStyleDropdown = false),
			portalClass: 'dropdown-menu-portal'
		})
	})

	// Media dropdown
	const mediaDropdown = $derived.by(() => {
		return useDropdown({
			triggerRef: toolbarRef?.getDropdownRefs()?.media,
			isOpen: showMediaDropdown,
			onClose: () => (showMediaDropdown = false),
			portalClass: 'media-dropdown-portal'
		})
	})
</script>

<ComposerToolbar
	bind:this={toolbarRef}
	{editor}
	{variant}
	{currentTextStyle}
	{filteredCommands}
	{excludedCommands}
	showMediaLibrary={!!features.mediaLibrary}
	onTextStyleDropdownToggle={() => {
		showTextStyleDropdown = !showTextStyleDropdown
		textStyleDropdown?.toggle()
	}}
	onMediaDropdownToggle={() => {
		showMediaDropdown = !showMediaDropdown
		mediaDropdown?.toggle()
	}}
/>
<!-- Text Style Dropdown -->
{#if showTextStyleDropdown && editor}
	<TextStyleDropdown
		{editor}
		position={textStyleDropdown?.position() || { top: 0, left: 0 }}
		{features}
		onDismiss={() => (showTextStyleDropdown = false)}
	/>
{/if}

<!-- Media Insert Dropdown -->
{#if showMediaDropdown && editor && features.mediaLibrary}
	<MediaInsertDropdown
		{editor}
		position={mediaDropdown?.position() || { top: 0, left: 0 }}
		{features}
		{albumId}
		onDismiss={() => (showMediaDropdown = false)}
		{onOpenMediaLibrary}
	/>
{/if}
