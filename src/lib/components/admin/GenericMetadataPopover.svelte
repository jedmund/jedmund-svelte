<script lang="ts">
	import { onMount } from 'svelte'
	import { clickOutside } from '$lib/actions/clickOutside'
	import Input from './Input.svelte'
	import Button from './Button.svelte'

	export interface MetadataField {
		type: 'input' | 'textarea' | 'date' | 'toggle' | 'tags' | 'metadata' | 'custom' | 'section'
		key: string
		label?: string
		placeholder?: string
		rows?: number
		helpText?: string
		component?: unknown // For custom components
		props?: Record<string, unknown> // Additional props for custom components
	}

	export interface MetadataConfig {
		title: string
		fields: MetadataField[]
		deleteButton?: {
			label: string
			action: () => void
		}
	}

	type Props = {
		config: MetadataConfig
		data: Record<string, unknown>
		triggerElement: HTMLElement
		onUpdate?: (key: string, value: unknown) => void
		onAddTag?: () => void
		onRemoveTag?: (tag: string) => void
		onClose?: () => void
	}

	let {
		config,
		data = $bindable(),
		triggerElement,
		onUpdate = () => {},
		onAddTag = () => {},
		onRemoveTag = () => {},
		onClose = () => {}
	}: Props = $props()

	let popoverElement: HTMLDivElement
	let portalTarget: HTMLElement

	function updatePosition() {
		if (!popoverElement || !triggerElement) return

		const triggerRect = triggerElement.getBoundingClientRect()
		const popoverRect = popoverElement.getBoundingClientRect()
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		// Find the AdminPage container to align with its right edge
		const adminPage =
			document.querySelector('.admin-page') || document.querySelector('[data-admin-page]')
		const adminPageRect = adminPage?.getBoundingClientRect()

		// Position below the trigger button
		let top = triggerRect.bottom + 8

		// Align closer to the right edge of AdminPage, with some padding
		let left: number
		if (adminPageRect) {
			// Position to align with AdminPage right edge minus padding
			left = adminPageRect.right - popoverRect.width - 24
		} else {
			// Fallback to viewport-based positioning
			left = triggerRect.right - popoverRect.width
		}

		// Ensure we don't go off-screen horizontally
		if (left < 16) {
			left = 16
		} else if (left + popoverRect.width > viewportWidth - 16) {
			left = viewportWidth - popoverRect.width - 16
		}

		// Check if popover would go off-screen vertically (both top and bottom)
		if (top + popoverRect.height > viewportHeight - 16) {
			// Try positioning above the trigger
			const topAbove = triggerRect.top - popoverRect.height - 8
			if (topAbove >= 16) {
				top = topAbove
			} else {
				// If neither above nor below works, position with maximum available space
				if (triggerRect.top > viewportHeight - triggerRect.bottom) {
					// More space above - position at top of viewport with margin
					top = 16
				} else {
					// More space below - position at bottom of viewport with margin
					top = viewportHeight - popoverRect.height - 16
				}
			}
		}

		// Also check if positioning below would place us off the top (shouldn't happen but be safe)
		if (top < 16) {
			top = 16
		}

		popoverElement.style.position = 'fixed'
		popoverElement.style.top = `${top}px`
		popoverElement.style.left = `${left}px`
		popoverElement.style.zIndex = '1200'
	}

	function handleFieldUpdate(key: string, value: unknown) {
		data[key] = value
		onUpdate(key, value)
	}

	function handleClickOutside(event: CustomEvent<{ target: Node }>) {
		const target = event.detail.target
		// Don't close if clicking inside the trigger button
		if (triggerElement?.contains(target)) {
			return
		}
		onClose()
	}

	onMount(() => {
		// Create portal target
		portalTarget = document.createElement('div')
		portalTarget.style.position = 'absolute'
		portalTarget.style.top = '0'
		portalTarget.style.left = '0'
		portalTarget.style.pointerEvents = 'none'
		document.body.appendChild(portalTarget)

		// Initial positioning
		updatePosition()

		// Update position on scroll/resize
		const handleUpdate = () => updatePosition()
		window.addEventListener('scroll', handleUpdate, true)
		window.addEventListener('resize', handleUpdate)

		return () => {
			window.removeEventListener('scroll', handleUpdate, true)
			window.removeEventListener('resize', handleUpdate)
			if (portalTarget) {
				document.body.removeChild(portalTarget)
			}
		}
	})

	$effect(() => {
		if (popoverElement && portalTarget && triggerElement) {
			portalTarget.appendChild(popoverElement)
			portalTarget.style.pointerEvents = 'auto'
			updatePosition()
		}
	})
</script>

<div
	class="metadata-popover"
	bind:this={popoverElement}
	use:clickOutside
	onclickoutside={handleClickOutside}
>
	<div class="popover-content">
		<h3>{config.title}</h3>

		{#each config.fields as field}
			{#if field.type === 'input'}
				<Input
					label={field.label}
					bind:value={data[field.key]}
					placeholder={field.placeholder}
					helpText={field.helpText}
					onchange={() => handleFieldUpdate(field.key, data[field.key])}
				/>
			{:else if field.type === 'textarea'}
				<Input
					type="textarea"
					label={field.label}
					bind:value={data[field.key]}
					rows={field.rows || 3}
					placeholder={field.placeholder}
					helpText={field.helpText}
					onchange={() => handleFieldUpdate(field.key, data[field.key])}
				/>
			{:else if field.type === 'date'}
				<Input
					type="date"
					label={field.label}
					bind:value={data[field.key]}
					helpText={field.helpText}
					onchange={() => handleFieldUpdate(field.key, data[field.key])}
				/>
			{:else if field.type === 'toggle'}
				<div class="toggle-wrapper">
					<label class="toggle-label">
						<input
							type="checkbox"
							bind:checked={data[field.key]}
							class="toggle-input"
							onchange={() => handleFieldUpdate(field.key, data[field.key])}
						/>
						<span class="toggle-slider"></span>
						<div class="toggle-content">
							<span class="toggle-title">{field.label}</span>
							{#if field.helpText}
								<span class="toggle-description">{field.helpText}</span>
							{/if}
						</div>
					</label>
				</div>
			{:else if field.type === 'tags'}
				<div class="tags-section">
					<Input
						label={field.label}
						bind:value={data.tagInput}
						onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
						placeholder={field.placeholder || 'Add tags...'}
					/>
					<button type="button" onclick={onAddTag} class="add-tag-btn">Add</button>

					{#if data[field.key] && data[field.key].length > 0}
						<div class="tags">
							{#each data[field.key] as tag}
								<span class="tag">
									{tag}
									<button onclick={() => onRemoveTag(tag)}>×</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{:else if field.type === 'metadata'}
				<div class="metadata">
					<p>Created: {new Date(data.createdAt).toLocaleString()}</p>
					<p>Updated: {new Date(data.updatedAt).toLocaleString()}</p>
					{#if data.publishedAt}
						<p>Published: {new Date(data.publishedAt).toLocaleString()}</p>
					{/if}
				</div>
			{:else if field.type === 'section'}
				<div class="section-header">
					<h4>{field.label}</h4>
				</div>
			{:else if field.type === 'custom' && field.component}
				<field.component {...field.props} bind:data />
			{/if}
		{/each}
	</div>

	{#if config.deleteButton}
		<div class="popover-footer">
			<Button variant="danger-text" pill={false} onclick={config.deleteButton.action}>
				<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M4 4L12 12M4 12L12 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{config.deleteButton.label}
			</Button>
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.metadata-popover {
		background: white;
		border: 1px solid $gray-80;
		border-radius: $card-corner-radius;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		min-width: 420px;
		max-width: 480px;
		max-height: calc(100vh - #{$unit-2x * 2});
		display: flex;
		flex-direction: column;
		pointer-events: auto;
		overflow-y: auto;
	}

	.popover-content {
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		h3 {
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0;
			color: $gray-10;
		}
	}

	.popover-footer {
		padding: $unit-3x;
		border-top: 1px solid $gray-90;
		display: flex;
		justify-content: flex-start;
	}

	.section-header {
		margin: $unit-3x 0 $unit 0;

		&:first-child {
			margin-top: 0;
		}

		h4 {
			display: block;
			margin-bottom: $unit;
			font-weight: 500;
			color: $gray-20;
			font-size: 0.925rem;
		}
	}

	.tags-section {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.add-tag-btn {
		align-self: flex-start;
		margin-top: $unit-half;
		padding: $unit $unit-2x;
		background: $gray-10;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		cursor: pointer;
		transition: background-color 0.15s ease;

		&:hover {
			background: $gray-20;
		}
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
		margin-top: $unit;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px $unit-2x;
		background: $gray-80;
		border-radius: 20px;
		font-size: 0.75rem;

		button {
			background: none;
			border: none;
			color: $gray-40;
			cursor: pointer;
			padding: 0;
			font-size: 1rem;
			line-height: 1;

			&:hover {
				color: $gray-10;
			}
		}
	}

	.metadata {
		font-size: 0.75rem;
		color: $gray-40;

		p {
			margin: $unit-half 0;
		}
	}

	.toggle-wrapper {
		.toggle-label {
			display: flex;
			align-items: center;
			gap: $unit-3x;
			cursor: pointer;
			user-select: none;
		}

		.toggle-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;

			&:checked + .toggle-slider {
				background-color: $blue-60;

				&::before {
					transform: translateX(20px);
				}
			}

			&:disabled + .toggle-slider {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.toggle-slider {
			position: relative;
			width: 44px;
			height: 24px;
			background-color: $gray-80;
			border-radius: 12px;
			transition: background-color 0.2s ease;
			flex-shrink: 0;

			&::before {
				content: '';
				position: absolute;
				top: 2px;
				left: 2px;
				width: 20px;
				height: 20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.2s ease;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
			}
		}

		.toggle-content {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.toggle-title {
				font-weight: 500;
				color: $gray-10;
				font-size: 0.875rem;
			}

			.toggle-description {
				font-size: 0.75rem;
				color: $gray-50;
				line-height: 1.4;
			}
		}
	}

	@include breakpoint('phone') {
		.metadata-popover {
			min-width: 280px;
			max-width: calc(100vw - 2rem);
		}
	}
</style>
