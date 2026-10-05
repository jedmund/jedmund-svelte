<script lang="ts">
	type LyricsView = 'a' | 'both' | 'b'

	let {
		langA,
		langB,
		onchange
	}: { langA: string; langB: string; onchange: (view: LyricsView) => void } = $props()

	let view = $state<LyricsView>('both')

	// Each language names itself (日本語 / English), falling back to the raw tag.
	const label = (lang: string): string => {
		try {
			return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang.toUpperCase()
		} catch {
			return lang.toUpperCase()
		}
	}

	const options = $derived<{ value: LyricsView; label: string; lang?: string }[]>([
		{ value: 'a', label: label(langA), lang: langA },
		{ value: 'both', label: 'Both' },
		{ value: 'b', label: label(langB), lang: langB }
	])

	function select(next: LyricsView) {
		view = next
		onchange(next)
	}
</script>

<div class="lyrics-toggle" role="group" aria-label="Lyrics language">
	{#each options as option (option.value)}
		<button
			type="button"
			lang={option.lang}
			aria-pressed={view === option.value}
			onclick={() => select(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style lang="scss">
	// Echoes the site nav's SegmentedController: white pill track, gray active pill
	.lyrics-toggle {
		display: inline-flex;
		gap: 2px;
		padding: $unit-half;
		border-radius: 100px;
		background: $gray-100;
		box-shadow: 0 1px 3px $shadow-light;
	}

	button {
		padding: $unit-half $unit-2x;
		border: none;
		border-radius: 100px;
		background: none;
		color: $gray-40;
		font-family: inherit;
		font-size: $font-size-extra-small;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;

		&:hover {
			color: $text-color;
		}

		&[aria-pressed='true'] {
			background: $gray-90;
			color: $text-color;
		}
	}
</style>
