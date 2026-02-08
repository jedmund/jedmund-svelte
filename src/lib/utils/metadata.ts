// JSON-LD structured data object type
type JsonLdObject = Record<string, unknown>

interface MetaTagsOptions {
	title?: string
	description?: string
	image?: string
	url?: string
	type?: 'website' | 'article' | 'profile'
	author?: string
	publishedTime?: string
	modifiedTime?: string
	section?: string
	tags?: string[]
	twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
	twitterSite?: string
	twitterCreator?: string
	siteName?: string
	locale?: string
	canonicalUrl?: string
	noindex?: boolean
	jsonLd?: JsonLdObject
}

interface GeneratedMetaTags {
	title: string
	description: string
	openGraph: Record<string, string>
	twitter: Record<string, string>
	other: Record<string, string>
	jsonLd?: JsonLdObject
}

export interface SeoDefaults {
	siteName: string
	siteUrl: string
	defaultTitle: string
	defaultDescription: string
	defaultImage: string
	twitterSite: string
	locale: string
}

const HARDCODED_DEFAULTS: SeoDefaults = {
	siteName: '@jedmund',
	siteUrl: 'https://jedmund.com',
	defaultTitle: '@jedmund is a software designer',
	defaultDescription: 'Justin Edmund is a software designer based in San Francisco.',
	defaultImage: 'https://jedmund.com/images/og-image.jpg',
	twitterSite: '@jedmund',
	locale: 'en_US'
}

let DEFAULTS: SeoDefaults = { ...HARDCODED_DEFAULTS }

export function setSeoDefaults(overrides: Partial<SeoDefaults>): void {
	DEFAULTS = { ...HARDCODED_DEFAULTS, ...overrides }
}

/**
 * Format a page title based on content type
 */
export function formatPageTitle(
	title?: string,
	options?: {
		type?: 'default' | 'by' | 'snippet' | 'about'
		snippet?: string
	}
): string {
	if (!title || title === DEFAULTS.siteName) {
		return DEFAULTS.defaultTitle
	}

	const { type = 'default', snippet } = options || {}

	switch (type) {
		case 'by':
			return `${title} by @jedmund`
		case 'snippet':
			return `@jedmund: ${snippet || title}`
		case 'about':
			return `About @jedmund`
		default:
			return `${title} — @jedmund`
	}
}

/**
 * Ensure a URL is absolute
 */
function ensureAbsoluteUrl(url: string): string {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url
	}
	return `${DEFAULTS.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Generate comprehensive meta tags for a page
 */
export function generateMetaTags(
	options: MetaTagsOptions & {
		titleFormat?: { type?: 'default' | 'by' | 'snippet' | 'about'; snippet?: string }
	} = {}
): GeneratedMetaTags {
	const {
		title,
		description = DEFAULTS.defaultDescription,
		image = DEFAULTS.defaultImage,
		url = DEFAULTS.siteUrl,
		type = 'website',
		author,
		publishedTime,
		modifiedTime,
		section,
		tags = [],
		twitterCard = image ? 'summary_large_image' : 'summary',
		twitterSite = DEFAULTS.twitterSite,
		twitterCreator = DEFAULTS.twitterSite,
		siteName = DEFAULTS.siteName,
		locale = DEFAULTS.locale,
		canonicalUrl,
		noindex = false,
		jsonLd,
		titleFormat
	} = options

	const formattedTitle = formatPageTitle(title, titleFormat)
	const absoluteUrl = ensureAbsoluteUrl(url)
	const absoluteImage = ensureAbsoluteUrl(image)
	const canonical = canonicalUrl ? ensureAbsoluteUrl(canonicalUrl) : absoluteUrl

	// Basic meta tags
	const metaTags: GeneratedMetaTags = {
		title: formattedTitle,
		description,
		openGraph: {
			title: title || DEFAULTS.defaultTitle,
			description,
			type,
			url: absoluteUrl,
			site_name: siteName,
			locale
		},
		twitter: {
			card: twitterCard,
			title: title || DEFAULTS.defaultTitle,
			description
		},
		other: {}
	}

	// Add image tags if provided
	if (image) {
		metaTags.openGraph.image = absoluteImage
		metaTags.twitter.image = absoluteImage
		// Add image alt text if we can derive it
		if (title) {
			metaTags.openGraph.image_alt = `Image for ${title}`
			metaTags.twitter.image_alt = `Image for ${title}`
		}
	}

	// Add Twitter accounts if provided
	if (twitterSite) {
		metaTags.twitter.site = twitterSite
	}
	if (twitterCreator) {
		metaTags.twitter.creator = twitterCreator
	}

	// Add article-specific tags
	if (type === 'article') {
		if (author) {
			metaTags.openGraph.article_author = author
		}
		if (publishedTime) {
			metaTags.openGraph.article_published_time = publishedTime
		}
		if (modifiedTime) {
			metaTags.openGraph.article_modified_time = modifiedTime
		}
		if (section) {
			metaTags.openGraph.article_section = section
		}
		if (tags.length > 0) {
			metaTags.openGraph.article_tag = tags.join(',')
		}
	}

	// Add canonical URL
	if (canonical) {
		metaTags.other.canonical = canonical
	}

	// Add noindex if needed
	if (noindex) {
		metaTags.other.robots = 'noindex,nofollow'
	}

	// Add JSON-LD if provided
	if (jsonLd) {
		metaTags.jsonLd = jsonLd
	}

	return metaTags
}

/**
 * Generate JSON-LD structured data for a person
 */
export function generatePersonJsonLd(options: {
	name: string
	url?: string
	image?: string
	jobTitle?: string
	description?: string
	sameAs?: string[]
}): JsonLdObject {
	const { name, url = DEFAULTS.siteUrl, image, jobTitle, description, sameAs = [] } = options

	const jsonLd: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name,
		url
	}

	if (image) {
		jsonLd.image = ensureAbsoluteUrl(image)
	}

	if (jobTitle) {
		jsonLd.jobTitle = jobTitle
	}

	if (description) {
		jsonLd.description = description
	}

	if (sameAs.length > 0) {
		jsonLd.sameAs = sameAs
	}

	return jsonLd
}

/**
 * Generate JSON-LD structured data for an article
 */
export function generateArticleJsonLd(options: {
	title: string
	description?: string
	url: string
	image?: string
	datePublished?: string
	dateModified?: string
	author?: string
}): JsonLdObject {
	const { title, description, url, image, datePublished, dateModified, author } = options

	const jsonLd: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		url: ensureAbsoluteUrl(url)
	}

	if (description) {
		jsonLd.description = description
	}

	if (image) {
		jsonLd.image = ensureAbsoluteUrl(image)
	}

	if (datePublished) {
		jsonLd.datePublished = datePublished
	}

	if (dateModified) {
		jsonLd.dateModified = dateModified
	}

	if (author) {
		jsonLd.author = {
			'@type': 'Person',
			name: author
		}
	}

	// Add publisher
	jsonLd.publisher = {
		'@type': 'Person',
		name: 'Justin Edmund',
		url: DEFAULTS.siteUrl
	}

	return jsonLd
}

/**
 * Generate JSON-LD structured data for an image gallery
 */
export function generateImageGalleryJsonLd(options: {
	name: string
	description?: string
	url: string
	images: Array<{
		url: string
		caption?: string
	}>
}): JsonLdObject {
	const { name, description, url, images } = options

	const jsonLd: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'ImageGallery',
		name,
		url: ensureAbsoluteUrl(url)
	}

	if (description) {
		jsonLd.description = description
	}

	if (images.length > 0) {
		jsonLd.image = images.map((img) => ({
			'@type': 'ImageObject',
			url: ensureAbsoluteUrl(img.url),
			...(img.caption && { caption: img.caption })
		}))
	}

	return jsonLd
}

/**
 * Generate JSON-LD structured data for a creative work (project)
 */
export function generateCreativeWorkJsonLd(options: {
	name: string
	description?: string
	url: string
	image?: string
	creator?: string
	dateCreated?: string
	keywords?: string[]
}): JsonLdObject {
	const { name, description, url, image, creator, dateCreated, keywords = [] } = options

	const jsonLd: JsonLdObject = {
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		name,
		url: ensureAbsoluteUrl(url)
	}

	if (description) {
		jsonLd.description = description
	}

	if (image) {
		jsonLd.image = ensureAbsoluteUrl(image)
	}

	if (creator) {
		jsonLd.creator = {
			'@type': 'Person',
			name: creator
		}
	}

	if (dateCreated) {
		jsonLd.dateCreated = dateCreated
	}

	if (keywords.length > 0) {
		jsonLd.keywords = keywords.join(', ')
	}

	return jsonLd
}
