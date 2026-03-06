import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('Seeding about data...')

	// Profile
	const profile = await prisma.profile.upsert({
		where: { id: 1 },
		update: {},
		create: {
			headline: 'Software designer and developer',
			location: 'San Francisco',
			shortBio:
				'@jedmund is a software designer and strategist based out of San Francisco.\n\nIn his 15 year career, he\'s focused his design practice on building tools that help people connect with each other and themselves through their own creativity.',
			bio: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Hello! My name is ' },
							{
								type: 'text',
								text: 'Justin Edmund',
								marks: [{ type: 'italic' }]
							},
							{
								type: 'text',
								text: ". I'm a software designer and developer living in San Francisco."
							}
						]
					},
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: "Currently, I'm a product designer at " },
							{
								type: 'text',
								text: 'Grammarly',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'https://grammarly.com',
											target: '_blank'
										}
									}
								]
							},
							{
								type: 'text',
								text: '. I spend my free time building a hobby journaling app called '
							},
							{
								type: 'text',
								text: 'Maitsu',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'https://maitsu.co',
											target: '_blank'
										}
									}
								]
							},
							{ type: 'text', text: ' and running a competitive crew in ' },
							{
								type: 'text',
								text: 'Granblue Fantasy',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'https://granbluefantasy.jp',
											target: '_blank'
										}
									}
								]
							},
							{
								type: 'text',
								text: ". I've spent time at several companies over the last 15 years, but you might know me from "
							},
							{
								type: 'text',
								text: 'Pinterest',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'https://www.pinterest.com/',
											target: '_blank'
										}
									}
								]
							},
							{ type: 'text', text: ', where I was the first design hire.' }
						]
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'I was born and raised in New York City and spend a lot of time in Tokyo. I graduated from '
							},
							{
								type: 'text',
								text: 'Carnegie Mellon University',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'http://design.cmu.edu/',
											target: '_blank'
										}
									}
								]
							},
							{
								type: 'text',
								text: ' in 2011 with a Bachelors of Arts in Communication Design.'
							}
						]
					}
				]
			}
		}
	})
	console.log(`  Profile created (id: ${profile.id})`)

	// Social Links
	const socialLinksData = [
		{ platform: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/jedmund.com', displayOrder: 0 },
		{ platform: 'mastodon', label: 'Mastodon', url: 'https://fireplace.cafe/@jedmund', displayOrder: 1 },
		{ platform: 'github', label: 'Github', url: 'https://github.com/jedmund', displayOrder: 2 },
		{ platform: 'glass', label: 'Glass', url: 'https://glass.photo/jedmund', displayOrder: 3 }
	]

	for (const link of socialLinksData) {
		await prisma.socialLink.create({ data: link })
	}
	console.log(`  ${socialLinksData.length} social links created`)

	// Mentions
	const mentionsData = [
		{
			title: "Pinterest's first design hire built an app for passion projects",
			href: 'https://medium.com/figma-design/pinterests-first-design-hire-built-a-habit-formation-app-a6aee9103610',
			sourceType: 'Blog',
			date: 'Apr 2018',
			displayOrder: 0
		},
		{
			title: 'Revision Path #113',
			href: 'http://revisionpath.com/justin-edmund/',
			sourceType: 'Podcast',
			date: 'Dec 2015',
			displayOrder: 1
		},
		{
			title: 'Design Details #76',
			href: 'https://designdetails.fm/episodes/a4cc2bff',
			sourceType: 'Podcast',
			date: 'Nov 2015',
			displayOrder: 2
		},
		{
			title: "Pinterest's seventh employee on being black in Silicon Valley",
			href: 'http://www.usatoday.com/story/tech/2014/10/30/justin-edmund-pinterest-diversity-silicon-valley-ferguson-african-americans-hispanics-technology/17832781/',
			source: 'USA Today',
			sourceType: 'Article',
			date: 'Oct 2014',
			displayOrder: 3
		},
		{
			title: 'Hopes Pinned on Success',
			href: 'http://www.cmu.edu/homepage/creativity/2012/spring/hopes-pinned-on-success.shtml',
			source: 'Carnegie Mellon Today',
			sourceType: 'Article',
			date: 'May 2012',
			displayOrder: 4
		},
		{
			title: 'In Silicon Valley, designers emerge as rock stars',
			href: 'http://www.reuters.com/article/us-designers-startup-idUSBRE83C0QG20120416',
			source: 'Reuters',
			sourceType: 'Article',
			date: 'Apr 2012',
			displayOrder: 5
		}
	]

	for (const mention of mentionsData) {
		await prisma.mention.create({ data: mention })
	}
	console.log(`  ${mentionsData.length} mentions created`)

	console.log('Done!')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
