import Button from '$lib/components/admin/Button.svelte'
import ButtonShowcase from './ButtonShowcase.svelte'

export default {
	title: 'Admin/Button',
	component: Button,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['primary', 'secondary', 'danger', 'ghost', 'text', 'overlay']
		},
		size: {
			control: { type: 'select' },
			options: ['small', 'medium', 'large', 'icon']
		},
		iconPosition: {
			control: { type: 'select' },
			options: ['left', 'right']
		},
		iconOnly: {
			control: 'boolean'
		},
		pill: {
			control: 'boolean'
		},
		fullWidth: {
			control: 'boolean'
		},
		loading: {
			control: 'boolean'
		},
		active: {
			control: 'boolean'
		},
		disabled: {
			control: 'boolean'
		},
		onclick: { action: 'clicked' }
	}
}

// Interactive Playground (this will be the default story for the controls)
export const Playground = {
	args: {
		variant: 'primary',
		size: 'medium',
		pill: true,
		iconOnly: false,
		fullWidth: false,
		loading: false,
		active: false,
		disabled: false
	}
}

// Primary story
export const Primary = {
	args: {
		variant: 'primary'
	}
}

// Secondary story
export const Secondary = {
	args: {
		variant: 'secondary'
	}
}

// Danger story
export const Danger = {
	args: {
		variant: 'danger'
	}
}

// Ghost story
export const Ghost = {
	args: {
		variant: 'ghost'
	}
}

// Text story
export const Text = {
	args: {
		variant: 'text'
	}
}

// Overlay story
export const Overlay = {
	args: {
		variant: 'overlay'
	}
}

// Loading State
export const Loading = {
	args: {
		variant: 'primary',
		loading: true
	}
}

// Disabled State
export const Disabled = {
	args: {
		variant: 'primary',
		disabled: true
	}
}

// Full Width
export const FullWidth = {
	args: {
		variant: 'primary',
		fullWidth: true
	}
}

// All variants showcase
export const AllVariants = {
	render: () => ({
		Component: ButtonShowcase
	})
}
