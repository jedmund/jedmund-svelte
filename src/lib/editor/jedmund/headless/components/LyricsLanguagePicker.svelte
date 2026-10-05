<script lang="ts">
	import jpFlag from 'flag-icons/flags/4x3/jp.svg?url'
	import usFlag from 'flag-icons/flags/4x3/us.svg?url'

	let {
		value,
		label,
		disabled = false,
		onchange
	}: {
		value: string
		label: string
		disabled?: boolean
		onchange: (lang: string) => void
	} = $props()

	const LANGUAGES = [
		{ tag: 'ja', code: 'JA', name: 'Japanese', flag: jpFlag },
		{ tag: 'en', code: 'EN', name: 'English', flag: usFlag }
	]
</script>

<div class="lyrics-language" role="group" aria-label={label}>
	{#each LANGUAGES as language (language.tag)}
		<button
			type="button"
			title={language.name}
			aria-pressed={value === language.tag}
			{disabled}
			onclick={() => onchange(language.tag)}
		>
			<img src={language.flag} alt="" />
			{language.code}
		</button>
	{/each}
</div>

<style lang="scss">
	.lyrics-language {
		display: inline-flex;
		align-self: flex-start;
		gap: 2px;
		padding: 2px;
		border-radius: $corner-radius-sm;
		background: $gray-90;
	}

	button {
		display: flex;
		align-items: center;
		gap: $unit-half;
		padding: 2px $unit;
		border: none;
		border-radius: calc(#{$corner-radius-sm} - 2px);
		background: none;
		color: $gray-40;
		font-family: inherit;
		font-size: $font-size-extra-small;
		font-weight: 600;
		cursor: pointer;

		&:hover:not(:disabled) {
			color: $text-color;
		}

		&[aria-pressed='true'] {
			background: $white;
			color: $text-color;
			box-shadow: 0 1px 2px $shadow-light;
		}

		&:disabled {
			cursor: default;
		}
	}

	img {
		width: 16px;
		height: 12px;
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
	}
</style>
