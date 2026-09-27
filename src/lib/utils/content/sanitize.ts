import DOMPurify from 'isomorphic-dompurify'

// Allow iframes (YouTube embeds) and the attributes they need; everything else
// falls back to DOMPurify defaults, which strip scripts, event handlers, etc.
const SANITIZE_CONFIG = {
	ADD_TAGS: ['iframe'],
	ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target']
}

export const sanitize = (html: string): string => DOMPurify.sanitize(html, SANITIZE_CONFIG)
