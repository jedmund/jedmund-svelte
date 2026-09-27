import assert from 'node:assert/strict'
import test from 'node:test'
import { galleryImagesFromMedia } from '../src/lib/editor/jedmund/gallery-images.ts'

test('editing a gallery retains authored metadata and leaves new captions empty', () => {
	const images = galleryImagesFromMedia(
		[
			{ id: 2, url: '/new.jpg', description: 'New image description' },
			{ id: 1, url: '/updated.jpg', description: 'Library description' }
		],
		[
			{
				id: '1',
				url: '/old.jpg',
				alt: 'Authored alt',
				title: 'Authored caption',
				credit: 'Photographer'
			}
		]
	)
	assert.deepEqual(images, [
		{ id: 2, url: '/new.jpg', alt: 'New image description', title: '' },
		{
			id: 1,
			url: '/updated.jpg',
			alt: 'Authored alt',
			title: 'Authored caption',
			credit: 'Photographer'
		}
	])
})
