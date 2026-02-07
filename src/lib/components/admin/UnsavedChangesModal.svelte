<script lang="ts">
	import BaseModal from './BaseModal.svelte'
	import Button from './Button.svelte'

	interface Props {
		isOpen: boolean
		onContinueEditing: () => void
		onLeave: () => void
	}

	let {
		isOpen = $bindable(),
		onContinueEditing,
		onLeave
	}: Props = $props()

	function handleContinueEditing() {
		isOpen = false
		onContinueEditing()
	}

	function handleLeave() {
		isOpen = false
		onLeave()
	}
</script>

<BaseModal
	bind:isOpen
	size="small"
	closeOnBackdrop={false}
	closeOnEscape={false}
	scale={true}
	class="unsaved-changes-modal"
>
	<div class="modal-body">
		<h2>Unsaved Changes</h2>
		<p>You have unsaved changes. Are you sure you want to leave?</p>
		<div class="modal-actions">
			<Button variant="secondary" onclick={handleContinueEditing}>
				Continue Editing
			</Button>
			<Button variant="primary" onclick={handleLeave}>
				Leave Without Saving
			</Button>
		</div>
	</div>
</BaseModal>

<style lang="scss">
	:global(.unsaved-changes-modal) {
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
			justify-content: space-between;
		}
	}
</style>
