<script lang="ts">
	interface Props {
		size?: number | string
		color?: string
		strokeWidth?: number
		class?: string
	}

	let {
		size = 24,
		color = 'currentColor',
		strokeWidth = 2,
		class: className = ''
	}: Props = $props()
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-hidden="true"
>
	<rect x="9" y="9" width="13" height="13" rx="2" stroke={color} stroke-width={strokeWidth} />
	<path
		d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
		stroke={color}
		stroke-width={strokeWidth}
	/>
</svg>
