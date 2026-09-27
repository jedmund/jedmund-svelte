import { createSaveQueue } from './save-session'
import { formatSaveStatus } from '$lib/components/admin/forms/auto-save'
import { useFormLifecycle } from '$lib/components/admin/forms/useFormLifecycle.svelte'
import { untrack, onDestroy } from 'svelte'
import { replaceState } from '$app/navigation'
import { api } from '$lib/admin/api'
import { useAutoSave } from '$lib/components/admin/forms/useAutoSave.svelte'
import { toast } from '$lib/stores/toast'
import type { Project, ProjectStatus } from '$lib/types/project'
import { createProjectFormStore } from '$lib/stores/project-form.svelte'
interface Props {
	project?: Project | null
	mode: 'create' | 'edit'
}

export function createProjectForm(options: Props) {
	const { project: initialProject = null, mode: initialMode }: Props = options

	// Capture the starting record once; later saves must not reset unsaved fields.
	const seed = untrack(() => ({ project: initialProject, mode: initialMode }))

	// Local state so we can transition create → edit in place after first save.
	let project = $state(seed.project)
	let mode = $state<'create' | 'edit'>(seed.mode)

	// Form store - centralized state management
	const formStore = createProjectFormStore(seed.project)

	// UI state
	let isLoading = $state(seed.mode === 'edit')
	let hasLoaded = $state(seed.mode === 'create')
	let isSaving = $state(false)
	let activeTab = $state('metadata')

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'branding', label: 'Branding' },
		{ value: 'case-study', label: 'Case Study' }
	]

	// Snapshot dirty tracking — same pattern as PostForm/GardenItemForm. The store's own isDirty would
	// also work, but a local snapshot is simpler to thread through the autosave race fix (capture
	// submittingSnapshot before await, restore on success — mid-save keystrokes stay dirty).
	function snapshot(): string {
		return JSON.stringify(formStore.fields)
	}
	let savedSnapshot = $state<string>(snapshot())
	const isDirty = $derived(snapshot() !== savedSnapshot)

	// Status-specific dropdown labels for project's extra statuses (list-only, password-protected);
	// StatusDropdown handles draft/published defaults itself.
	const altActions = $derived.by(() => {
		const s = formStore.fields.status
		if (s === 'draft' || s === 'published') return undefined
		return [
			{ label: 'Publish', target: 'published' },
			{ label: 'Save as draft', target: 'draft' }
		]
	})

	const primaryLabel = $derived.by(() => {
		const s = formStore.fields.status
		if (s === 'draft' || s === 'published') return undefined
		return 'Save'
	})

	const viewUrl = $derived(
		mode === 'edit' && project?.slug
			? `/${formStore.fields.projectType === 'labs' ? 'labs' : 'work'}/${project.slug}?preview=true`
			: undefined
	)

	// Auto-save runs only for drafts and only after a title is set (the schema requires title; firing
	// before that would just produce 'Save failed' visually and confuse the user).
	const autoSave = useAutoSave({
		enabled: () => formStore.fields.status === 'draft' && formStore.fields.title.trim() !== '',
		isDirty: () => isDirty,
		save: () => handleSave(undefined, { silent: true })
	})

	const autoSaveLabel = $derived(formatSaveStatus(autoSave.state))

	// Initial load effect
	$effect(() => {
		if (project && mode === 'edit' && !hasLoaded) {
			formStore.populateFromProject(project)
			savedSnapshot = snapshot()
			isLoading = false
			hasLoaded = true
		}
	})

	const lifecycle = useFormLifecycle({
		isDirty: () => isDirty,
		canAutoSave: () =>
			formStore.fields.status === 'draft' &&
			formStore.fields.title.trim() !== '' &&
			autoSave.state !== 'conflict',
		flush: () => autoSave.flush(),
		save: () => handleSave()
	})

	let disposed = false
	onDestroy(() => {
		disposed = true
	})

	const saveQueue = createSaveQueue()

	async function handleSave(newStatus?: string, { silent = false } = {}) {
		return saveQueue.runIf(
			() => !disposed && (!silent || formStore.fields.status === 'draft'),
			async () => {
				const saveStatus = (newStatus as ProjectStatus) || formStore.fields.status

				// Strict validation only for explicit user-driven saves. Auto-save never blocks on validation —
				// the form may be partial; the next save attempt will pick up new fields when they're filled in.
				if (!silent && !formStore.validate()) {
					toast.error('Please fix the validation errors')
					return
				}

				// Snapshot what we're about to submit (with saveStatus, even though we haven't applied it
				// locally yet). Don't mutate formStore.fields.status here — if the save fails, we'd be lying
				// to the dropdown about what state the server has.
				const submittingSnapshot = JSON.stringify({ ...formStore.fields, status: saveStatus })

				isSaving = true
				const loadingToastId = silent
					? null
					: toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} project...`)

				try {
					const payload = {
						...formStore.buildPayload(),
						status: saveStatus,
						password: saveStatus === 'password-protected' ? formStore.fields.password : null,
						// Include updatedAt for concurrency control in edit mode
						updatedAt: mode === 'edit' ? project?.updatedAt : undefined
					}

					let savedProject: Project
					if (mode === 'edit') {
						savedProject = (await api.put(`/api/projects/${project?.id}`, payload)) as Project
					} else {
						savedProject = (await api.post('/api/projects', payload)) as Project
					}

					if (loadingToastId) {
						toast.dismiss(loadingToastId)
						toast.success(`Project ${mode === 'edit' ? 'saved' : 'created'} successfully!`)
					}

					// Sync the local project handle so subsequent saves carry the right updatedAt + viewUrl uses
					// the new slug. Don't call formStore.populateFromProject here — that would clobber any
					// keystrokes the user made during the await.
					project = savedProject

					// Apply the status transition only after the server has accepted it.
					formStore.setField('status', saveStatus)

					// Mark the version we actually submitted as saved. Mid-await keystrokes diverge from this
					// snapshot, so isDirty stays true and the next debounce flushes them.
					savedSnapshot = submittingSnapshot

					if (mode === 'create') {
						mode = 'edit'
						if (!disposed) replaceState(`/admin/projects/${savedProject.id}/edit`, {})
					}
				} catch (err) {
					if (loadingToastId) toast.dismiss(loadingToastId)
					const errStatus =
						err && typeof err === 'object' && 'status' in err
							? (err as { status: number }).status
							: undefined
					if (errStatus !== 409 && !silent) {
						toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} project`)
					}
					console.error(err)
					// Only re-throw on the silent (autosave) path — useAutoSave needs the rejection to
					// transition its state machine to 'failed' / 'conflict'. Manual save call sites have
					// already had the error surfaced via toast/console; rethrowing them produces unhandled
					// promise rejections at the fire-and-forget call sites (Cmd+S, form onsubmit, etc).
					if (silent) throw err
				} finally {
					isSaving = false
				}
			}
		)
	}

	return {
		get project() {
			return project
		},
		get formStore() {
			return formStore
		},
		get isLoading() {
			return isLoading
		},
		get isSaving() {
			return isSaving
		},
		get activeTab() {
			return activeTab
		},
		set activeTab(value: typeof activeTab) {
			activeTab = value
		},
		get tabOptions() {
			return tabOptions
		},
		get isDirty() {
			return isDirty
		},
		get altActions() {
			return altActions
		},
		get primaryLabel() {
			return primaryLabel
		},
		get viewUrl() {
			return viewUrl
		},
		get autoSave() {
			return autoSave
		},
		get autoSaveLabel() {
			return autoSaveLabel
		},
		get lifecycle() {
			return lifecycle
		},
		handleSave
	}
}
