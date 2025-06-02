import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

export interface Post {
	title?: string
	type: 'note' | 'article' | 'image' | 'link'
	date: string
	slug: string
	published: boolean
	content: string
	excerpt?: string
	images?: string[]
	link?:
		| {
				url: string
				title?: string
				description?: string
				image?: string
				favicon?: string
				siteName?: string
		  }
		| string
}

const postsDirectory = path.join(process.cwd(), 'src/lib/posts')

export async function getAllPosts(): Promise<Post[]> {
	const fileNames = fs.readdirSync(postsDirectory)

	const posts = fileNames
		.filter((fileName) => fileName.endsWith('.md'))
		.map((fileName) => {
			const filePath = path.join(postsDirectory, fileName)
			const fileContents = fs.readFileSync(filePath, 'utf8')
			const { data, content } = matter(fileContents)

			const slug = data.slug || fileName.replace(/\.md$/, '')

			return {
				...data,
				slug,
				content,
				excerpt: getExcerpt(content, data.type)
			} as Post
		})
		.filter((post) => post.published)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

	return posts
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
	const posts = await getAllPosts()
	const post = posts.find((p) => p.slug === slug)

	if (!post) return null

	return {
		...post,
		content: marked(post.content) as string
	}
}

function getExcerpt(content: string, type: 'note' | 'article'): string {
	const plainText = content.replace(/[#*`\[\]]/g, '').trim()
	const maxLength = type === 'note' ? 280 : 160

	if (plainText.length <= maxLength) return plainText

	return plainText.substring(0, maxLength).trim() + '...'
}
