<script lang="ts">
	import NodeToolbar from './NodeToolbar.svelte'
	import Columns from '@lucide/svelte/icons/columns'
	import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical'
	import Columns2 from '@lucide/svelte/icons/columns-2'
	import Columns3 from '@lucide/svelte/icons/columns-3'
	import Edit from '@lucide/svelte/icons/edit'
	import Plus from '@lucide/svelte/icons/plus'
	import Grid from '@lucide/svelte/icons/grid-3x3'
	import Trash from '@lucide/svelte/icons/trash'
	let {
		groupRef,
		selected,
		layout,
		columns,
		changeLayout,
		changeColumns,
		handleAddImages,
		handleEditGallery,
		deleteNode
	}: {
		groupRef: HTMLElement | undefined
		selected: boolean
		layout: string
		columns: number
		changeLayout: (layout: 'grid' | 'masonry') => void
		changeColumns: (columns: number) => void
		handleAddImages: () => void
		handleEditGallery: () => void
		deleteNode: () => void
	} = $props()
</script>

<NodeToolbar anchor={groupRef} {selected}>
	<button
		type="button"
		class={`edra-toolbar-button ${layout === 'grid' ? 'active' : ''}`}
		onclick={() => changeLayout('grid')}
		title="Grid Layout"
	>
		<Grid />
	</button>
	<button
		type="button"
		class={`edra-toolbar-button ${layout === 'masonry' ? 'active' : ''}`}
		onclick={() => changeLayout('masonry')}
		title="Masonry Layout"
	>
		<Columns />
	</button>
	<div class="edra-toolbar-divider"></div>
	<button
		type="button"
		class={`edra-toolbar-button ${columns === 1 ? 'active' : ''}`}
		onclick={() => changeColumns(1)}
		title="1 column"
	>
		<RectangleVertical />
	</button>
	<button
		type="button"
		class={`edra-toolbar-button ${columns === 2 ? 'active' : ''}`}
		onclick={() => changeColumns(2)}
		title="2 columns"
	>
		<Columns2 />
	</button>
	<button
		type="button"
		class={`edra-toolbar-button ${columns === 3 ? 'active' : ''}`}
		onclick={() => changeColumns(3)}
		title="3 columns"
	>
		<Columns3 />
	</button>
	<div class="edra-toolbar-divider"></div>
	<button type="button" class="edra-toolbar-button" onclick={handleAddImages} title="Add Images">
		<Plus />
	</button>
	<button
		type="button"
		class="edra-toolbar-button"
		onclick={handleEditGallery}
		title="Edit Gallery"
	>
		<Edit />
	</button>
	<div class="edra-toolbar-divider"></div>
	<button
		type="button"
		class="edra-toolbar-button edra-destructive"
		onclick={() => deleteNode()}
		title="Delete Gallery"
	>
		<Trash />
	</button>
</NodeToolbar>
