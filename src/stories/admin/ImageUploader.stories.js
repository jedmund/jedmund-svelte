import ImageUploader from '$lib/components/admin/ImageUploader.svelte'

const previewUrl =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#0066cc"/><text x="110" y="155" fill="white">Sample image</text></svg>'
	)

// Mock Media object for testing
const mockMedia = {
	id: 1,
	filename: 'sample-image.jpg',
	originalName: 'sample-image.jpg',
	mimeType: 'image/jpeg',
	size: 1024000,
	width: 1920,
	height: 1080,
	url: previewUrl,
	thumbnailUrl: previewUrl,
	altText: 'A beautiful sample image',
	description: 'This is a sample image for testing purposes',
	createdAt: new Date(),
	updatedAt: new Date()
}

export default {
	title: 'Admin/Form Components/ImageUploader',
	component: ImageUploader,
	tags: ['autodocs'],
	args: { onUpload: () => {} },
	argTypes: {
		aspectRatio: {
			control: { type: 'select' },
			options: ['', '1:1', '16:9', '4:3', '3:2']
		},
		required: {
			control: 'boolean'
		},
		allowAltText: {
			control: 'boolean'
		},
		showBrowseLibrary: {
			control: 'boolean'
		},
		maxFileSize: {
			control: 'number'
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
		}
	}
}

// Empty uploader
export const Empty = {
	args: {
		label: 'Featured Image',
		placeholder: 'Drag and drop an image here, or click to browse',
		allowAltText: true,
		required: false,
		maxFileSize: 10
	}
}

// With uploaded image
export const WithImage = {
	args: {
		label: 'Project Logo',
		value: mockMedia,
		allowAltText: true,
		aspectRatio: '1:1'
	}
}

// Square aspect ratio
export const SquareAspectRatio = {
	args: {
		label: 'Square Logo',
		aspectRatio: '1:1',
		placeholder: 'Upload a square logo',
		allowAltText: true,
		required: true
	}
}

// Wide aspect ratio
export const WideAspectRatio = {
	args: {
		label: 'Hero Banner',
		aspectRatio: '16:9',
		placeholder: 'Upload a banner image',
		allowAltText: true,
		helpText: 'Recommended size: 1920x1080 pixels'
	}
}

// Required field
export const Required = {
	args: {
		label: 'Required Image',
		required: true,
		allowAltText: true,
		placeholder: 'This field is required'
	}
}

// With error
export const WithError = {
	args: {
		label: 'Image with Error',
		error: 'Please select a valid image file',
		allowAltText: true
	}
}

// With help text
export const WithHelpText = {
	args: {
		label: 'Profile Picture',
		helpText: 'Upload a clear photo of yourself. This will be displayed on your profile.',
		allowAltText: true,
		aspectRatio: '1:1',
		maxFileSize: 5
	}
}

// The legacy flag remains accepted; descriptions are always available.
export const LegacyAltTextFlag = {
	args: {
		label: 'Decorative Image',
		allowAltText: false,
		placeholder: 'Upload a decorative image',
		helpText: 'The legacy allowAltText flag does not hide the description field.'
	}
}

// With browse library option
export const WithBrowseLibrary = {
	args: {
		label: 'Featured Image',
		allowAltText: true,
		showBrowseLibrary: true,
		placeholder: 'Upload a new image or browse existing ones'
	}
}

// Small file size limit
export const SmallFileLimit = {
	args: {
		label: 'Small Image',
		maxFileSize: 1,
		allowAltText: true,
		helpText: 'Maximum file size: 1MB'
	}
}

// Interactive playground
export const Playground = {
	args: {
		label: 'Image Upload',
		placeholder: 'Drag and drop an image here',
		allowAltText: true,
		required: false,
		maxFileSize: 10,
		showBrowseLibrary: false
	}
}

export const CompactEmpty = { args: { ...Empty.args, compact: true } }
export const CompactWithImage = { args: { ...WithImage.args, compact: true } }

/** @param {'loading' | 'error'} state */
function mockUpload(state) {
	return () => {
		const originalFetch = globalThis.fetch
		globalThis.fetch = async (input, options) => {
			if (input !== '/api/media/upload') return originalFetch(input, options)
			if (state === 'error')
				return Response.json({ error: { message: 'Upload service unavailable' } }, { status: 503 })
			return new Promise((_resolve, reject) => {
				options?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError')),
					{ once: true }
				)
			})
		}
		return () => {
			globalThis.fetch = originalFetch
		}
	}
}

/** @param {{ canvasElement: HTMLElement }} context */
async function selectSample({ canvasElement }) {
	const input = canvasElement.querySelector('input[type="file"]')
	if (!(input instanceof HTMLInputElement)) throw new Error('Missing uploader file input')
	const transfer = new DataTransfer()
	transfer.items.add(new File(['<svg/>'], 'sample.svg', { type: 'image/svg+xml' }))
	input.files = transfer.files
	input.dispatchEvent(new Event('change', { bubbles: true }))
}

export const Uploading = {
	args: Empty.args,
	tags: ['!autodocs'],
	beforeEach: mockUpload('loading'),
	play: selectSample
}

export const FailedReplacement = {
	args: WithImage.args,
	tags: ['!autodocs'],
	beforeEach: mockUpload('error'),
	play: selectSample
}
