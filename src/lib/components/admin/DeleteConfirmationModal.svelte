<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	interface Props {
		title?: string
		message: string
		confirmText?: string
		cancelText?: string
	}

	let {
		title = 'Delete item?',
		message,
		confirmText = 'Delete',
		cancelText = 'Cancel'
	}: Props = $props()

	const dispatch = createEventDispatcher<{
		confirm: void
		cancel: void
	}>()

	function handleConfirm() {
		dispatch('confirm')
	}

	function handleCancel() {
		dispatch('cancel')
	}

	function handleBackdropClick() {
		dispatch('cancel')
	}
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<h2>{title}</h2>
		<p>{message}</p>
		<div class="modal-actions">
			<button class="btn btn-secondary" onclick={handleCancel}>
				{cancelText}
			</button>
			<button class="btn btn-danger" onclick={handleConfirm}>
				{confirmText}
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: $unit-2x;
		padding: $unit-4x;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);

		h2 {
			margin: 0 0 $unit-2x;
			font-size: 1.25rem;
			font-weight: 700;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}

		p {
			margin: 0 0 $unit-4x;
			color: $grey-20;
			line-height: 1.5;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.modal-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&.btn-secondary {
			background-color: $grey-85;
			color: $grey-20;

			&:hover {
				background-color: $grey-80;
			}
		}

		&.btn-danger {
			background-color: $red-60;
			color: white;

			&:hover {
				background-color: $red-40;
			}
		}
	}
</style>