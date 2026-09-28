import type { JSONContent } from '@tiptap/core'

export interface ComposerDraft {
	postType: 'post' | 'essay'
	content: JSONContent
	photoIds: number[]
	title: string
	slug: string
	excerpt: string
	tags: string
}

export function composerPayload(draft: ComposerDraft) {
	const common = {
		content: draft.content,
		status: 'published',
		attachedPhotos: draft.photoIds,
		type: draft.postType
	}
	return draft.postType === 'essay'
		? {
				...common,
				title: draft.title,
				slug: draft.slug,
				excerpt: draft.excerpt,
				tags: draft.tags ? draft.tags.split(',').map((tag) => tag.trim()) : []
			}
		: common
}

/** Snapshot the submitted document. New edits are never cleared by an older save. */
export function createComposerSubmission(
	publish: (payload: ReturnType<typeof composerPayload>, signal: AbortSignal) => Promise<unknown>
) {
	let controller: AbortController | undefined
	let generation = 0
	return {
		async save(draft: ComposerDraft, current: () => ComposerDraft) {
			if (controller) return undefined
			const snapshot = JSON.stringify(draft)
			const submitted = JSON.parse(snapshot) as ComposerDraft
			const request = new AbortController()
			controller = request
			const version = generation
			try {
				await publish(composerPayload(submitted), request.signal)
				if (generation !== version) return undefined
				return { postType: submitted.postType, unchanged: JSON.stringify(current()) === snapshot }
			} catch (error) {
				if (generation !== version) return undefined
				throw error
			} finally {
				if (controller === request) controller = undefined
			}
		},
		cancel() {
			generation++
			controller?.abort()
			controller = undefined
		}
	}
}
