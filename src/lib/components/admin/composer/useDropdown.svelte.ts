import type { DropdownPosition } from './types'

export interface UseDropdownOptions {
	triggerRef: HTMLElement | undefined
	isOpen: boolean
	onClose: () => void
	portalClass?: string
}

export function useDropdown(options: UseDropdownOptions) {
	let position = $state<DropdownPosition>({ top: 0, left: 0 })

	// Calculate dropdown position based on trigger element
	function updatePosition() {
		const { triggerRef } = options
		if (triggerRef) {
			const rect = triggerRef.getBoundingClientRect()
			position = {
				top: rect.bottom + 4,
				left: rect.left
			}
		}
	}

	// Toggle dropdown with position update
	function toggle() {
		if (!options.isOpen) {
			updatePosition()
		}
		// The actual toggling is handled by the parent component
	}

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		const { triggerRef, portalClass, onClose } = options

		const isClickInsideTrigger = triggerRef?.contains(target)
		const isClickInsidePortal = portalClass && target.closest(`.${portalClass}`)

		if (!isClickInsideTrigger && !isClickInsidePortal) {
			onClose()
		}
	}

	// Effect to add/remove click listener
	$effect(() => {
		if (options.isOpen) {
			// Small delay to avoid immediate closure
			setTimeout(() => {
				document.addEventListener('click', handleClickOutside)
			}, 0)

			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})

	return {
		position: () => position,
		updatePosition,
		toggle
	}
}
