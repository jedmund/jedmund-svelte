import Avatar from './Avatar.svelte'

export default {
	title: 'Components/Avatar',
	component: Avatar,
	parameters: {
		docs: {
			description: {
				component:
					'Streamlined avatar component with interactive states and music playing indicator.'
			}
		}
	},
	argTypes: {
		forcePlayingMusic: {
			control: 'boolean',
			description: 'Force the music playing state (shows headphones)'
		}
	}
}

export const Default = {
	args: {
		forcePlayingMusic: false
	}
}

export const PlayingMusic = {
	args: {
		forcePlayingMusic: true
	}
}

export const Interactive = {
	args: {
		forcePlayingMusic: false
	},
	render: (args) => ({
		Component: Avatar,
		props: args
	}),
	parameters: {
		docs: {
			story: {
				inline: false,
				height: '400px'
			}
		}
	}
}
