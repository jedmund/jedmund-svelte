import { createSaveQueue, acknowledgeField } from './save-session'
import { normalizeContent } from '$lib/components/admin/forms/post-content'
import { formatSaveStatus } from '$lib/components/admin/forms/auto-save'
import { useFormLifecycle } from '$lib/components/admin/forms/useFormLifecycle.svelte'
import { replaceState } from '$app/navigation'
import { onMount, onDestroy } from 'svelte'
import { api } from '$lib/admin/api'
import type { ApiError } from '$lib/admin/response'
import type { JSONContent } from '@tiptap/core'
import type { ApiPost, PostFormTag as Tag } from '$lib/components/admin/forms/post-types'
import { useAutoSave } from '$lib/components/admin/forms/useAutoSave.svelte'
interface Props {
	initialPost?: ApiPost | null
	initialPostType?: 'post' | 'essay'
	initialContent?: JSONContent | null
}

export function createPostForm(options: Props) {
	const { initialPost = null, initialPostType = 'post', initialContent = null }: Props = options

	type PostStatus = 'draft' | 'published' | 'scheduled'

	let id = $state<number | null>(initialPost?.id ?? null)
	let updatedAt = $state<string | null>(initialPost?.updatedAt ?? null)

	let title = $state(initialPost?.title ?? '')
	const postType = $state<'post' | 'essay'>(
		(initialPost?.postType as 'post' | 'essay') || initialPostType
	)
	let status = $state<PostStatus>((initialPost?.status as PostStatus) || 'draft')
	let publishedAt = $state<string | null>(initialPost?.publishedAt ?? null)
	let slug = $state(initialPost?.slug ?? '')
	let slugManuallySet = $state(initialPost !== null)
	let excerpt = $state(initialPost?.excerpt ?? '')
	let syndicationText = $state(initialPost?.syndicationText ?? '')
	let featuredImage = $state(initialPost?.featuredImage ?? '')
	let syndicateBluesky = $state(initialPost?.syndicateBluesky ?? true)
	let syndicateMastodon = $state(initialPost?.syndicateMastodon ?? true)
	let appendLink = $state(initialPost?.appendLink ?? true)
	let content = $state<JSONContent>(
		initialPost
			? normalizeContent(initialPost.content)
			: (initialContent ?? { type: 'doc', content: [] })
	)
	let tags = $state<Tag[]>(initialPost?.tags?.map((pt) => pt.tag) ?? [])

	let saving = $state(false)
	let saveError = $state('')
	let activeTab = $state('content')
	let heartCount = $state<number | undefined>()
	let showDeleteConfirmation = $state(false)

	// Snapshot-based dirty tracking. The $derived only recomputes when one of the read fields changes,
	// and crucially does NOT write any reactive state — so it can't form a feedback loop with the
	// auto-save effect that reads isDirty.
	function snapshot(targetStatus = status) {
		return JSON.stringify([
			title,
			postType,
			targetStatus,
			publishedAt,
			slug,
			excerpt,
			syndicationText,
			featuredImage,
			syndicateBluesky,
			syndicateMastodon,
			appendLink,
			content,
			tags
				.map((t) => t.id)
				.sort()
				.join(',')
		])
	}

	let savedSnapshot = $state<string>(snapshot())

	const postTypeConfig = {
		post: { icon: '💭', label: 'Post', showTitle: false, showContent: true },
		essay: { icon: '📝', label: 'Essay', showTitle: true, showContent: true }
	}
	const config = $derived(postTypeConfig[postType])

	const tabOptions = $derived(
		id === null
			? [
					{ value: 'content', label: 'Content' },
					{ value: 'metadata', label: 'Metadata' }
				]
			: [
					{ value: 'content', label: 'Content' },
					{ value: 'metadata', label: 'Metadata' },
					{ value: 'syndication', label: 'Syndication' }
				]
	)

	const isDirty = $derived(snapshot() !== savedSnapshot)

	// Auto-save runs only for drafts (publishing has explicit syndication side effects we shouldn't trigger silently).
	// Pre-first-save it requires a real change so a blank /admin/posts/new doesn't post an empty post on mount.
	const autoSave = useAutoSave({
		enabled: () => status === 'draft',
		isDirty: () => isDirty,
		save: () => handleSave(undefined, { background: true })
	})

	const autoSaveLabel = $derived(formatSaveStatus(autoSave.state))

	// Auto-generate slug from title for new posts.
	$effect(() => {
		if (title && !slugManuallySet) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9\s]+/g, '')
				.replace(/\s+/g, '-')
				.replace(/^-+|-+$/g, '')
		}
	})

	const lifecycle = useFormLifecycle({
		isDirty: () => isDirty,
		canAutoSave: () => status === 'draft' && autoSave.state !== 'conflict',
		flush: () => autoSave.flush(),
		save: () => handleSave(status)
	})

	const heartRequest = new AbortController()
	async function fetchHeartCount(postSlug: string) {
		try {
			const res = await fetch(`/api/heart/universe/${postSlug}`, { signal: heartRequest.signal })
			if (res.ok) {
				const data = await res.json()
				heartCount = Object.values(data).reduce((sum: number, n) => sum + (n as number), 0)
			}
		} catch {
			// Silently fail - heart count is non-critical
		}
	}

	onMount(() => {
		if (initialPost?.slug) {
			fetchHeartCount(initialPost.slug)
		}
	})

	let disposed = false
	onDestroy(() => {
		disposed = true
		heartRequest.abort()
	})

	const saveQueue = createSaveQueue()

	async function handleSave(target?: string, { background = false } = {}) {
		return saveQueue.runIf(
			() => !disposed && (!background || status === 'draft'),
			async () => {
				const targetStatus = (target as PostStatus) || status
				saving = true
				saveError = ''

				const previousStatus = status

				// Capture the snapshot BEFORE the await. Mid-save keystrokes won't be reflected in this string —
				// they'll show as dirty after the save completes, and the next debounce picks them up.
				const submittingSnapshot = snapshot(targetStatus)
				const submitted = JSON.parse(submittingSnapshot)

				const postData = {
					title: config?.showTitle ? title : null,
					slug: slug || `post-${Date.now()}`,
					type: postType,
					status: targetStatus,
					publishedAt,
					content: config?.showContent ? content : null,
					excerpt: postType === 'essay' ? excerpt : undefined,
					syndicationText: syndicationText || null,
					featuredImage: featuredImage || null,
					syndicateBluesky,
					syndicateMastodon,
					appendLink,
					tagIds: tags.map((tag) => tag.id)
				}

				try {
					if (id === null) {
						const created = await api.post<ApiPost>('/api/posts', postData)
						id = created.id
						updatedAt = created.updatedAt
						publishedAt = acknowledgeField(publishedAt, submitted[3], created.publishedAt)
						submitted[3] = created.publishedAt
						// Adopt the server-canonicalized slug (we may have submitted a generated `post-${Date.now()}`).
						slug = acknowledgeField(slug, submitted[4], created.slug)
						submitted[4] = created.slug
						slugManuallySet = true
						if (!disposed) replaceState(`/admin/posts/${created.id}/edit`, {})
					} else {
						const saved = await api.put<ApiPost>(`/api/posts/${id}`, {
							...postData,
							updatedAt
						})
						if (saved) {
							updatedAt = saved.updatedAt
							// Server stamps/normalizes the publish time on transitions
							publishedAt = acknowledgeField(publishedAt, submitted[3], saved.publishedAt)
							submitted[3] = saved.publishedAt
							// Don't sync slug back — server doesn't mutate slug, and syncing would clobber
							// a slug edit the user may have made during the in-flight save.
							slugManuallySet = true
						}
					}
					// Mark the version we actually submitted as saved. Mid-await keystrokes diverge from this
					// snapshot, so isDirty stays true and the next debounce flushes them. The server may have
					// stamped publishedAt (index 3) on a transition — adopt its value so that sync alone
					// doesn't read as dirty.
					status = acknowledgeField(status, previousStatus, targetStatus)
					savedSnapshot = JSON.stringify(submitted)
				} catch (error) {
					// Roll back a rejected status transition (e.g. scheduling without a future date)
					const details = (error as ApiError)?.details as
						| { error?: { message?: string } }
						| undefined
					saveError = details?.error?.message || 'Failed to save post'
					console.error('Failed to save post:', error)
					throw error
				} finally {
					saving = false
				}
			}
		)
	}

	function openDeleteConfirmation() {
		showDeleteConfirmation = true
	}

	async function handleDelete() {
		if (id === null) return
		try {
			await api.delete(`/api/posts/${id}`)
			showDeleteConfirmation = false
			await lifecycle.navigateAfterDelete('/admin/posts')
		} catch (error) {
			console.error('Failed to delete post:', error)
		}
	}

	async function handleCopyPreviewLink() {
		if (!slug) return
		try {
			const res = await api.post<{ url: string }>('/api/preview/generate', {
				contentType: postType === 'essay' ? 'post' : 'post',
				slug
			})
			if (res?.url) {
				const fullUrl = `${window.location.origin}${res.url}`
				await navigator.clipboard.writeText(fullUrl)
			}
		} catch (error) {
			console.error('Failed to generate preview link:', error)
		}
	}

	return {
		get id() {
			return id
		},
		get updatedAt() {
			return updatedAt
		},
		get title() {
			return title
		},
		set title(value: typeof title) {
			title = value
		},
		get postType() {
			return postType
		},
		get status() {
			return status
		},
		get publishedAt() {
			return publishedAt
		},
		set publishedAt(value: typeof publishedAt) {
			publishedAt = value
		},
		get slug() {
			return slug
		},
		set slug(value: typeof slug) {
			slug = value
		},
		get slugManuallySet() {
			return slugManuallySet
		},
		set slugManuallySet(value: typeof slugManuallySet) {
			slugManuallySet = value
		},
		get excerpt() {
			return excerpt
		},
		set excerpt(value: typeof excerpt) {
			excerpt = value
		},
		get syndicationText() {
			return syndicationText
		},
		set syndicationText(value: typeof syndicationText) {
			syndicationText = value
		},
		get featuredImage() {
			return featuredImage
		},
		set featuredImage(value: typeof featuredImage) {
			featuredImage = value
		},
		get syndicateBluesky() {
			return syndicateBluesky
		},
		set syndicateBluesky(value: typeof syndicateBluesky) {
			syndicateBluesky = value
		},
		get syndicateMastodon() {
			return syndicateMastodon
		},
		set syndicateMastodon(value: typeof syndicateMastodon) {
			syndicateMastodon = value
		},
		get appendLink() {
			return appendLink
		},
		set appendLink(value: typeof appendLink) {
			appendLink = value
		},
		get content() {
			return content
		},
		set content(value: typeof content) {
			content = value
		},
		get tags() {
			return tags
		},
		set tags(value: typeof tags) {
			tags = value
		},
		get saving() {
			return saving
		},
		get saveError() {
			return saveError
		},
		set saveError(value: typeof saveError) {
			saveError = value
		},
		get activeTab() {
			return activeTab
		},
		set activeTab(value: typeof activeTab) {
			activeTab = value
		},
		get heartCount() {
			return heartCount
		},
		get showDeleteConfirmation() {
			return showDeleteConfirmation
		},
		set showDeleteConfirmation(value: typeof showDeleteConfirmation) {
			showDeleteConfirmation = value
		},
		snapshot,
		get config() {
			return config
		},
		get tabOptions() {
			return tabOptions
		},
		get isDirty() {
			return isDirty
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
		handleSave,
		openDeleteConfirmation,
		handleDelete,
		handleCopyPreviewLink
	}
}
