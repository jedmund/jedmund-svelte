<script lang="ts">
	import { goto } from '$app/navigation'
	import UniverseComposer from './UniverseComposer.svelte'
	import Button from './Button.svelte'
	import ChevronDownIcon from '$icons/chevron-down.svg?raw'

	let isOpen = $state(false)
	let buttonRef: HTMLElement
	let showComposer = $state(false)
	let selectedType = $state<'post' | 'essay'>('post')

	const postTypes = [
		{ value: 'essay', label: 'Essay' },
		{ value: 'post', label: 'Post' }
	]

	function handleSelection(type: string) {
		isOpen = false

		if (type === 'essay') {
			// Essays go straight to the full page
			goto('/admin/universe/compose?type=essay')
		} else if (type === 'post') {
			// Posts open in modal
			selectedType = 'post'
			showComposer = true
		}
	}

	function handleComposerClose() {
		showComposer = false
	}

	function handleComposerSaved() {
		showComposer = false
		// Reload posts - in a real app, you'd emit an event to parent
		window.location.reload()
	}

	function handleClickOutside(event: MouseEvent) {
		if (!buttonRef?.contains(event.target as Node)) {
			isOpen = false
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})
</script>

<div class="dropdown-container">
	<Button
		bind:this={buttonRef}
		variant="primary"
		size="large"
		onclick={(e) => {
			e.stopPropagation()
			isOpen = !isOpen
		}}
		iconPosition="right"
	>
		New Post
		{#snippet icon()}
			<div class="chevron">
				{@html ChevronDownIcon}
			</div>
		{/snippet}
	</Button>

	{#if isOpen}
		<div class="dropdown-menu">
			{#each postTypes as type}
				<Button
					variant="ghost"
					onclick={() => handleSelection(type.value)}
					class="dropdown-item"
					fullWidth
					pill={false}
				>
					{#snippet icon()}
						<div class="dropdown-icon">
							{#if type.value === 'essay'}
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path
										d="M3 5C3 3.89543 3.89543 3 5 3H11L17 9V15C17 16.1046 16.1046 17 15 17H5C3.89543 17 3 16.1046 3 15V5Z"
										stroke="currentColor"
										stroke-width="1.5"
									/>
									<path d="M11 3V9H17" stroke="currentColor" stroke-width="1.5" />
									<path
										d="M7 13H13"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
									<path
										d="M7 10H13"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
								</svg>
							{:else if type.value === 'post'}
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path
										d="M4 3C2.89543 3 2 3.89543 2 5V11C2 12.1046 2.89543 13 4 13H6L8 16V13H13C14.1046 13 15 12.1046 15 11V5C15 3.89543 14.1046 3 13 3H4Z"
										stroke="currentColor"
										stroke-width="1.5"
									/>
									<path
										d="M5 7H12"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
									<path
										d="M5 9H10"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
								</svg>
							{/if}
						</div>
					{/snippet}
					<span class="dropdown-label">{type.label}</span>
				</Button>
			{/each}
		</div>
	{/if}
</div>

<UniverseComposer
	bind:isOpen={showComposer}
	initialPostType={selectedType}
	on:close={handleComposerClose}
	on:saved={handleComposerSaved}
	on:switch-to-essay
/>

<style lang="scss">
	@import '$styles/variables.scss';

	.dropdown-container {
		position: relative;
	}

	.chevron {
		transition: transform 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit);
		right: 0;
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit-2x;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		min-width: 220px;
		z-index: 100;
		overflow: hidden;
	}

	// Override Button component styles for dropdown items
	:global(.dropdown-item) {
		justify-content: flex-start;
		text-align: left;
		padding: $unit-2x $unit-3x;
		border-radius: 0;
	}

	.dropdown-icon {
		color: $grey-40;
		display: flex;
		align-items: center;
		flex-shrink: 0;

		svg {
			width: 20px;
			height: 20px;
		}
	}

	.dropdown-label {
		font-size: 0.925rem;
		font-weight: 500;
		color: $grey-10;
	}
</style>
