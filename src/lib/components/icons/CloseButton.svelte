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
	<path
		d="M18 6L6 18M6 6l12 12"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
