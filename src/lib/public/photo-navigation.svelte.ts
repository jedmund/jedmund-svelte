import { goto } from '$app/navigation'
import { spring } from 'svelte/motion'
import { getCurrentMousePosition } from '$lib/stores/mouse'
import { isAlbum, type PhotoItem } from '$lib/types/photos'
export function createPhotoNavigation(
	options: () => { enabled: boolean; photoItems: PhotoItem[]; currentPhotoId: string | undefined }
) {
	let positionTimer: ReturnType<typeof setTimeout> | undefined
	let removeFirstMove: (() => void) | undefined
	// Hover tracking for arrow buttons
	let isHoveringLeft = $state(false)
	let isHoveringRight = $state(false)

	// Spring stores for smooth button movement
	const leftButtonCoords = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	)

	const rightButtonCoords = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	)

	// Default button positions (will be set once photo loads)
	let defaultLeftX = 0
	let defaultRightX = 0

	// Get previous and next photos (excluding albums)
	function adjacentPhotos() {
		const { photoItems, currentPhotoId } = options()
		if (!photoItems.length || !currentPhotoId) return { prev: null, next: null }

		// Filter out albums - we only want photos
		const photosOnly = photoItems.filter((item) => !isAlbum(item))
		const currentIndex = photosOnly.findIndex((item) => item.id === currentPhotoId)

		if (currentIndex === -1) return { prev: null, next: null }

		return {
			prev: currentIndex > 0 ? photosOnly[currentIndex - 1] : null,
			next: currentIndex < photosOnly.length - 1 ? photosOnly[currentIndex + 1] : null
		}
	}

	// Handle photo navigation
	function navigateToPhoto(item: PhotoItem | null) {
		if (!item) return
		// Extract media ID from item.id (could be 'media-123' or 'photo-123')
		const mediaId = item.id.replace(/^(media|photo)-/, '')
		goto(`/photos/${mediaId}`).catch((error) => console.error('Photo navigation failed:', error))
	}

	function handleKeydown(e: KeyboardEvent) {
		// Arrow key navigation for photos
		if ((e.target as HTMLElement)?.closest('input, textarea, [contenteditable=true]')) return
		if (e.key === 'ArrowLeft' && adjacentPhotos().prev) {
			navigateToPhoto(adjacentPhotos().prev)
		} else if (e.key === 'ArrowRight' && adjacentPhotos().next) {
			navigateToPhoto(adjacentPhotos().next)
		}
	}

	// Swipe navigation (mobile). The photo container uses touch-action:
	// pinch-zoom, so single-finger horizontal swipes reach us; a second
	// finger (pinch) cancels the gesture via the touches-length guard.
	let touchStartX = 0
	let touchStartY = 0
	let touchStartTime = 0
	let touchActive = false

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) {
			touchActive = false
			return
		}
		touchActive = true
		touchStartX = e.touches[0].clientX
		touchStartY = e.touches[0].clientY
		touchStartTime = Date.now()
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!touchActive) return
		touchActive = false

		const dx = e.changedTouches[0].clientX - touchStartX
		const dy = e.changedTouches[0].clientY - touchStartY
		const elapsed = Date.now() - touchStartTime

		// Quick, mostly-horizontal swipes only — taps and scrolls fall through
		if (elapsed > 600) return
		if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return

		if (dx < 0) {
			navigateToPhoto(adjacentPhotos().next)
		} else {
			navigateToPhoto(adjacentPhotos().prev)
		}
	}

	// Set default button positions when component mounts
	$effect(() => {
		if (!options().enabled) return

		// Wait for DOM to update and image to load
		const checkAndSetPositions = () => {
			const pageContainer = document.querySelector('.photo-page') as HTMLElement
			const photoImage = pageContainer?.querySelector(
				'.photo-content-wrapper img'
			) as HTMLImageElement | null

			if (photoImage && photoImage.complete) {
				const imageRect = photoImage.getBoundingClientRect()
				const pageRect = pageContainer.getBoundingClientRect()

				// Calculate default positions relative to the image
				// Add 24px (half button width) since we're using translate(-50%, -50%)
				defaultLeftX = imageRect.left - pageRect.left - 24 - 16 // half button width + gap
				defaultRightX = imageRect.right - pageRect.left + 24 + 16 // half button width + gap

				// Set initial positions at the vertical center of the image
				const centerY = imageRect.top - pageRect.top + imageRect.height / 2
				leftButtonCoords.set({ x: defaultLeftX, y: centerY }, { hard: true })
				rightButtonCoords.set({ x: defaultRightX, y: centerY }, { hard: true })

				// Check if mouse is already in a hover zone
				// Small delay to ensure mouse store is initialized
				positionTimer = setTimeout(() => {
					checkInitialMousePosition(pageContainer, imageRect, pageRect)
				}, 10)
			} else {
				// If image not loaded yet, try again
				positionTimer = setTimeout(checkAndSetPositions, 50)
			}
		}

		checkAndSetPositions()
		return () => {
			clearTimeout(positionTimer)
			removeFirstMove?.()
		}
	})

	// Check mouse position on load
	function checkInitialMousePosition(
		pageContainer: HTMLElement,
		imageRect: DOMRect,
		pageRect: DOMRect
	) {
		// Get current mouse position from store
		const currentPos = getCurrentMousePosition()

		// If no mouse position tracked yet, try to trigger one
		if (currentPos.x === 0 && currentPos.y === 0) {
			// Set up a one-time listener for the first mouse move
			const handleFirstMove = (e: MouseEvent) => {
				const x = e.clientX
				const mouseX = e.clientX - pageRect.left
				const mouseY = e.clientY - pageRect.top

				// Check if mouse is in hover zones
				if (x < imageRect.left) {
					isHoveringLeft = true
					leftButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
				} else if (x > imageRect.right) {
					isHoveringRight = true
					rightButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
				}

				// Remove the listener
				window.removeEventListener('mousemove', handleFirstMove)
			}

			removeFirstMove?.()
			window.addEventListener('mousemove', handleFirstMove, { once: true })
			removeFirstMove = () => window.removeEventListener('mousemove', handleFirstMove)
			return
		}

		// We have a mouse position, check if it's in a hover zone
		const x = currentPos.x
		const mouseX = currentPos.x - pageRect.left
		const mouseY = currentPos.y - pageRect.top

		// Store client coordinates for scroll updates
		lastClientX = currentPos.x
		lastClientY = currentPos.y

		// Check if mouse is in hover zones
		if (x < imageRect.left) {
			isHoveringLeft = true
			leftButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
		} else if (x > imageRect.right) {
			isHoveringRight = true
			rightButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
		}
	}

	// Store last mouse client position for scroll updates
	let lastClientX = 0
	let lastClientY = 0

	// Update button positions during scroll
	function handleScroll() {
		if (!isHoveringLeft && !isHoveringRight) return

		const pageContainer = document.querySelector('.photo-page') as HTMLElement
		if (!pageContainer) return

		// Use last known mouse position (which is viewport-relative)
		// and recalculate relative to the page container's new position
		const pageRect = pageContainer.getBoundingClientRect()
		const mouseX = lastClientX - pageRect.left
		const mouseY = lastClientY - pageRect.top

		// Update button positions
		if (isHoveringLeft) {
			leftButtonCoords.set({ x: mouseX, y: mouseY })
		}

		if (isHoveringRight) {
			rightButtonCoords.set({ x: mouseX, y: mouseY })
		}
	}

	// Mouse tracking for hover areas
	function handleMouseMove(event: MouseEvent) {
		const pageContainer = event.currentTarget as HTMLElement
		const photoWrapper = pageContainer.querySelector('.photo-content-wrapper') as HTMLElement

		if (!photoWrapper) return

		// Get the actual image element inside PhotoView
		const photoImage = photoWrapper.querySelector('img') as HTMLElement
		if (!photoImage) return

		const pageRect = pageContainer.getBoundingClientRect()
		const photoRect = photoImage.getBoundingClientRect()

		const x = event.clientX
		const mouseX = event.clientX - pageRect.left
		const mouseY = event.clientY - pageRect.top

		// Store last mouse position for scroll updates
		lastClientX = event.clientX
		lastClientY = event.clientY

		// Check if mouse is in the left or right margin (outside the photo)
		const wasHoveringLeft = isHoveringLeft
		const wasHoveringRight = isHoveringRight

		isHoveringLeft = x < photoRect.left
		isHoveringRight = x > photoRect.right

		// Calculate image center Y position
		const imageCenterY = photoRect.top - pageRect.top + photoRect.height / 2

		// Update button positions
		if (isHoveringLeft) {
			leftButtonCoords.set({ x: mouseX, y: mouseY })
		} else if (wasHoveringLeft && !isHoveringLeft) {
			// Reset left button to default
			leftButtonCoords.set({ x: defaultLeftX, y: imageCenterY })
		}

		if (isHoveringRight) {
			rightButtonCoords.set({ x: mouseX, y: mouseY })
		} else if (wasHoveringRight && !isHoveringRight) {
			// Reset right button to default
			rightButtonCoords.set({ x: defaultRightX, y: imageCenterY })
		}
	}

	function handleMouseLeave() {
		isHoveringLeft = false
		isHoveringRight = false

		// Reset buttons to default positions
		const pageContainer = document.querySelector('.photo-page') as HTMLElement
		const photoImage = pageContainer?.querySelector('.photo-content-wrapper img') as HTMLElement

		if (photoImage && pageContainer) {
			const imageRect = photoImage.getBoundingClientRect()
			const pageRect = pageContainer.getBoundingClientRect()
			const centerY = imageRect.top - pageRect.top + imageRect.height / 2

			leftButtonCoords.set({ x: defaultLeftX, y: centerY })
			rightButtonCoords.set({ x: defaultRightX, y: centerY })
		}
	}

	// Set up keyboard and scroll listeners
	$effect(() => {
		window.addEventListener('keydown', handleKeydown)
		window.addEventListener('scroll', handleScroll)

		// On mobile, ensure viewport allows zooming
		const isMobile = 'ontouchstart' in window && window.innerWidth <= 768
		const viewport = document.querySelector('meta[name="viewport"]')
		const previousViewport = viewport?.getAttribute('content')
		if (isMobile) {
			if (viewport) {
				viewport.setAttribute(
					'content',
					'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
				)
			}
		}

		return () => {
			window.removeEventListener('keydown', handleKeydown)
			window.removeEventListener('scroll', handleScroll)

			// Reset viewport on unmount
			if (isMobile) {
				const viewport = document.querySelector('meta[name="viewport"]')
				if (viewport) {
					if (previousViewport === null || previousViewport === undefined)
						viewport.removeAttribute('content')
					else viewport.setAttribute('content', previousViewport)
				}
			}
		}
	})
	return {
		leftButtonCoords,
		rightButtonCoords,
		adjacentPhotos,
		navigateToPhoto,
		handleTouchStart,
		handleTouchEnd,
		handleMouseMove,
		handleMouseLeave,
		get isHoveringLeft() {
			return isHoveringLeft
		},
		get isHoveringRight() {
			return isHoveringRight
		}
	}
}
