<script lang="ts">
	import { icons } from 'lucide-svelte'

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		props: Record<string, any>
	}

	const { props }: Props = $props()

	let scrollContainer = $state<HTMLElement | null>(null)

	let selectedGroupIndex = $state<number>(0)
	let selectedCommandIndex = $state<number>(0)

	const items = $derived.by(() => props.items)

	$effect(() => {
		if (items) {
			selectedGroupIndex = 0
			selectedCommandIndex = 0
		}
	})

	$effect(() => {
		const activeItem = document.getElementById(`${selectedGroupIndex}-${selectedCommandIndex}`)
		if (activeItem !== null && scrollContainer !== null) {
			const offsetTop = activeItem.offsetTop
			const offsetHeight = activeItem.offsetHeight
			scrollContainer.scrollTop = offsetTop - offsetHeight
		}
	})

	const selectItem = (groupIndex: number, commandIndex: number) => {
		const command = props.items[groupIndex].commands[commandIndex]
		props.command(command)
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'j') || e.key === 'Tab') {
			e.preventDefault()
			if (!props.items.length) {
				return false
			}
			const commands = props.items[selectedGroupIndex].commands
			let newCommandIndex = selectedCommandIndex + 1
			let newGroupIndex = selectedGroupIndex
			if (commands.length - 1 < newCommandIndex) {
				newCommandIndex = 0
				newGroupIndex = selectedGroupIndex + 1
			}

			if (props.items.length - 1 < newGroupIndex) {
				newGroupIndex = 0
			}
			selectedCommandIndex = newCommandIndex
			selectedGroupIndex = newGroupIndex
			return true
		}

		if (e.key === 'ArrowUp' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
			e.preventDefault()
			if (!props.items.length) {
				return false
			}
			let newCommandIndex = selectedCommandIndex - 1
			let newGroupIndex = selectedGroupIndex
			if (newCommandIndex < 0) {
				newGroupIndex = selectedGroupIndex - 1
				newCommandIndex = props.items[newGroupIndex]?.commands.length - 1 || 0
			}
			if (newGroupIndex < 0) {
				newGroupIndex = props.items.length - 1
				newCommandIndex = props.items[newGroupIndex].commands.length - 1
			}
			selectedCommandIndex = newCommandIndex
			selectedGroupIndex = newGroupIndex
			return true
		}

		if (e.key === 'Enter') {
			e.preventDefault()
			if (!props.items.length || selectedGroupIndex === -1 || selectedCommandIndex === -1) {
				return false
			}
			selectItem(selectedGroupIndex, selectedCommandIndex)
			return true
		}
		return false
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if items.length}
	<div bind:this={scrollContainer} class="slash-command-menu">
		{#each items as grp, groupIndex}
			<div class="slash-command-group">
				<span class="slash-command-group-title">{grp.title}</span>

				{#each grp.commands as command, commandIndex}
					{@const Icon = icons[command.iconName]}
					{@const isActive =
						selectedGroupIndex === groupIndex && selectedCommandIndex === commandIndex}
					<button
						id={`${groupIndex}-${commandIndex}`}
						class="slash-command-item"
						class:active={isActive}
						onclick={() => selectItem(groupIndex, commandIndex)}
					>
						<Icon class="slash-command-icon" />
						<span class="slash-command-label">{command.label}</span>
					</button>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.slash-command-menu {
		position: absolute;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		max-height: min(80vh, 320px);
		width: 240px;
		overflow: auto;
		z-index: $z-index-modal;
		padding: $unit-half;
	}

	.slash-command-group {
		&:not(:first-child) {
			margin-top: $unit-half;
			padding-top: $unit-half;
			border-top: 1px solid $gray-90;
		}
	}

	.slash-command-group-title {
		display: block;
		padding: $unit $unit-2x $unit-half;
		font-size: $font-size-extra-small;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: $gray-50;
		user-select: none;
	}

	.slash-command-item {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
		padding: $unit $unit-2x;
		background: none;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		color: $gray-20;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		margin: $unit-3px 0;

		&:hover {
			background-color: $gray-95;
		}

		&.active {
			background-color: $gray-90;
			color: $gray-10;
		}

		&:active {
			transform: scale(0.98);
		}
	}

	.slash-command-icon {
		width: $unit-2x;
		height: $unit-2x;
		flex-shrink: 0;
		opacity: 0.7;
		transition: opacity 0.15s ease;

		.slash-command-item:hover & {
			opacity: 1;
		}

		.slash-command-item.active & {
			opacity: 1;
		}
	}

	.slash-command-label {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Scrollbar styling */
	.slash-command-menu::-webkit-scrollbar {
		width: 6px;
	}

	.slash-command-menu::-webkit-scrollbar-track {
		background: transparent;
	}

	.slash-command-menu::-webkit-scrollbar-thumb {
		background: $gray-85;
		border-radius: 3px;

		&:hover {
			background: $gray-70;
		}
	}
</style>
