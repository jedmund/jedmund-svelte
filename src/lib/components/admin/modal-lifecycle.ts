interface ModalOptions {
	isOpen: () => boolean
	closeOnEscape: () => boolean
	close: () => void
}

const openModals: HTMLElement[] = []
const focusableSelector =
	'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The topmost dialog owns keyboard focus and restores its opener when it is removed. */
export function modalFocus(node: HTMLElement, options: ModalOptions) {
	const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
	openModals.push(node)
	function focusable() {
		return Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(element) => element.getClientRects().length > 0 && !element.closest('[inert]')
		)
	}
	const frame = requestAnimationFrame(() => {
		if (options.isOpen() && openModals.at(-1) === node && !node.contains(document.activeElement)) {
			;(focusable()[0] ?? node).focus({ preventScroll: true })
		}
	})
	function keydown(event: KeyboardEvent) {
		if (!options.isOpen() || openModals.at(-1) !== node) return
		if (event.key === 'Escape' && options.closeOnEscape()) {
			event.preventDefault()
			event.stopPropagation()
			options.close()
			return
		}
		if (event.key !== 'Tab') return
		const items = focusable()
		const first = items[0] ?? node
		const last = items.at(-1) ?? node
		const active = document.activeElement
		if (
			!node.contains(active) ||
			active === node ||
			(event.shiftKey ? active === first : active === last)
		) {
			event.preventDefault()
			const target = event.shiftKey ? last : first
			target.focus({ preventScroll: true })
		}
	}
	document.addEventListener('keydown', keydown, true)
	return {
		destroy() {
			cancelAnimationFrame(frame)
			document.removeEventListener('keydown', keydown, true)
			const wasTopmost = openModals.at(-1) === node
			const restore =
				node.contains(document.activeElement) || document.activeElement === document.body
			openModals.splice(openModals.indexOf(node), 1)
			if (wasTopmost && restore && opener?.isConnected) opener.focus({ preventScroll: true })
		}
	}
}

let scrollLocks = 0
let restoreScroll: (() => void) | null = null

/** Nested dialogs share one body lock so closing a child cannot unlock its parent. */
export function lockModalScroll() {
	if (scrollLocks++ === 0) {
		const body = document.body
		const saved = {
			position: body.style.position,
			top: body.style.top,
			width: body.style.width,
			overflow: body.style.overflow
		}
		const scrollY = window.scrollY
		Object.assign(body.style, {
			position: 'fixed',
			top: `-${scrollY}px`,
			width: '100%',
			overflow: 'hidden'
		})
		restoreScroll = () => {
			Object.assign(body.style, saved)
			window.scrollTo(0, scrollY)
		}
	}
	let released = false
	return () => {
		if (released) return
		released = true
		if (--scrollLocks === 0) {
			restoreScroll?.()
			restoreScroll = null
		}
	}
}
