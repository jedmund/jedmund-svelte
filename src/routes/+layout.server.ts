import { getConfig } from '$lib/server/config'

export const load = async () => {
	try {
		const [
			siteName,
			siteUrl,
			defaultTitle,
			defaultDescription,
			defaultOgImage,
			twitterHandle,
			locale
		] = await Promise.all([
			getConfig('site.name'),
			getConfig('site.url'),
			getConfig('seo.default_title'),
			getConfig('seo.default_description'),
			getConfig('seo.default_og_image'),
			getConfig('seo.twitter_handle'),
			getConfig('seo.locale')
		])

		return {
			seoDefaults: {
				siteName: siteName || '@jedmund',
				siteUrl: siteUrl || 'https://jedmund.com',
				defaultTitle: defaultTitle || '@jedmund is a software designer',
				defaultDescription:
					defaultDescription ||
					'Justin Edmund is a software designer based in San Francisco.',
				defaultImage: defaultOgImage || 'https://jedmund.com/images/og-image.jpg',
				twitterSite: twitterHandle || '@jedmund',
				locale: locale || 'en_US'
			}
		}
	} catch {
		// Fall back to hardcoded defaults if DB is unavailable
		return {
			seoDefaults: {
				siteName: '@jedmund',
				siteUrl: 'https://jedmund.com',
				defaultTitle: '@jedmund is a software designer',
				defaultDescription:
					'Justin Edmund is a software designer based in San Francisco.',
				defaultImage: 'https://jedmund.com/images/og-image.jpg',
				twitterSite: '@jedmund',
				locale: 'en_US'
			}
		}
	}
}
