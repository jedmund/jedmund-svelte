const SUMMARY_ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&nbsp;': ' '
}

// Strip HTML out of imported summaries (e.g. AniList synopses ship with <br>,
// <i>, etc. embedded in the description text). Converts <br> to newlines so
// the rendering element's `white-space: pre-line` produces paragraph breaks.
export const cleanSummary = (raw: string | null | undefined): string => {
	if (!raw) return ''
	return raw
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => SUMMARY_ENTITIES[m] ?? m)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}
