import Input from '$lib/components/admin/Input.svelte'

export default {
	title: 'Admin/Input',
	component: Input,
	tags: ['autodocs'],
	argTypes: {
		type: {
			control: { type: 'select' },
			options: [
				'text',
				'email',
				'password',
				'url',
				'search',
				'number',
				'tel',
				'date',
				'time',
				'color',
				'textarea'
			]
		},
		size: {
			control: { type: 'select' },
			options: ['small', 'medium', 'large']
		},
		fullWidth: {
			control: 'boolean'
		},
		required: {
			control: 'boolean'
		},
		disabled: {
			control: 'boolean'
		},
		readonly: {
			control: 'boolean'
		},
		prefixIcon: {
			control: 'boolean'
		},
		suffixIcon: {
			control: 'boolean'
		},
		showCharCount: {
			control: 'boolean'
		},
		label: {
			control: 'text'
		},
		placeholder: {
			control: 'text'
		},
		helpText: {
			control: 'text'
		},
		error: {
			control: 'text'
		},
		maxLength: {
			control: 'number'
		}
	}
}

// Interactive Playground
export const Playground = {
	args: {
		type: 'text',
		label: 'Your Name',
		placeholder: 'Enter your name',
		size: 'medium',
		fullWidth: true,
		required: false,
		disabled: false,
		readonly: false
	}
}

// Basic text input
export const Basic = {
	args: {
		type: 'text',
		label: 'Basic Input',
		placeholder: 'Type something...'
	}
}

// Email input
export const Email = {
	args: {
		type: 'email',
		label: 'Email Address',
		placeholder: 'you@example.com',
		required: true
	}
}

// Password input
export const Password = {
	args: {
		type: 'password',
		label: 'Password',
		placeholder: 'Enter your password',
		required: true
	}
}

// Search input
export const Search = {
	args: {
		type: 'search',
		label: 'Search',
		placeholder: 'Search for something...'
	}
}

// Number input
export const Number = {
	args: {
		type: 'number',
		label: 'Age',
		placeholder: '25',
		min: 0,
		max: 120
	}
}

// Textarea
export const Textarea = {
	args: {
		type: 'textarea',
		label: 'Description',
		placeholder: 'Tell us about yourself...',
		rows: 4
	}
}

// Auto-resizing textarea
export const AutoResizeTextarea = {
	args: {
		type: 'textarea',
		label: 'Auto-resize Textarea',
		placeholder: 'This textarea will grow as you type...',
		autoResize: true,
		rows: 2
	}
}

// With help text
export const WithHelpText = {
	args: {
		type: 'email',
		label: 'Email',
		placeholder: 'you@example.com',
		helpText: 'We will never share your email with anyone else.'
	}
}

// With error
export const WithError = {
	args: {
		type: 'email',
		label: 'Email',
		value: 'invalid-email',
		error: 'Please enter a valid email address.',
		required: true
	}
}

// Character count
export const CharacterCount = {
	args: {
		type: 'textarea',
		label: 'Bio',
		placeholder: 'Tell us about yourself...',
		maxLength: 150,
		showCharCount: true,
		rows: 3
	}
}

// Different sizes
export const Sizes = {
	render: () => ({
		template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <Input type="text" label="Small Size" placeholder="Small input" size="small" />
        <Input type="text" label="Medium Size" placeholder="Medium input" size="medium" />
        <Input type="text" label="Large Size" placeholder="Large input" size="large" />
      </div>
    `,
		components: { Input }
	})
}

// Disabled state
export const Disabled = {
	args: {
		type: 'text',
		label: 'Disabled Input',
		value: 'This input is disabled',
		disabled: true
	}
}

// Readonly state
export const Readonly = {
	args: {
		type: 'text',
		label: 'Readonly Input',
		value: 'This input is readonly',
		readonly: true
	}
}

// With prefix icon
export const WithPrefixIcon = {
	args: {
		type: 'email',
		label: 'Email with Icon',
		placeholder: 'you@example.com',
		prefixIcon: true
	},
	render: (args) => ({
		Component: Input,
		props: args,
		slots: {
			prefix: () => `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
		}
	})
}

// With suffix icon
export const WithSuffixIcon = {
	args: {
		type: 'search',
		label: 'Search with Icon',
		placeholder: 'Search...',
		suffixIcon: true
	},
	render: (args) => ({
		Component: Input,
		props: args,
		slots: {
			suffix: () => `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
		}
	})
}

// Color input
export const ColorInput = {
	args: {
		type: 'color',
		label: 'Pick a Color',
		value: '#ff6b6b'
	}
}

// Date input
export const DateInput = {
	args: {
		type: 'date',
		label: 'Select Date',
		required: true
	}
}

// Time input
export const TimeInput = {
	args: {
		type: 'time',
		label: 'Select Time'
	}
}
