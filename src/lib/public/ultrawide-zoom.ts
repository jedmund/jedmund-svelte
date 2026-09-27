function updateScrollIndicators(modal: HTMLElement) {
	modal.toggleAttribute('data-at-start', modal.scrollLeft <= 0)
	modal.toggleAttribute(
		'data-at-end',
		modal.scrollLeft >= modal.scrollWidth - modal.clientWidth - 1
	)
}

export function observeUltrawideZoom() {
	const registered = new Map<HTMLElement, () => void>()
	const observer = new MutationObserver(() => {
		const overlay = document.querySelector(
			'[data-smiz-overlay], .medium-image-zoom-overlay, [data-rmiz-modal-overlay]'
		)
		const image = document.querySelector<HTMLElement>(
			'[data-smiz-modal] img, .medium-image-zoom-image, [data-rmiz-modal-img]'
		)
		if (!overlay || !image) return
		const modal = image.closest<HTMLElement>('[data-smiz-modal]')
		if (!modal || registered.has(modal)) return
		overlay.classList.add('ultrawide-zoom')
		modal.style.overflow = 'auto'
		modal.style.maxHeight = '90vh'
		image.style.maxHeight = '85vh'
		image.style.height = 'auto'
		image.style.width = 'auto'
		image.style.maxWidth = 'none'
		const onScroll = () => updateScrollIndicators(modal)
		const timer = setTimeout(() => {
			modal.scrollLeft = (modal.scrollWidth - modal.clientWidth) / 2
			updateScrollIndicators(modal)
		}, 50)
		modal.addEventListener('scroll', onScroll)
		registered.set(modal, () => {
			clearTimeout(timer)
			modal.removeEventListener('scroll', onScroll)
			overlay.classList.remove('ultrawide-zoom')
		})
	})
	observer.observe(document.body, { childList: true, subtree: true })
	return () => {
		observer.disconnect()
		registered.forEach((cleanup) => cleanup())
		registered.clear()
	}
}
