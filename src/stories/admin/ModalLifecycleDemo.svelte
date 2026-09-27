<script lang="ts">
	import BaseModal from '$lib/components/admin/BaseModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	let open = $state(false)
	let nested = $state(false)
</script>

<Button onclick={() => (open = true)}>Open dialog</Button>
<BaseModal bind:isOpen={open} scale>
	<div class="content">
		<h2>Modal lifecycle</h2>
		<label>Caption <input placeholder="Caption" /></label>
		<Button onclick={() => (nested = true)}>Open nested dialog</Button>
		<Button onclick={() => (open = false)}>Close dialog</Button>
	</div>
</BaseModal>
<BaseModal bind:isOpen={nested} size="small">
	<div class="content">
		<h2>Nested dialog</h2>
		<Button onclick={() => (nested = false)}>Close nested dialog</Button>
	</div>
</BaseModal>

<style lang="scss">
	.content {
		padding: $unit-4x;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}
</style>
