<script lang="ts">
	import GenericMetadataPopover, { type MetadataConfig } from './GenericMetadataPopover.svelte'

	type Props = {
		album: any
		triggerElement: HTMLElement
		onUpdate: (key: string, value: any) => void
		onDelete: () => void
		onClose?: () => void
	}

	let {
		album = $bindable(),
		triggerElement,
		onUpdate,
		onDelete,
		onClose = () => {}
	}: Props = $props()

	// Convert album date to YYYY-MM-DD format for date input
	const albumDate = $derived(album.date ? new Date(album.date).toISOString().split('T')[0] : '')

	// Handle date changes - convert back to ISO string
	function handleDateChange(key: string, value: string) {
		if (key === 'date') {
			const isoDate = value ? new Date(value).toISOString() : null
			onUpdate(key, isoDate)
		} else {
			onUpdate(key, value)
		}
	}

	const config: MetadataConfig = {
		title: 'Album Settings',
		fields: [
			{
				type: 'input',
				key: 'slug',
				label: 'Slug',
				placeholder: 'album-url-slug',
				helpText: 'Used in the album URL.'
			},
			{
				type: 'date',
				key: 'date',
				label: 'Date',
				helpText: 'When was this album created or photos taken?'
			},
			{
				type: 'input',
				key: 'location',
				label: 'Location',
				placeholder: 'Location where photos were taken'
			},
			{
				type: 'section',
				key: 'display-options',
				label: 'Display Options'
			},
			{
				type: 'toggle',
				key: 'isPhotography',
				label: 'Show in Photos',
				helpText: 'Show this album in the photography experience'
			},
			{
				type: 'toggle',
				key: 'showInUniverse',
				label: 'Show in Universe',
				helpText: 'Display this album in the Universe feed'
			},
			{
				type: 'metadata',
				key: 'metadata'
			}
		],
		deleteButton: {
			label: 'Delete Album',
			action: onDelete
		}
	}

	// Create a reactive data object that includes the formatted date
	let popoverData = $state({
		...album,
		date: albumDate
	})

	// Sync changes back to album
	$effect(() => {
		popoverData = {
			...album,
			date: albumDate
		}
	})
</script>

<GenericMetadataPopover 
	{config}
	bind:data={popoverData}
	{triggerElement}
	onUpdate={handleDateChange}
	{onClose}
/>