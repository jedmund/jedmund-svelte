<script lang="ts">
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import type { ProjectFormData } from '$lib/types/project'

	interface Props {
		formData: ProjectFormData
		logoUploadInProgress: boolean
		onLogoUpload: (event: Event) => void
		onRemoveLogo: () => void
	}

	let { formData = $bindable(), logoUploadInProgress, onLogoUpload, onRemoveLogo }: Props = $props()
</script>

<div class="form-section">
	<h2>Branding</h2>

	<FormFieldWrapper 
		label="Logo" 
		helpText="SVG logo for project thumbnail (max 500KB)"
	>
		<div class="logo-upload-wrapper">
			{#if formData.logoUrl}
				<div class="logo-preview">
					<img src={formData.logoUrl} alt="Project logo" />
					<button 
						type="button" 
						class="remove-logo" 
						onclick={onRemoveLogo}
						aria-label="Remove logo"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</button>
				</div>
			{:else}
				<label class="logo-upload-placeholder">
					<input 
						type="file" 
						accept="image/svg+xml"
						onchange={onLogoUpload}
						disabled={logoUploadInProgress}
					/>
					{#if logoUploadInProgress}
						<div class="upload-loading">Uploading...</div>
					{:else}
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
							<rect x="8" y="8" width="24" height="24" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" rx="4"/>
							<path d="M20 16V24M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
						<span>Upload SVG Logo</span>
					{/if}
				</label>
			{/if}
		</div>
	</FormFieldWrapper>
</div>

<style lang="scss">
	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.logo-upload-wrapper {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.logo-preview {
		position: relative;
		width: 120px;
		height: 120px;
		background: $grey-95;
		border: 1px solid $grey-80;
		border-radius: $unit-2x;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;

		img {
			max-width: 80%;
			max-height: 80%;
			object-fit: contain;
		}

		.remove-logo {
			position: absolute;
			top: $unit;
			right: $unit;
			width: 32px;
			height: 32px;
			background: white;
			border: 1px solid $grey-80;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all 0.2s ease;
			opacity: 0;

			&:hover {
				background: $grey-95;
				border-color: $grey-60;
			}
		}

		&:hover .remove-logo {
			opacity: 1;
		}
	}

	.logo-upload-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit;
		width: 200px;
		height: 120px;
		background: $grey-97;
		border: 2px dashed $grey-80;
		border-radius: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;

		input[type="file"] {
			position: absolute;
			opacity: 0;
			width: 100%;
			height: 100%;
			cursor: pointer;
		}

		svg {
			color: $grey-50;
		}

		span {
			font-size: 0.875rem;
			color: $grey-30;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}

		&:hover {
			background: $grey-95;
			border-color: $grey-60;

			svg {
				color: $grey-40;
			}

			span {
				color: $grey-20;
			}
		}

		&:has(input:disabled) {
			cursor: not-allowed;
			opacity: 0.6;
		}
	}

	.upload-loading {
		font-size: 0.875rem;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}
</style>