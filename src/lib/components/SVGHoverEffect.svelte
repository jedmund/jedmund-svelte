<script>
	import { onMount } from 'svelte'
	import { spring } from 'svelte/motion'

	const {
		SVGComponent,
		backgroundColor = '#f0f0f0',
		maxMovement = 20,
		containerHeight = '300px',
		stiffness = 0.15,
		damping = 0.8
	} = $props()

	let container = $state(null)
	let svg = $state(null)

	const position = spring(
		{ x: 0, y: 0 },
		{
			stiffness,
			damping
		}
	)

	$effect(() => {
		if (svg) {
			const { x, y } = $position
			svg.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
		}
	})

	function handleMouseMove(event) {
		const rect = container.getBoundingClientRect()
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top

		position.set({
			x: (x / rect.width - 0.5) * 2 * maxMovement,
			y: (y / rect.height - 0.5) * 2 * maxMovement
		})
	}

	function handleMouseLeave() {
		position.set({ x: 0, y: 0 })
	}

	onMount(() => {
		svg = container.querySelector('svg')
		if (svg) {
			svg.style.position = 'absolute'
			svg.style.left = '50%'
			svg.style.top = '50%'
			svg.style.transform = 'translate(-50%, -50%)'
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
