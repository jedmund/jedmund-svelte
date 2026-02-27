<script lang="ts">
	import HeartIcon from '$icons/heart.svg?component'

	interface Props {
		path: string
	}

	let { path }: Props = $props()

	let pressed = $state(false)
	let busy = $state(false)

	const STORAGE_KEY = '_open_heart'
	const EMOJI = '❤️'

	function getReactions(): string[] {
		if (typeof window === 'undefined') return []
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return []
		return stored.split(',').filter(Boolean)
	}

	function hasReacted(): boolean {
		return getReactions().includes(`${EMOJI}@${path}`)
	}

	function saveReaction() {
		const reactions = getReactions()
		const entry = `${EMOJI}@${path}`
		if (!reactions.includes(entry)) {
			reactions.push(entry)
			localStorage.setItem(STORAGE_KEY, reactions.join(','))
		}
	}

	// Check localStorage on mount
	$effect(() => {
		pressed = hasReacted()
	})

	async function handleClick() {
		if (busy || pressed) return

		busy = true

		try {
			const res = await fetch(`/api/heart/${path}`, {
				method: 'POST',
				body: EMOJI,
				headers: { 'Content-Type': 'text/plain' }
			})

			if (res.ok) {
				saveReaction()
				pressed = true
			}
		} catch {
			// Silently fail — non-critical feature
		} finally {
			busy = false
		}
	}
</script>

<button
	class="heart-button"
	class:pressed
	class:busy
	type="button"
	aria-pressed={pressed}
	aria-busy={busy}
	aria-label="Like this"
	onclick={handleClick}
	disabled={busy || pressed}
>
	<HeartIcon class="heart-icon" />
</button>

<style lang="scss">
	.heart-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: $unit;
		background: none;
		border: none;
		border-radius: $corner-radius-md;
		cursor: pointer;
		color: $gray-70;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			color: $red-60;
			transform: scale(1.1);
		}

		&:focus-visible {
			outline: none;
			box-shadow: 0 0 0 3px rgba($red-60, 0.2);
		}

		&:disabled {
			cursor: default;
		}

		&.pressed {
			color: $red-60;
		}

		&.busy {
			animation: pulse 1s ease-in-out infinite;
		}

		:global(.heart-icon) {
			width: 20px;
			height: 20px;
			display: block;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
