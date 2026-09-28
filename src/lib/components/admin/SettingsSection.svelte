<script lang="ts">
	import Input from './Input.svelte'
	import Textarea from './Textarea.svelte'
	import Button from './Button.svelte'
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'
	import { FIELD_HELP, type SettingsSection } from '$lib/admin/settings/fields'
	import type { SettingMeta, TestResult } from '$lib/admin/settings/session.svelte'
	let {
		section,
		values = $bindable(),
		meta,
		result,
		ontest
	}: {
		section: SettingsSection
		values: Record<string, string>
		meta: Record<string, SettingMeta>
		result?: TestResult
		ontest: (service: string) => void
	} = $props()
	function helpText(key: string) {
		return meta[key]?.source === 'env' ? 'Currently using environment variable' : FIELD_HELP[key]
	}
</script>

<div class="form-section">
	{#if section.title}
		<div class="section-header">
			<h3>{section.title}</h3>
			{#if section.service}
				<div class="test-action">
					{#if result?.status === 'success'}
						<span class="test-result test-success"><CheckIcon />Connected</span>
					{:else if result?.status === 'error'}
						<span class="test-result test-error"><XIcon />{result.message}</span>
					{:else}
						<Button
							variant="secondary"
							buttonSize="small"
							loading={result?.status === 'testing'}
							onclick={() => ontest(section.service!)}>Test Connection</Button
						>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
	{#each section.fields as field (field.key)}
		{#if field.rows}
			<Textarea
				label={field.label}
				bind:value={values[field.key]}
				rows={field.rows}
				helpText={helpText(field.key)}
			/>
		{:else}
			<Input
				label={field.label}
				type={field.type ?? 'text'}
				bind:value={values[field.key]}
				helpText={helpText(field.key)}
				placeholder={field.placeholder}
			/>
		{/if}
	{/each}
</div>

<style lang="scss">
	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin-bottom: $unit-4x;

		h3 {
			margin: 0;
			font-size: $font-size-small;
			font-weight: 600;
			color: $gray-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.test-action {
		display: flex;
		align-items: center;
	}

	.test-result {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		font-size: $font-size-extra-small;
		font-weight: 500;

		:global(svg) {
			width: 14px;
			height: 14px;
		}
	}

	.test-success {
		color: $success-text;
	}

	.test-error {
		color: $error-color;
	}
</style>
