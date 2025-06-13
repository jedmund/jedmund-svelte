import { writable, get } from 'svelte/store'

// Global mouse position store
export const mousePosition = writable({ x: 0, y: 0 })

// Initialize mouse tracking
if (typeof window !== 'undefined') {
	// Track mouse position globally
	window.addEventListener('mousemove', (e) => {
		mousePosition.set({ x: e.clientX, y: e.clientY })
	})

	// Also capture initial position if mouse is already over window
	document.addEventListener('DOMContentLoaded', () => {
		// Force a mouse event to get initial position
		const event = new MouseEvent('mousemove', {
			clientX: 0,
			clientY: 0,
			bubbles: true
		})

		// If the mouse is already over the document, this will update
		document.dispatchEvent(event)
	})
}

// Helper function to get current mouse position
export function getCurrentMousePosition() {
	return get(mousePosition)
}
