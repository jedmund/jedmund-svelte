<script lang="ts">
	import Input from '$lib/components/admin/Input.svelte'
	import type { PageData } from './$types'

	const { form } = $props<{ form: PageData['form'] | undefined }>()

	let password = $state('')
	const errorMessage = $derived(form?.message ?? null)
</script>

<svelte:head>
	<title>Admin Login @jedmund</title>
</svelte:head>

<div class="login-page">
	<div class="login-card">
		<form method="POST">
			<Input
				type="password"
				label="Password"
				name="password"
				bind:value={password}
				required
				autofocus
				placeholder="Enter password"
				autocomplete="current-password"
			/>

			{#if errorMessage}
				<div class="error-message">{errorMessage}</div>
			{/if}

			<button type="submit" class="login-btn">Login</button>
		</form>
	</div>
</div>

<style lang="scss">
	.login-page {
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.login-card {
		width: 100%;
		max-width: 320px;

		form {
			display: flex;
			flex-direction: column;
			gap: $unit;
		}
	}

	// Input component handles its own styling

	.error-message {
		background-color: rgba(255, 0, 0, 0.1);
		color: #d33;
		padding: $unit $unit-2x;
		border-radius: 50px;
		text-align: center;
		font-size: 0.875rem;
	}

	.login-btn {
		padding: $unit-2x $unit-3x;
		background-color: #ff3333;
		color: white;
		border: none;
		border-radius: 50px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.1s ease;

		&:hover:not(:disabled) {
			background-color: #e62e2e;
			transform: translateY(-1px);
		}

		&:active:not(:disabled) {
			transform: translateY(0);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
			transform: none;
		}
	}
</style>
