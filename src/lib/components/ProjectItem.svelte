<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'

	interface Props {
		logoUrl: string | null
		backgroundColor: string
		name: string
		slug: string
		description: string
		highlightColor: string
		index?: number
	}

	let {
		logoUrl,
		backgroundColor,
		name,
		slug,
		description,
		highlightColor,
		index = 0
	}: Props = $props()

	const isEven = $derived(index % 2 === 0)

	// Create highlighted description
	const highlightedDescription = $derived(
		description.replace(
			new RegExp(`(${name})`, 'gi'),
			`<span style="color: ${highlightColor};">$1</span>`
		)
	)

	// 3D tilt effect
	let cardElement: HTMLDivElement
	let logoElement: HTMLElement
	let isHovering = $state(false)
	let transform = $state('')
	let svgContent = $state('')

	// Logo bounce effect
	let logoTransform = $state('')
	let velocity = { x: 0, y: 0 }
	let position = { x: 0, y: 0 }
	let animationFrame: number

	const maxMovement = 10
	const bounceDamping = 0.2
	const friction = 0.85

	onMount(async () => {
		// Load SVG content
		if (logoUrl) {
			try {
				const response = await fetch(logoUrl)
				if (response.ok) {
					const text = await response.text()
					const parser = new DOMParser()
					const doc = parser.parseFromString(text, 'image/svg+xml')
					const svgElement = doc.querySelector('svg')
					if (svgElement) {
						svgElement.removeAttribute('width')
						svgElement.removeAttribute('height')
						svgContent = svgElement.outerHTML
					}
				}
			} catch (error) {
				console.error('Failed to load SVG:', error)
			}
		}

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame)
			}
		}
	})

	function updateLogoPosition() {
		velocity.x *= friction
		velocity.y *= friction

		position.x += velocity.x
		position.y += velocity.y

		// Constrain position
		position.x = Math.max(-maxMovement, Math.min(maxMovement, position.x))
		position.y = Math.max(-maxMovement, Math.min(maxMovement, position.y))

		logoTransform = `translate(${position.x}px, ${position.y}px)`

		if (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01) {
			animationFrame = requestAnimationFrame(updateLogoPosition)
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!cardElement || !isHovering) return

		const rect = cardElement.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const centerX = rect.width / 2
		const centerY = rect.height / 2

		// 3D tilt for card
		const rotateX = ((y - centerY) / centerY) * -4
		const rotateY = ((x - centerX) / centerX) * 4
		transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.014, 1.014, 1.014)`

		// Logo movement
		if (logoElement) {
			const logoRect = logoElement.getBoundingClientRect()
			const logoCenterX = logoRect.left + logoRect.width / 2 - rect.left
			const logoCenterY = logoRect.top + logoRect.height / 2 - rect.top

			const deltaX = x - logoCenterX
			const deltaY = y - logoCenterY
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

			if (distance < 100) {
				const force = (100 - distance) / 100
				velocity.x -= (deltaX / distance) * force * bounceDamping
				velocity.y -= (deltaY / distance) * force * bounceDamping

				if (!animationFrame) {
					animationFrame = requestAnimationFrame(updateLogoPosition)
				}
			}
		}
	}

	function handleMouseEnter() {
		isHovering = true
	}

	function handleMouseLeave() {
		isHovering = false
		transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'

		// Reset logo position
		velocity = { x: 0, y: 0 }
		position = { x: 0, y: 0 }
		logoTransform = ''
		if (animationFrame) {
			cancelAnimationFrame(animationFrame)
			animationFrame = 0
		}
	}

	function handleClick() {
		goto(`/work/${slug}`)
	}
</script>

<div
	class="project-item {isEven ? 'even' : 'odd'}"
	bind:this={cardElement}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick()}
	onmousemove={handleMouseMove}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	style="transform: {transform};"
	role="button"
	tabindex="0"
>
	<div class="project-logo" style="background-color: {backgroundColor}">
		{#if svgContent}
			<div bind:this={logoElement} class="logo-svg" style="transform: {logoTransform}">
				{@html svgContent}
			</div>
		{:else if logoUrl}
			<img src={logoUrl} alt="{name} logo" class="logo-image" />
		{/if}
	</div>
	<div class="project-content">
		<p class="project-description">{@html highlightedDescription}</p>
	</div>
</div>

<style lang="scss">
	.project-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-3x;
		background: $grey-100;
		border-radius: $card-corner-radius;
		transition:
			transform 0.15s ease-out,
			box-shadow 0.15s ease-out;
		transform-style: preserve-3d;
		will-change: transform;
		cursor: pointer;

		&:hover {
			box-shadow:
				0 10px 30px rgba(0, 0, 0, 0.1),
				0 1px 8px rgba(0, 0, 0, 0.06);
		}

		&.odd {
			flex-direction: row-reverse;
		}
	}

	.project-logo {
		flex-shrink: 0;
		width: 80px;
		height: 80px;
		border-radius: $unit-2x;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-2x;
		box-sizing: border-box;

		.logo-image {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
		}

		.logo-svg {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			transition: transform 0.15s ease-out;

			:global(svg) {
				width: 48px;
				height: 48px;
			}
		}
	}

	.project-content {
		flex: 1;
		min-width: 0;
	}

	.project-description {
		margin: 0;
		font-size: 1.125rem; // 18px
		line-height: 1.3;
		color: $grey-00;
	}

	@include breakpoint('phone') {
		.project-item {
			flex-direction: column !important;
			gap: $unit-2x;
			padding: $unit-2x;
		}

		.project-logo {
			width: 60px;
			height: 60px;
		}
	}
</style>
