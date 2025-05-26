<script lang="ts">
	import SVGHoverEffect from '$components/SVGHoverEffect.svelte'
	import type { SvelteComponent } from 'svelte'

	export let SVGComponent: typeof SvelteComponent
	export let backgroundColor: string
	export let name: string
	export let description: string
	export let highlightColor: string
	export let index: number = 0

	$: isEven = index % 2 === 0
	
	// Create highlighted description
	$: highlightedDescription = description.replace(
		new RegExp(`(${name})`, 'gi'),
		`<span style="color: ${highlightColor};">$1</span>`
	)
	
	// 3D tilt effect
	let cardElement: HTMLDivElement
	let isHovering = false
	let transform = ''
	
	function handleMouseMove(e: MouseEvent) {
		if (!cardElement || !isHovering) return
		
		const rect = cardElement.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top
		
		const centerX = rect.width / 2
		const centerY = rect.height / 2
		
		const rotateX = ((y - centerY) / centerY) * -4 // -4 to 4 degrees
		const rotateY = ((x - centerX) / centerX) * 4 // -4 to 4 degrees
		
		transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.014, 1.014, 1.014)`
	}
	
	function handleMouseEnter() {
		isHovering = true
	}
	
	function handleMouseLeave() {
		isHovering = false
		transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
	}
</script>

<div 
	class="project-item {isEven ? 'even' : 'odd'}"
	bind:this={cardElement}
	on:mousemove={handleMouseMove}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	style="transform: {transform};"
>
	<div class="project-logo">
		<SVGHoverEffect
			{SVGComponent}
			{backgroundColor}
			maxMovement={10}
			containerHeight="80px"
			bounceDamping={0.2}
		/>
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
		transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
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

		:global(.svg-container) {
			width: 80px !important;
			height: 80px !important;
			border-radius: $unit-2x;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		:global(svg) {
			width: 48px !important;
			height: 48px !important;
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

			:global(.svg-container) {
				width: 60px !important;
				height: 60px !important;
			}

			:global(svg) {
				width: 36px !important;
				height: 36px !important;
			}
		}
	}
</style>
