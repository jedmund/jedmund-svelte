<script lang="ts">
	import { onMount } from 'svelte'
	import Input from './Input.svelte'

	type Props = {
		post: any
		postType: 'post' | 'essay'
		slug: string
		excerpt: string
		tags: string[]
		tagInput: string
		triggerElement: HTMLElement
		onAddTag: () => void
		onRemoveTag: (tag: string) => void
		onDelete: () => void
	}

	let {
		post,
		postType,
		slug = $bindable(),
		excerpt = $bindable(),
		tags = $bindable(),
		tagInput = $bindable(),
		triggerElement,
		onAddTag,
		onRemoveTag,
		onDelete
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
		popoverElement.style.zIndex = '1000'
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

<div class="metadata-popover" bind:this={popoverElement}>
	<div class="popover-content">
		<h3>Post Settings</h3>

		<Input 
			label="Slug" 
			bind:value={slug} 
			placeholder="post-slug"
		/>

		{#if postType === 'essay'}
			<Input 
				type="textarea"
				label="Excerpt" 
				bind:value={excerpt}
				rows={3}
				placeholder="Brief description..."
			/>
		{/if}

		<div class="tags-section">
			<Input 
				label="Tags"
				bind:value={tagInput}
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
				placeholder="Add tags..."
			/>
			<button type="button" onclick={onAddTag} class="add-tag-btn">Add</button>
			
			{#if tags.length > 0}
				<div class="tags">
					{#each tags as tag}
						<span class="tag">
							{tag}
							<button onclick={() => onRemoveTag(tag)}>×</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="metadata">
			<p>Created: {new Date(post.createdAt).toLocaleString()}</p>
			<p>Updated: {new Date(post.updatedAt).toLocaleString()}</p>
			{#if post.publishedAt}
				<p>Published: {new Date(post.publishedAt).toLocaleString()}</p>
			{/if}
		</div>
	</div>

	<div class="popover-footer">
		<button class="btn btn-danger" onclick={onDelete}>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path
					d="M4 4L12 12M4 12L12 4"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			Delete Post
		</button>
	</div>
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.metadata-popover {
		background: white;
		border: 1px solid $grey-80;
		border-radius: $card-corner-radius;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		min-width: 420px;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		pointer-events: auto;
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
			color: $grey-10;
		}
	}

	.popover-footer {
		padding: $unit-3x;
		border-top: 1px solid $grey-90;
		display: flex;
		justify-content: flex-start;
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
		background: $grey-10;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		cursor: pointer;
		transition: background-color 0.15s ease;

		&:hover {
			background: $grey-20;
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
		background: $grey-80;
		border-radius: 20px;
		font-size: 0.75rem;

		button {
			background: none;
			border: none;
			color: $grey-40;
			cursor: pointer;
			padding: 0;
			font-size: 1rem;
			line-height: 1;

			&:hover {
				color: $grey-10;
			}
		}
	}

	.metadata {
		font-size: 0.75rem;
		color: $grey-40;

		p {
			margin: $unit-half 0;
		}
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-size: 0.925rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: $unit;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		&.btn-small {
			padding: $unit $unit-2x;
			font-size: 0.875rem;
		}

		&.btn-danger {
			background-color: #dc2626;
			color: white;

			&:hover:not(:disabled) {
				background-color: #b91c1c;
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
