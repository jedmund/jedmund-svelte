import type { SocialReply } from './social-replies'
import { replyExamples } from './reply-examples'
import { responseData } from '$lib/admin/response'

export function createSocialReplies(
	options: () => { contentType: string; contentId: number; debug: boolean }
) {
	let replies = $state<SocialReply[]>([])
	let loading = $state(true)
	$effect(() => {
		const { contentType, contentId, debug } = options()
		replies = []
		if (debug) {
			replies = replyExamples()
			loading = false
			return
		}
		const abort = new AbortController()
		loading = true
		const query = new URLSearchParams({ contentType, contentId: String(contentId) })
		fetch(`/api/syndication/replies?${query}`, { signal: abort.signal })
			.then((response) => responseData<{ replies: SocialReply[] }>(response))
			.then((data) => {
				if (!abort.signal.aborted) replies = data.replies
			})
			.catch(() => {
				/* Replies are optional; preserve the existing quiet empty state. */
			})
			.finally(() => {
				if (!abort.signal.aborted) loading = false
			})
		return () => abort.abort()
	})
	return {
		get replies() {
			return replies
		},
		get loading() {
			return loading
		}
	}
}
