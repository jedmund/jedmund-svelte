<script>
	import { onMount } from 'svelte'
	import { spring } from 'svelte/motion'

	export let SVGComponent
	export let backgroundColor = '#f0f0f0'
	export let maxMovement = 20
	export let smoothness = 0.1
	export let containerHeight = '300px'
	export let bounceStiffness = 0.1
	export let bounceDamping = 0.4

	let container
	let svg
	let isHovering = false
	let animationFrame

	const position = spring(
		{ x: 0, y: 0 },
		{
			stiffness: bounceStiffness,
			damping: bounceDamping
		}
	)

	$: if (svg) {
		svg.style.transform = `translate(calc(-50% + ${$position.x}px), calc(-50% + ${$position.y}px))`
	}

	function handleMouseMove(event) {
		isHovering = true
		const rect = container.getBoundingClientRect()
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top

		const targetX = (x / rect.width - 0.5) * 2 * maxMovement
		const targetY = (y / rect.height - 0.5) * 2 * maxMovement

		position.set({ x: targetX, y: targetY }, { hard: false })
	}

	function handleMouseLeave() {
		isHovering = false
		position.set({ x: 0, y: 0 }, { hard: false })
	}

	function updateSVGPosition() {
		if (isHovering) {
			const currentX = $position.x
			const currentY = $position.y
			position.update((pos) => ({
				x: pos.x + (currentX - pos.x) * smoothness,
				y: pos.y + (currentY - pos.y) * smoothness
			}))
		}

		animationFrame = requestAnimationFrame(updateSVGPosition)
	}

	onMount(() => {
		svg = container.querySelector('svg')
		if (svg) {
			svg.style.position = 'absolute'
			svg.style.left = '50%'
			svg.style.top = '50%'
			svg.style.transform = 'translate(-50%, -50%)'
		}

		updateSVGPosition()

		return () => {
			cancelAnimationFrame(animationFrame)
		}
	})
</script>

<div
	bind:this={container}
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	style="position: relative; overflow: hidden; background-color: {backgroundColor}; height: {containerHeight}; display: flex; justify-content: center; align-items: center;"
>
	<div style="position: relative; width: 100%; height: 100%;">
		<svelte:component this={SVGComponent} />
	</div>
</div>

<style lang="scss">
	div {
		border-radius: $corner-radius;
	}
</style>
