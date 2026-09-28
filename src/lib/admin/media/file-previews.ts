import type { Media } from '@prisma/client'
export interface FilePreview {
	file?: File
	media?: Media
	id: string | number
	name: string
	size: number
	type: string
	url: string
}

/** Keeps object URLs stable across progress updates and releases removed files and teardown. */
export function createFilePreviews(
	urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL
) {
	const owned = new Map<File, string>()
	return {
		update(files: (File | Media)[]): FilePreview[] {
			const current = new Set(files)
			for (const [file, url] of owned) {
				if (!current.has(file)) {
					urls.revokeObjectURL(url)
					owned.delete(file)
				}
			}
			return files.map((item) => {
				if ('url' in item)
					return {
						media: item,
						id: item.id,
						name: item.filename,
						size: item.size,
						type: item.mimeType,
						url: item.url
					}
				let url = owned.get(item)
				if (!url) {
					url = urls.createObjectURL(item)
					owned.set(item, url)
				}
				return { file: item, id: item.name, name: item.name, size: item.size, type: item.type, url }
			})
		},
		dispose() {
			for (const url of owned.values()) urls.revokeObjectURL(url)
			owned.clear()
		}
	}
}
