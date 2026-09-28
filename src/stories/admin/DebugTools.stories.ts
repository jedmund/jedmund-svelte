import DebugToolsDemo from './DebugToolsDemo.svelte'

export default {
	title: 'Admin/Debug tools',
	component: DebugToolsDemo,
	parameters: { layout: 'fullscreen' }
}
export const Panel = { args: { view: 'panel' } }
export const Search = { args: { view: 'search' } }
export const Albums = { args: { view: 'albums' } }
