<script lang="ts">
	import { goto } from '$app/navigation'
	import ArrowLeft from '$icons/arrow-left.svg'

	interface Props {
		href?: string
		label: string
		onclick?: () => void
		class?: string
	}

	let { href, label, onclick, class: className = '' }: Props = $props()

	function handleClick() {
		if (onclick) {
			onclick()
		} else if (href) {
			goto(href)
		} else {
			history.back()
		}
	}
</script>

<button class="back-button {className}" onclick={handleClick} type="button">
	<ArrowLeft class="arrow-icon" />
	<span>{label}</span>
</button>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: $red-60;
		background: none;
		border: none;
		border-radius: $corner-radius-md;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			:global(.arrow-icon) {
				transform: translateX(-3px);
			}
		}

		&:focus {
			outline: none;
			box-shadow: 0 0 0 3px rgba($red-60, 0.2);
		}

		:global(.arrow-icon) {
			width: 16px;
			height: 16px;
			transition: transform 0.2s ease;
		}

		:global(svg) {
			stroke: $red-60;
			fill: none;
			stroke-width: 2px;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}
</style>
