<script lang="ts">
	import BaseModal from './BaseModal.svelte'
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
		isOpen = false
	}

	function handleCancel() {
		isOpen = false
		onCancel?.()
	}
</script>

<BaseModal 
	bind:isOpen 
	size="small" 
	onClose={handleCancel}
	class="delete-confirmation-modal"
>
	<div class="modal-body">
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
</BaseModal>

<style lang="scss">
	:global(.delete-confirmation-modal) {
		.modal-body {
			padding: $unit-4x;

			h2 {
				margin: 0 0 $unit-2x;
				font-size: 1.25rem;
				font-weight: 700;
				color: $gray-10;
			}

			p {
				margin: 0 0 $unit-4x;
				color: $gray-20;
				line-height: 1.5;
			}
		}

		.modal-actions {
			display: flex;
			gap: $unit-2x;
			justify-content: flex-end;
		}
	}
</style>