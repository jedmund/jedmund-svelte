<script lang="ts">
	import BaseModal from './BaseModal.svelte'
	import Button from './Button.svelte'
	import type { Tag } from '$lib/admin/tag-types'
	let {
		isOpen = $bindable(false),
		targetId = $bindable(null),
		tags,
		onmerge
	}: {
		isOpen?: boolean
		targetId?: number | null
		tags: Tag[]
		onmerge: () => void
	} = $props()
</script>

<!-- Merge Tags Modal -->
<BaseModal bind:isOpen size="medium">
	<div class="modal-content">
		<h2>Merge Tags</h2>
		<p class="modal-description">
			Select which tag to keep. All other selected tags will be merged into it and deleted.
		</p>

		<div class="merge-list">
			{#each tags as tag (tag.id)}
				<label class="merge-option">
					<input type="radio" name="merge-target" value={tag.id} bind:group={targetId} />
					<span class="merge-tag-name">{tag.displayName}</span>
					<span class="merge-tag-count">({tag.usageCount} posts)</span>
				</label>
			{/each}
		</div>

		<div class="modal-actions">
			<Button variant="secondary" onclick={() => (isOpen = false)}>Cancel</Button>
			<Button variant="primary" onclick={onmerge}>Merge Tags</Button>
		</div>
	</div>
</BaseModal>

<style lang="scss">
	.modal-content {
		padding: $unit-4x;

		h2 {
			margin: 0 0 $unit-2x;
			font-size: 1.5rem;
		}

		.modal-description {
			margin: 0 0 $unit-3x;
			color: $gray-40;
			font-size: 0.875rem;
		}
	}

	.modal-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
		margin-top: $unit-4x;
	}

	.merge-list {
		display: flex;
		flex-direction: column;
		gap: $unit;
		margin-bottom: $unit-3x;

		.merge-option {
			display: flex;
			align-items: center;
			gap: $unit;
			padding: $unit $unit-2x;
			border: 1px solid $gray-85;
			border-radius: $corner-radius-sm;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: $gray-95;
			}

			input {
				flex-shrink: 0;
			}

			.merge-tag-name {
				flex: 1;
				font-weight: 500;
			}

			.merge-tag-count {
				color: $gray-60;
				font-size: 0.875rem;
			}
		}
	}
</style>
