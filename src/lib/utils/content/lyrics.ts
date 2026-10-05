export interface LyricsStanza {
	a: string
	b: string
}

export interface LyricsAttributes {
	langA: string
	langB: string
	titleA: string | null
	titleB: string | null
	artistA: string | null
	artistB: string | null
	stanzas: LyricsStanza[]
}

export const LYRICS_DEFAULTS: LyricsAttributes = {
	langA: 'ja',
	langB: 'en',
	titleA: null,
	titleB: null,
	artistA: null,
	artistB: null,
	stanzas: []
}

const LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/** Falls back when the stored value is not a plausible BCP 47 tag, since it lands in `lang=""`. */
export const safeLanguage = (value: unknown, fallback: string): string =>
	typeof value === 'string' && LANGUAGE_TAG.test(value.trim()) ? value.trim() : fallback

export const normalizeStanzas = (value: unknown): LyricsStanza[] => {
	if (!Array.isArray(value)) return []
	return value
		.filter((stanza): stanza is Record<string, unknown> => !!stanza && typeof stanza === 'object')
		.map((stanza) => ({
			a: typeof stanza.a === 'string' ? stanza.a : '',
			b: typeof stanza.b === 'string' ? stanza.b : ''
		}))
}

const escapeHtml = (str: string): string =>
	str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

const lines = (text: string): string => escapeHtml(text.trim()).replace(/\r?\n/g, '<br>')

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * Stanzas are emitted as A/B paragraph pairs so the markup reads in order
 * without styles (RSS readers); site CSS lays each pair out as two columns.
 * The A/Both/B toggle is added client-side by `hydrateLyrics`.
 */
export const renderLyrics = (attrs: Record<string, unknown> | undefined): string => {
	const langA = safeLanguage(attrs?.langA, LYRICS_DEFAULTS.langA)
	const langB = safeLanguage(attrs?.langB, LYRICS_DEFAULTS.langB)
	const stanzas = normalizeStanzas(attrs?.stanzas).filter(
		(stanza) => stanza.a.trim() || stanza.b.trim()
	)

	const heading = (side: 'a' | 'b', lang: string, title: string, artist: string): string => {
		if (!title && !artist) return ''
		const parts = [
			title ? `<strong class="lyrics-title">${escapeHtml(title)}</strong>` : '',
			artist ? `<span class="lyrics-artist">${escapeHtml(artist)}</span>` : ''
		].filter(Boolean)
		return `<p class="lyrics-heading lyrics-${side}" lang="${lang}">${parts.join('<br>')}</p>`
	}

	const header =
		heading('a', langA, text(attrs?.titleA), text(attrs?.artistA)) +
		heading('b', langB, text(attrs?.titleB), text(attrs?.artistB))
	const body = stanzas
		.map((stanza) => {
			const a = stanza.a.trim() ? `<p class="lyrics-a" lang="${langA}">${lines(stanza.a)}</p>` : ''
			const b = stanza.b.trim() ? `<p class="lyrics-b" lang="${langB}">${lines(stanza.b)}</p>` : ''
			return `<div class="lyrics-stanza">${a}${b}</div>`
		})
		.join('')

	if (!header && !body) return ''
	return `<figure class="lyrics-rendered" data-lyrics data-lang-a="${langA}" data-lang-b="${langB}">${header ? `<div class="lyrics-header">${header}</div>` : ''}${body}</figure>`
}
