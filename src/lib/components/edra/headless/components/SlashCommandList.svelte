<script lang="ts">
	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		props: Record<string, any>;
	}

	const { props }: Props = $props();

	let scrollContainer = $state<HTMLElement | null>(null);

	let selectedGroupIndex = $state<number>(0);
	let selectedCommandIndex = $state<number>(0);

	const items = $derived.by(() => props.items);

	$effect(() => {
		if (items) {
			selectedGroupIndex = 0;
			selectedCommandIndex = 0;
		}
	});

	$effect(() => {
		const activeItem = document.getElementById(`${selectedGroupIndex}-${selectedCommandIndex}`);
		if (activeItem !== null && scrollContainer !== null) {
			const offsetTop = activeItem.offsetTop;
			const offsetHeight = activeItem.offsetHeight;
			scrollContainer.scrollTop = offsetTop - offsetHeight;
		}
	});

	const selectItem = (groupIndex: number, commandIndex: number) => {
		const command = props.items[groupIndex].commands[commandIndex];
		props.command(command);
	};

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'j') || e.key === 'Tab') {
			e.preventDefault();
			if (!props.items.length) {
				return false;
			}
			const commands = props.items[selectedGroupIndex].commands;
			let newCommandIndex = selectedCommandIndex + 1;
			let newGroupIndex = selectedGroupIndex;
			if (commands.length - 1 < newCommandIndex) {
				newCommandIndex = 0;
				newGroupIndex = selectedGroupIndex + 1;
			}

			if (props.items.length - 1 < newGroupIndex) {
				newGroupIndex = 0;
			}
			selectedCommandIndex = newCommandIndex;
			selectedGroupIndex = newGroupIndex;
			return true;
		}

		if (e.key === 'ArrowUp' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
			e.preventDefault();
			if (!props.items.length) {
				return false;
			}
			let newCommandIndex = selectedCommandIndex - 1;
			let newGroupIndex = selectedGroupIndex;
			if (newCommandIndex < 0) {
				newGroupIndex = selectedGroupIndex - 1;
				newCommandIndex = props.items[newGroupIndex]?.commands.length - 1 || 0;
			}
			if (newGroupIndex < 0) {
				newGroupIndex = props.items.length - 1;
				newCommandIndex = props.items[newGroupIndex].commands.length - 1;
			}
			selectedCommandIndex = newCommandIndex;
			selectedGroupIndex = newGroupIndex;
			return true;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			if (!props.items.length || selectedGroupIndex === -1 || selectedCommandIndex === -1) {
				return false;
			}
			selectItem(selectedGroupIndex, selectedCommandIndex);
			return true;
		}
		return false;
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if items.length}
	<div bind:this={scrollContainer} class="slash-menu">
		{#each items as grp, groupIndex (groupIndex)}
			<div class="slash-menu-group">
				<span class="slash-menu-group-title">{grp.title}</span>

				{#each grp.commands as command, commandIndex (commandIndex)}
					{@const Icon = command.icon}
					{@const isActive =
						selectedGroupIndex === groupIndex && selectedCommandIndex === commandIndex}
					<button
						id={`${groupIndex}-${commandIndex}`}
						class="slash-menu-item"
						class:active={isActive}
						onclick={() => selectItem(groupIndex, commandIndex)}
					>
						<span class="slash-menu-item-icon">
							<Icon size={16} />
						</span>
						<span class="slash-menu-item-label">{command.tooltip}</span>
						{#if command.syntax}
							<span class="slash-menu-item-syntax">{command.syntax}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.slash-menu {
		max-height: min(80vh, 360px);
		width: 280px;
		overflow: auto;
		scroll-behavior: smooth;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-md;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 4px;
	}

	.slash-menu-group {
		&:not(:first-child) {
			border-top: 1px solid $gray-90;
			margin-top: 4px;
			padding-top: 4px;
		}
	}

	.slash-menu-group-title {
		display: block;
		padding: 6px 12px 4px;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
		color: $gray-30;
		letter-spacing: 0.01em;
		user-select: none;
	}

	.slash-menu-item {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		background: none;
		border: none;
		border-radius: $corner-radius-sm;
		cursor: pointer;
		transition: all $transition-fast ease;

		&:hover {
			background: $gray-95;
		}

		&.active {
			background: rgba($red-60, 0.1);
		}
	}

	.slash-menu-item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: $corner-radius-xs;
		background: $gray-95;
		color: $gray-20;
		flex-shrink: 0;
	}

	.slash-menu-item-label {
		flex: 1;
		text-align: left;
		font-size: $font-size-small;
		color: $gray-10;
	}

	.slash-menu-item-syntax {
		font-size: $font-size-extra-small;
		font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
		color: $gray-50;
		flex-shrink: 0;
	}
</style>
