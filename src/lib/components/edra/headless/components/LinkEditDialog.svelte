<script lang="ts">
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import Check from 'lucide-svelte/icons/check'
	import X from 'lucide-svelte/icons/x'

	// Convert CSS transition durations to milliseconds for Svelte transitions
	const TRANSITION_NORMAL_MS = 200 // $transition-normal: 0.2s

	interface Props {
		x: number
		y: number
		currentUrl: string
		onSave: (url: string) => void
		onCancel: () => void
	}

	let { x, y, currentUrl, onSave, onCancel }: Props = $props()

	let urlInput = $state(currentUrl)
	let inputElement: HTMLInputElement
	let dialogElement: HTMLDivElement

	const isValid = $derived(() => {
		if (!urlInput.trim()) return false
		try {
			new URL(urlInput)
			return true
		} catch {
			// Try with https:// prefix
			try {
				new URL('https://' + urlInput)
				return true
			} catch {
				return false
			}
		}
	})

	function handleSave() {
		if (!isValid) return

		let finalUrl = urlInput.trim()
		// Add https:// if no protocol
		if (!finalUrl.match(/^https?:\/\//)) {
			finalUrl = 'https://' + finalUrl
		}

		onSave(finalUrl)
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && isValid) {
			event.preventDefault()
			handleSave()
		} else if (event.key === 'Escape') {
			event.preventDefault()
			onCancel()
		}
	}

	onMount(() => {
		inputElement?.focus()
		inputElement?.select()
	})
</script>

<div
	bind:this={dialogElement}
	class="link-edit-dialog"
	role="dialog"
	aria-modal="false"
	tabindex="-1"
	style="left: {x}px; top: {y}px;"
	transition:fly={{ y: -10, duration: TRANSITION_NORMAL_MS }}
	onkeydown={handleKeydown}
>
	<div class="dialog-content">
		<input
			bind:this={inputElement}
			type="text"
			bind:value={urlInput}
			placeholder="Enter URL"
			class="url-input"
			class:invalid={urlInput && !isValid}
		/>
		<div class="dialog-actions">
			<button class="action-button save" onclick={handleSave} disabled={!isValid} title="Save">
				<Check />
			</button>
			<button class="action-button cancel" onclick={onCancel} title="Cancel">
				<X />
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.link-edit-dialog {
		position: fixed;
		z-index: 1051;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: $unit-2x;
		outline: none;
		min-width: 300px;
	}

	.dialog-content {
		display: flex;
		gap: $unit;
		align-items: center;
	}

	.url-input {
		flex: 1;
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: 4px;
		font-size: 0.875rem;
		color: $gray-20;
		background: white;
		transition: border-color 0.2s;

		&:focus {
			outline: none;
			border-color: $red-60;
		}

		&.invalid {
			border-color: $red-60;
		}
	}

	.dialog-actions {
		display: flex;
		gap: 4px;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid $gray-85;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		color: $gray-40;

		svg {
			width: 16px;
			height: 16px;
		}

		&:hover:not(:disabled) {
			background-color: $gray-95;
			color: $gray-20;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.save:not(:disabled) {
			color: $red-60;
			border-color: $red-60;

			&:hover {
				background-color: $red-60;
				color: white;
			}
		}

		&.cancel:hover {
			color: $red-60;
			border-color: $red-60;
		}
	}
</style>
