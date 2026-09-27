import CompositionControlsDemo from './CompositionControlsDemo.svelte'

export default {
	title: 'Admin/Composition and controls',
	component: CompositionControlsDemo,
	parameters: { layout: 'fullscreen' }
}
export const Suggestions = { args: { flow: 'suggestions' } }
export const SyndicationRetry = { args: { flow: 'syndication' } }
export const InlineComposer = { args: { flow: 'composer' } }
