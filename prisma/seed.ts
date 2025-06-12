import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('🌱 Starting seed...')

	// Clear existing data
	await prisma.photo.deleteMany({})
	await prisma.album.deleteMany({})
	await prisma.post.deleteMany({})
	await prisma.media.deleteMany({})
	await prisma.project.deleteMany({})
	console.log('✅ Cleared existing data')

	// Create real projects from ProjectList
	const projects = await Promise.all([
		prisma.project.create({
			data: {
				slug: 'maitsu',
				title: 'Maitsu',
				subtitle: 'A hobby journal for weekly creativity',
				description: 'Maitsu is a hobby journal that helps people make something new every week.',
				year: 2023,
				client: 'Personal Project',
				role: 'Founder & Designer',
				projectType: 'work',
				backgroundColor: '#FFF7EA',
				highlightColor: '#F77754',
				displayOrder: 1,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'slack',
				title: 'Slack',
				subtitle: 'Redefining automation strategy',
				description:
					'At Slack, I helped redefine strategy for Workflows and other features in under the automation umbrella.',
				year: 2022,
				client: 'Slack Technologies',
				role: 'Senior Product Designer',
				projectType: 'work',
				backgroundColor: '#4a154b',
				highlightColor: '#611F69',
				displayOrder: 2,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'figma',
				title: 'Figma',
				subtitle: 'Pioneering prototyping features',
				description:
					'At Figma, I designed features and led R&D and strategy for the nascent prototyping team.',
				year: 2019,
				client: 'Figma Inc.',
				role: 'Product Designer',
				projectType: 'work',
				backgroundColor: '#2c2c2c',
				highlightColor: '#0ACF83',
				displayOrder: 3,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'pinterest',
				title: 'Pinterest',
				subtitle: 'Building from the ground up',
				description:
					'At Pinterest, I was the first product design hired, and touched almost every part of the product.',
				year: 2011,
				client: 'Pinterest',
				role: 'Product Designer #1',
				projectType: 'work',
				backgroundColor: '#f7f7f7',
				highlightColor: '#CB1F27',
				displayOrder: 4,
				status: 'published',
				publishedAt: new Date()
			}
		})
	])

	console.log(`✅ Created ${projects.length} work projects`)

	// Create Labs projects
	const labsProjects = await Promise.all([
		prisma.project.create({
			data: {
				slug: 'granblue-team',
				title: 'granblue.team',
				subtitle: 'Comprehensive web app for Granblue Fantasy players',
				description:
					'A comprehensive web application for Granblue Fantasy players to track raids, manage crews, and optimize team compositions. Features real-time raid tracking, character databases, and community tools.',
				year: 2022,
				client: 'Personal Project',
				role: 'Full-Stack Developer',
				externalUrl: 'https://granblue.team',
				backgroundColor: '#1a1a2e',
				highlightColor: '#16213e',
				projectType: 'labs',
				displayOrder: 1,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'subway-board',
				title: 'Subway Board',
				subtitle: 'Beautiful, minimalist NYC subway dashboard',
				description:
					'A beautiful, minimalist dashboard displaying real-time NYC subway arrival times. Clean interface inspired by the classic subway map design with live MTA data integration.',
				year: 2023,
				client: 'Personal Project',
				role: 'Developer & Designer',
				backgroundColor: '#0f4c81',
				highlightColor: '#1e3a5f',
				projectType: 'labs',
				displayOrder: 2,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'siero-discord',
				title: 'Siero for Discord',
				subtitle: 'Discord bot for Granblue Fantasy communities',
				description:
					'A Discord bot for Granblue Fantasy communities providing character lookups, raid notifications, and server management tools. Serves thousands of users across multiple servers.',
				year: 2021,
				client: 'Personal Project',
				role: 'Bot Developer',
				backgroundColor: '#5865f2',
				highlightColor: '#4752c4',
				projectType: 'labs',
				displayOrder: 3,
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.project.create({
			data: {
				slug: 'homelab',
				title: 'Homelab',
				subtitle: 'Self-hosted infrastructure on Kubernetes',
				description:
					'Self-hosted infrastructure running on Kubernetes with monitoring, media servers, and development environments. Includes automated deployments and backup strategies.',
				year: 2023,
				client: 'Personal Project',
				role: 'DevOps Engineer',
				backgroundColor: '#ff6b35',
				highlightColor: '#e55a2b',
				projectType: 'labs',
				displayOrder: 4,
				status: 'published',
				publishedAt: new Date()
			}
		})
	])

	console.log(`✅ Created ${labsProjects.length} labs projects`)

	// Create test posts using new simplified types
	const posts = await Promise.all([
		prisma.post.create({
			data: {
				slug: 'hello-world',
				postType: 'essay',
				title: 'Hello World',
				content: {
					blocks: [
						{ type: 'paragraph', content: 'This is my first essay on the new CMS!' },
						{
							type: 'paragraph',
							content:
								'The system now uses a simplified post type system with just essays and posts.'
						},
						{
							type: 'paragraph',
							content:
								'Essays are perfect for longer-form content with titles and excerpts, while posts are great for quick thoughts and updates.'
						}
					]
				},
				tags: ['announcement', 'meta', 'cms'],
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.post.create({
			data: {
				slug: 'quick-thought',
				postType: 'post',
				content: {
					blocks: [
						{
							type: 'paragraph',
							content:
								'Just pushed a major update to the site. The new simplified post types are working great! 🎉'
						}
					]
				},
				tags: ['update', 'development'],
				status: 'published',
				publishedAt: new Date(Date.now() - 86400000) // Yesterday
			}
		}),
		prisma.post.create({
			data: {
				slug: 'design-systems-thoughts',
				postType: 'essay',
				title: 'Thoughts on Design Systems',
				content: {
					blocks: [
						{
							type: 'paragraph',
							content:
								'Design systems have become essential for maintaining consistency across large products.'
						},
						{
							type: 'paragraph',
							content: 'The key is finding the right balance between flexibility and constraints.'
						},
						{
							type: 'paragraph',
							content:
								'Too rigid, and designers feel boxed in. Too flexible, and you lose consistency.'
						}
					]
				},
				tags: ['design', 'systems', 'ux'],
				status: 'published',
				publishedAt: new Date(Date.now() - 172800000) // 2 days ago
			}
		}),
		prisma.post.create({
			data: {
				slug: 'morning-coffee',
				postType: 'post',
				content: {
					blocks: [
						{
							type: 'paragraph',
							content: 'Perfect morning for coding with a fresh cup of coffee ☕'
						}
					]
				},
				tags: ['life', 'coffee'],
				status: 'published',
				publishedAt: new Date(Date.now() - 259200000) // 3 days ago
			}
		}),
		prisma.post.create({
			data: {
				slug: 'weekend-project',
				postType: 'post',
				content: {
					blocks: [
						{
							type: 'paragraph',
							content:
								'Built a small CLI tool over the weekend. Sometimes the best projects come from scratching your own itch.'
						}
					]
				},
				tags: ['projects', 'cli', 'weekend'],
				status: 'draft'
			}
		})
	])

	console.log(`✅ Created ${posts.length} posts`)

	// Create test album and photos
	const album = await prisma.album.create({
		data: {
			slug: 'tokyo-trip-2024',
			title: 'Tokyo Trip 2024',
			description: 'Photos from my recent trip to Tokyo',
			date: new Date('2024-03-15'),
			location: 'Tokyo, Japan',
			status: 'published',
			isPhotography: true,
			showInUniverse: true
		}
	})

	const photos = await Promise.all([
		prisma.photo.create({
			data: {
				albumId: album.id,
				filename: 'tokyo-tower.jpg',
				url: '/local-uploads/tokyo-tower.jpg',
				thumbnailUrl: '/local-uploads/thumb-tokyo-tower.jpg',
				width: 1920,
				height: 1080,
				caption: 'Tokyo Tower at sunset',
				displayOrder: 1,
				status: 'published',
				showInPhotos: true,
				exifData: {
					camera: 'Sony A7III',
					lens: '24-70mm f/2.8',
					iso: 400,
					aperture: 'f/5.6',
					shutterSpeed: '1/250s'
				}
			}
		}),
		prisma.photo.create({
			data: {
				albumId: album.id,
				filename: 'shibuya-crossing.jpg',
				url: '/local-uploads/shibuya-crossing.jpg',
				thumbnailUrl: '/local-uploads/thumb-shibuya-crossing.jpg',
				width: 1920,
				height: 1080,
				caption: 'The famous Shibuya crossing',
				displayOrder: 2,
				status: 'published',
				showInPhotos: true
			}
		})
	])

	await prisma.album.update({
		where: { id: album.id },
		data: { coverPhotoId: photos[0].id }
	})

	console.log(`✅ Created album with ${photos.length} photos`)

	// Create test media entries
	const media = await Promise.all([
		prisma.media.create({
			data: {
				filename: 'blog-header.jpg',
				mimeType: 'image/jpeg',
				size: 245000,
				url: '/local-uploads/blog-header.jpg',
				thumbnailUrl: '/local-uploads/thumb-blog-header.jpg',
				width: 1920,
				height: 1080,
				usedIn: [{ type: 'post', id: posts[0].id }]
			}
		})
	])

	console.log(`✅ Created ${media.length} media items`)

	console.log('🎉 Seed completed!')
}

main()
	.catch((e) => {
		console.error('❌ Seed failed:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
