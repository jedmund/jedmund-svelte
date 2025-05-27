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
				technologies: ['React Native', 'TypeScript', 'Node.js', 'PostgreSQL'],
				featuredImage: '/images/projects/maitsu-cover.png',
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
				technologies: ['Design Systems', 'User Research', 'Prototyping', 'Strategy'],
				featuredImage: '/images/projects/slack-cover.png',
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
				technologies: ['Product Design', 'Prototyping', 'User Research', 'Design Systems'],
				featuredImage: '/images/projects/figma-cover.png',
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
				technologies: ['Product Design', 'Mobile Design', 'Design Leadership', 'Visual Design'],
				featuredImage: '/images/projects/pinterest-cover.png',
				backgroundColor: '#f7f7f7',
				highlightColor: '#CB1F27',
				displayOrder: 4,
				status: 'published',
				publishedAt: new Date()
			}
		})
	])

	console.log(`✅ Created ${projects.length} projects`)

	// Create test posts
	const posts = await Promise.all([
		prisma.post.create({
			data: {
				slug: 'hello-world',
				postType: 'blog',
				title: 'Hello World',
				content: {
					blocks: [
						{ type: 'paragraph', content: 'This is my first blog post on the new CMS!' },
						{
							type: 'paragraph',
							content: 'The system supports multiple post types and rich content editing.'
						}
					]
				},
				excerpt: 'Welcome to my new blog powered by a custom CMS.',
				tags: ['announcement', 'meta'],
				status: 'published',
				publishedAt: new Date()
			}
		}),
		prisma.post.create({
			data: {
				slug: 'quick-thought',
				postType: 'microblog',
				content: {
					blocks: [
						{
							type: 'paragraph',
							content: 'Just pushed a major update to the site. Feeling good about the progress!'
						}
					]
				},
				status: 'published',
				publishedAt: new Date(Date.now() - 86400000) // Yesterday
			}
		}),
		prisma.post.create({
			data: {
				slug: 'great-article',
				postType: 'link',
				title: 'Great Article on Web Performance',
				linkUrl: 'https://web.dev/performance',
				linkDescription:
					'This article perfectly explains the core web vitals and how to optimize for them.',
				status: 'published',
				publishedAt: new Date(Date.now() - 172800000) // 2 days ago
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
				displayOrder: 2
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
