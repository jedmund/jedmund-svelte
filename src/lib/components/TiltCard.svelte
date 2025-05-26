<script lang="ts">
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

		const rotateX = ((y - centerY) / centerY) * -5 // -4 to 4 degrees
		const rotateY = ((x - centerX) / centerX) * 5 // -4 to 4 degrees

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
	class="tilt-card"
	bind:this={cardElement}
	on:mousemove={handleMouseMove}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	style="transform: {transform};"
>
	<slot />
</div>

<style lang="scss">
	.tilt-card {
		transition:
			transform 0.15s ease-out,
			box-shadow 0.15s ease-out;
		transform-style: preserve-3d;
		will-change: transform;
		cursor: pointer;
		border-radius: $image-corner-radius;
		overflow: hidden;
		
		// Use mask as a fallback for better clipping
		-webkit-mask-image: -webkit-radial-gradient(white, black);
		mask-image: radial-gradient(white, black);

		&:hover {
			box-shadow:
				0 6px 20px rgba(0, 0, 0, 0.1),
				0 1px 8px rgba(0, 0, 0, 0.06);
		}
	}
</style>
