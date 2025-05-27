<script lang="ts">
	import { goto } from '$app/navigation'

	let password = $state('')
	let error = $state('')
	let isLoading = $state(false)

	async function handleLogin(e: Event) {
		e.preventDefault()
		error = ''
		isLoading = true

		try {
			// Test the password by making an authenticated request
			const response = await fetch('/api/media', {
				headers: {
					Authorization: `Basic ${btoa(`admin:${password}`)}`
				}
			})

			if (response.ok) {
				// Store auth in localStorage
				localStorage.setItem('admin_auth', btoa(`admin:${password}`))
				goto('/admin')
			} else if (response.status === 401) {
				error = 'Invalid password'
			} else {
				error = 'Something went wrong'
			}
		} catch (err) {
			error = 'Failed to connect to server'
		} finally {
			isLoading = false
		}
	}
</script>

<div class="login-page">
	<div class="login-card">
		<form onsubmit={handleLogin}>
			<input
				type="password"
				bind:value={password}
				placeholder="Admin password..."
				required
				disabled={isLoading}
				class="password-input"
			/>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<button type="submit" disabled={isLoading} class="login-btn">
				{isLoading ? 'Logging in...' : 'Login'}
			</button>
		</form>
	</div>
</div>

<style lang="scss">
	.login-page {
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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

	.password-input {
		padding: $unit-2x $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 50px;
		font-size: 1rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;

		&::placeholder {
			color: $grey-50;
		}

		&:focus {
			outline: none;
			border-color: $grey-40;
			box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
		}

		&:disabled {
			background-color: $grey-90;
			cursor: not-allowed;
			opacity: 0.6;
		}
	}

	.error-message {
		background-color: rgba(255, 0, 0, 0.1);
		color: #d33;
		padding: $unit $unit-2x;
		border-radius: 50px;
		text-align: center;
		font-size: 0.875rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.login-btn {
		padding: $unit-2x $unit-3x;
		background-color: #ff3333;
		color: white;
		border: none;
		border-radius: 50px;
		font-size: 1rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
