<script lang="ts">
	import { onMount } from 'svelte'

	export let text = 'Hello, Squiggly World!'
	export let frequency = 0.4
	export let amplitude = 1.5
	export let color = '#ff0000'
	export let distance = 3
	export let lineWidth = 1.75

	let textWidth = 0
	let textElement: HTMLHeadingElement
	let squigglyHeight: number

	$: path = generatePath(textWidth, frequency, amplitude, distance)
	$: squigglyHeight = distance + amplitude * 2 + lineWidth

	onMount(() => {
		updateTextWidth()
	})

	function updateTextWidth(): void {
		textWidth = textElement?.getBoundingClientRect().width || 0
	}

	function generatePath(width: number, freq: number, amp: number, dist: number): string {
		if (width === 0) return ''
		const startX = 2
		const endX = width - 2
		const startY = amp * Math.sin(startX * freq) + dist

		let pathData = `M${startX},${startY} `

		for (let x = startX; x <= endX; x++) {
			const y = amp * Math.sin(x * freq) + dist
			pathData += `L${x},${y} `
		}
		return pathData
	}

	$: {
		text // add this as a dependency
		updateTextWidth()
	}
</script>

<div class="squiggly-container" style="padding-bottom: {squigglyHeight}px;">
	<h2 bind:this={textElement} class="squiggly-header" style="color: {color}">{text}</h2>
	<svg
		class="squiggly-underline"
		width={textWidth}
		height={squigglyHeight}
		viewBox="0 0 {textWidth} {squigglyHeight}"
	>
		<path
			d={path}
			fill="none"
			stroke={color}
			stroke-width={lineWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</div>

<style lang="scss">
	.squiggly-header {
		font-size: $font-size;
		font-weight: 400;
		margin-bottom: $unit-fourth;
	}

	.squiggly-container {
		position: relative;
		display: inline-block;
	}

	.squiggly-underline {
		position: absolute;
		left: 0;
		bottom: 0;
	}
</style>
