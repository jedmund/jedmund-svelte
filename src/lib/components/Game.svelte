<script lang="ts">
	import { spring } from 'svelte/motion'
	import { parse } from 'tinyduration'

	interface GameProps {
		game?: SerializableGameInfo
	}

	let { game = undefined }: GameProps = $props()

	let isHovering = $state(false)

	const scale = spring(1, {
		stiffness: 0.2,
		damping: 0.145
	})

	$effect(() => {
		if (isHovering) {
			scale.set(1.06)
		} else {
			scale.set(1)
		}
	})

	let hours = $state(0)
	let minutes = $state(0)

	if (game && game.playtime) {
		if (game.platform === 'psn') {
			const d = parse(game.playtime as string)
			hours = d.hours || 0
			minutes = d.minutes || 0
		} else {
			hours = Math.floor((game.playtime as number) / 3600)
			minutes = (game.playtime as number) % 3600
		}
	}

	const url =
		game?.platform === 'steam'
			? `https://store.steampowered.com/app/${game?.id}`
			: `https://store.playstation.com/en-us/concept/${game?.id}/`
</script>

<div class="game">
	{#if game}
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			onmouseenter={() => (isHovering = true)}
			onmouseleave={() => (isHovering = false)}
		>
			<img src={game.coverURL} alt={game.name} style="transform: scale({$scale})" />
			<div class="info">
				<span class="game-name">
					{game.name}
				</span>
				<p class="game-playtime">
					{hours > 0 ? `${hours}h ` : ''}{minutes}m played
				</p>
			</div>
		</a>
	{:else}
		<p>No album provided</p>
	{/if}
</div>

<style lang="scss">
	.game {
		flex-basis: 100%;

		a {
			display: flex;

			flex-direction: column;
			gap: $unit * 1.5;
			text-decoration: none;
			transition: gap 0.125s ease-in-out;

			img {
				border: 1px solid rgba(0, 0, 0, 0.1);
				border-radius: $unit;
				box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
				width: 100%;
				height: auto;
			}

			.info {
				display: flex;
				flex-direction: column;
				gap: $unit-fourth;

				p {
					padding: 0;
					margin: 0;
				}

				.game-name {
					font-size: $font-size;
					font-weight: $font-weight-med;
					color: $accent-color;
				}

				.game-playtime {
					font-size: $font-size-extra-small;
					font-weight: $font-weight-med;
					color: $gray-40;
				}
			}
		}
	}
</style>
