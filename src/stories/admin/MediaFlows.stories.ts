import MediaFlowsDemo from './MediaFlowsDemo.svelte'

export default {
	title: 'Admin/Media flows',
	component: MediaFlowsDemo,
	parameters: { layout: 'fullscreen' }
}
export const Library = { args: { flow: 'library' } }
export const Details = { args: { flow: 'details' } }
export const Picker = { args: { flow: 'picker' } }
export const Albums = { args: { flow: 'albums' } }
export const BulkAlbums = { args: { flow: 'bulkAlbums' } }
export const Upload = { args: { flow: 'upload' } }

export const RejectedSelection = { args: { flow: 'library', failSelection: true } }
