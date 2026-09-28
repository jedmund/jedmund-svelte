<script lang="ts">
	import AdminPage from './AdminPage.svelte'
	import FormPageHeader from '$lib/components/admin/forms/FormPageHeader.svelte'
	import StatusDropdown from './StatusDropdown.svelte'
	import UnsavedChangesModal from './UnsavedChangesModal.svelte'
	import Composer from './composer/ComposerCore.svelte'
	import ProjectMetadataForm from './ProjectMetadataForm.svelte'
	import ProjectBrandingForm from './ProjectBrandingForm.svelte'
	import type { Project } from '$lib/types/project'
	import { untrack } from 'svelte'
	import { createProjectForm } from '$lib/components/admin/forms/createProjectForm.svelte'
	interface Props {
		project?: Project | null
		mode: 'create' | 'edit'
	}

	let { project: initialProject = null, mode: initialMode }: Props = $props()
	const form = untrack(() => createProjectForm({ project: initialProject, mode: initialMode }))
</script>

<AdminPage>
	{#snippet header()}
		<FormPageHeader
			title={form.formStore.fields.title || 'Untitled Project'}
			tabs={form.tabOptions}
			bind:activeTab={form.activeTab}
		>
			{#snippet actions()}
				<StatusDropdown
					status={form.formStore.fields.status}
					onSave={(target) => {
						if (form.formStore.fields.status === 'draft' && target !== 'draft' && form.isDirty) {
							form.autoSave.flush().then(
								() => form.handleSave(target),
								() => {
									/* form.autoSave already surfaced the failure via its trigger label */
								}
							)
						} else {
							form.handleSave(target)
						}
					}}
					disabled={form.isSaving}
					isLoading={form.isSaving}
					triggerText={form.formStore.fields.status === 'draft' ? form.autoSaveLabel : undefined}
					primaryLabel={form.primaryLabel}
					altActions={form.altActions}
					viewUrl={form.viewUrl}
				/>
			{/snippet}
		</FormPageHeader>
	{/snippet}

	<div class="admin-container">
		{#if form.isLoading}
			<div class="loading">Loading project...</div>
		{:else}
			<div class="tab-panels">
				<!-- Metadata Panel -->
				<div class="panel content-wrapper" class:active={form.activeTab === 'metadata'}>
					<div class="form-content">
						<form
							onsubmit={(e) => {
								e.preventDefault()
								form.handleSave()
							}}
						>
							<ProjectMetadataForm
								bind:formData={form.formStore.fields}
								validationErrors={form.formStore.validationErrors}
								contentId={form.project?.id}
							/>
						</form>
					</div>
				</div>

				<!-- Branding Panel -->
				<div class="panel content-wrapper" class:active={form.activeTab === 'branding'}>
					<div class="form-content">
						<form
							onsubmit={(e) => {
								e.preventDefault()
								form.handleSave()
							}}
						>
							<ProjectBrandingForm
								bind:formData={form.formStore.fields}
								validationErrors={form.formStore.validationErrors}
							/>
						</form>
					</div>
				</div>

				<!-- Case Study Panel -->
				<div class="panel panel-case-study" class:active={form.activeTab === 'case-study'}>
					<Composer
						bind:data={form.formStore.fields.caseStudyContent}
						placeholder="Write your case study here..."
						minHeight={400}
						autofocus={false}
						variant="full"
					/>
				</div>
			</div>
		{/if}
	</div>
</AdminPage>

<UnsavedChangesModal
	isOpen={form.lifecycle.showUnsavedChangesModal}
	onContinueEditing={form.lifecycle.handleContinueEditing}
	onLeave={form.lifecycle.handleLeaveWithoutSaving}
/>

<style lang="scss">
	.admin-container {
		width: 100%;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.tab-panels {
		position: relative;

		.panel {
			display: none;
			box-sizing: border-box;

			&.active {
				display: block;
			}
		}
	}

	.content-wrapper {
		background: white;
		border-radius: $unit-2x;
		padding: 0;
		width: 100%;
		margin: 0 auto;
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.form-content {
		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.form-content form {
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.panel-case-study {
		background: transparent;
		padding: 0;
		min-height: 80vh;
		margin: 0;
		display: flex;
		flex-direction: column;
		width: 100%;

		@include breakpoint('phone') {
			min-height: 600px;
		}
	}
</style>
