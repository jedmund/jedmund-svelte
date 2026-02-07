import { toast as sonnerToast } from 'svelte-sonner'

export interface ToastOptions {
	duration?: number
	position?:
		| 'top-left'
		| 'top-center'
		| 'top-right'
		| 'bottom-left'
		| 'bottom-center'
		| 'bottom-right'
	description?: string
	action?: {
		label: string
		onClick: () => void
	}
	cancel?: {
		label: string
		onClick: () => void
	}
}

const defaultOptions: ToastOptions = {
	duration: 4000,
	position: 'bottom-right'
}

export const toast = {
	success: (message: string, options?: ToastOptions) => {
		return sonnerToast.success(message, {
			...defaultOptions,
			...options
		})
	},

	error: (message: string, options?: ToastOptions) => {
		return sonnerToast.error(message, {
			...defaultOptions,
			...options,
			duration: options?.duration ?? 6000 // Errors show longer by default
		})
	},

	warning: (message: string, options?: ToastOptions) => {
		return sonnerToast.warning(message, {
			...defaultOptions,
			...options
		})
	},

	info: (message: string, options?: ToastOptions) => {
		return sonnerToast.info(message, {
			...defaultOptions,
			...options
		})
	},

	loading: (message: string, options?: ToastOptions) => {
		return sonnerToast.loading(message, {
			...defaultOptions,
			...options
		})
	},

	promise: <T>(
		promise: Promise<T>,
		messages: {
			loading: string
			success: string | ((data: T) => string)
			error: string | ((error: unknown) => string)
		},
		options?: ToastOptions
	) => {
		return sonnerToast.promise(promise, {
			...defaultOptions,
			...options,
			...messages
		})
	},

	dismiss: (toastId?: string | number) => {
		return sonnerToast.dismiss(toastId)
	},

	// Custom toast with full control
	custom: (component: Parameters<typeof sonnerToast.custom>[0], options?: ToastOptions) => {
		return sonnerToast.custom(component, {
			...defaultOptions,
			...options
		})
	}
}
