<script lang="ts">
	import Button from './Button.svelte'

	interface Props {
		isOpen: boolean
		title?: string
		message: string
		confirmText?: string
		cancelText?: string
		onConfirm: () => void
		onCancel?: () => void
	}

	let {
		isOpen = $bindable(),
		title = 'Delete item?',
		message,
		confirmText = 'Delete',
		cancelText = 'Cancel',
		onConfirm,
		onCancel
	}: Props = $props()

	function handleConfirm() {
		onConfirm()
	}

	function handleCancel() {
		isOpen = false
		onCancel?.()
	}

	function handleBackdropClick() {
		isOpen = false
		onCancel?.()
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>{title}</h2>
			<p>{message}</p>
			<div class="modal-actions">
				<Button variant="secondary" onclick={handleCancel}>
					{cancelText}
				</Button>
				<Button variant="danger" onclick={handleConfirm}>
					{confirmText}
				</Button>
			</div>
		</div>
	</div>
{/if}

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
		z-index: $z-index-modal;
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
		}

		p {
			margin: 0 0 $unit-4x;
			color: $grey-20;
			line-height: 1.5;
		}
	}

	.modal-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
	}
</style>
