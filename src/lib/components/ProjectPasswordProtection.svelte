<script lang="ts">
	import type { Snippet } from 'svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import BackButton from './BackButton.svelte'

	interface Props {
		projectId: number
		projectSlug: string
		projectType?: 'work' | 'labs'
		onUnlocked?: () => void | Promise<void>
		children?: Snippet
	}

	let { projectId, projectSlug, projectType = 'work', onUnlocked, children }: Props = $props()

	let password = $state('')
	let error = $state('')
	let isLoading = $state(false)

	async function handleSubmit() {
		if (!password.trim()) {
			error = 'Please enter a password'
			return
		}

		isLoading = true
		error = ''

		try {
			const response = await fetch(`/api/projects/${projectId}/unlock`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
				credentials: 'same-origin'
			})

			if (response.ok) {
				await onUnlocked?.()
			} else {
				error = 'Incorrect password. Please try again.'
				password = ''
			}
		} catch {
			error = 'Something went wrong. Please try again.'
		}

		isLoading = false
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit()
		}
	}
</script>

{#snippet passwordHeader()}
		<div class="password-header">
			<div class="lock-icon">
				<svg
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M18 11H6C5.45 11 5 11.45 5 12V19C5 19.55 5.45 20 6 20H18C18.55 20 19 19.55 19 19V12C19 11.45 18.55 11 18 11Z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
			<h1>This project is password protected</h1>
			<p>Please enter the password to view this project.</p>
		</div>
	{/snippet}

	{#snippet passwordContent()}
		<div class="password-content">
			<div class="form-wrapper">
				<div class="input-group">
					<input
						type="password"
						bind:value={password}
						placeholder="Enter password"
						class="password-input"
						class:error
						onkeypress={handleKeyPress}
						disabled={isLoading}
					/>
					<Button
						variant="primary"
						onclick={handleSubmit}
						disabled={isLoading || !password.trim()}
						class="submit-button"
					>
						{isLoading ? 'Checking...' : 'Access Project'}
					</Button>
				</div>

				{#if error}
					<div class="error-message">{error}</div>
				{/if}
			</div>

			<div class="back-link-wrapper">
				{#if projectType === 'labs'}
					<BackButton href="/labs" label="Back to Labs" />
				{:else}
					<BackButton href="/" label="Back to projects" />
				{/if}
			</div>
		</div>
	{/snippet}

{@render passwordHeader()}
{@render passwordContent()}

<style lang="scss">
	.password-header {
		text-align: center;
		width: 100%;

		.lock-icon {
			color: $gray-40;
			margin-bottom: $unit-3x;

			svg {
				display: block;
				margin: 0 auto;
			}
		}

		h1 {
			font-size: 2rem;
			font-weight: 600;
			color: $gray-10;
			margin: 0 0 $unit-2x;

			@include breakpoint('phone') {
				font-size: 1.5rem;
			}
		}

		p {
			color: $gray-40;
			margin: 0;
			line-height: 1.5;
			font-size: 1rem;
		}
	}

	.password-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		gap: $unit-4x;

		.form-wrapper {
			width: 100%;
			max-width: 400px;
		}

		.input-group {
			display: flex;
			flex-direction: column;
			gap: $unit-2x;
			margin-bottom: $unit-2x;

			@include breakpoint('tablet') {
				flex-direction: row;
			}
		}

		.password-input {
			flex: 1;
			padding: $unit-2x;
			border: 1px solid $gray-80;
			border-radius: $unit;
			font-size: 1rem;
			transition:
				border-color 0.2s ease,
				box-shadow 0.2s ease;

			&:focus {
				outline: none;
				border-color: $blue-50;
				box-shadow: 0 0 0 3px rgba(20, 130, 193, 0.1);
			}

			&.error {
				border-color: $red-50;
				box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
			}

			&:disabled {
				background: $gray-95;
				color: $gray-60;
				cursor: not-allowed;
			}
		}

		:global(.submit-button) {
			min-width: 140px;
		}

		.error-message {
			font-size: 0.875rem;
			color: $red-50;
			text-align: left;
			margin: 0;
		}

		.back-link-wrapper {
			border-top: 1px solid $gray-90;
			padding-top: $unit-3x;
			text-align: center;
			width: 100%;
		}
	}
</style>
