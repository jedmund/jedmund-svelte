import { getConfig } from '$lib/server/config'
import { HARDCODED_DEFAULTS, setSeoDefaults } from '$lib/utils/metadata'
import { prisma } from '$lib/server/database'

export const load = async () => {
	try {
		const [
			siteName,
			siteUrl,
			defaultTitle,
			defaultDescription,
			defaultOgImage,
			twitterHandle,
			locale,
			socialLinks,
			profile
		] = await Promise.all([
			getConfig('site.name'),
			getConfig('site.url'),
			getConfig('seo.default_title'),
			getConfig('seo.default_description'),
			getConfig('seo.default_og_image'),
			getConfig('seo.twitter_handle'),
			getConfig('seo.locale'),
			prisma.socialLink.findMany({
				where: { isActive: true },
				orderBy: { displayOrder: 'asc' }
			}),
			prisma.profile.findFirst()
		])

		const seoDefaults = {
			siteName: siteName || HARDCODED_DEFAULTS.siteName,
			siteUrl: siteUrl || HARDCODED_DEFAULTS.siteUrl,
			defaultTitle: defaultTitle || HARDCODED_DEFAULTS.defaultTitle,
			defaultDescription: defaultDescription || HARDCODED_DEFAULTS.defaultDescription,
			defaultImage: defaultOgImage || HARDCODED_DEFAULTS.defaultImage,
			twitterSite: twitterHandle || HARDCODED_DEFAULTS.twitterSite,
			locale: locale || HARDCODED_DEFAULTS.locale
		}

		setSeoDefaults(seoDefaults)
		return {
			seoDefaults,
			socialLinks: socialLinks.map((link) => ({
				name: link.label,
				url: link.url
			})),
			shortBio: profile?.shortBio || null
		}
	} catch {
		return {
			seoDefaults: { ...HARDCODED_DEFAULTS },
			socialLinks: [] as { name: string; url: string }[],
			shortBio: null as string | null
		}
	}
}
