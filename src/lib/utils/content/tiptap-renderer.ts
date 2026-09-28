import type { ContentNode, Mark } from './types'
import { extractMediaIdFromUrl } from './media-url'

// Render Tiptap JSON content to HTML
export function renderTiptapContent(
	doc: Record<string, unknown>,
	options: { albumSlug?: string } = {}
): string {
	if (!doc || !doc.content) return ''

	const renderNode = (node: ContentNode): string => {
		switch (node.type) {
			case 'paragraph': {
				const content = renderInlineContent(Array.isArray(node.content) ? node.content : [])
				if (!content) return '<p><br></p>'
				return `<p>${content}</p>`
			}

			case 'heading': {
				const level = node.attrs?.level || 1
				const content = renderInlineContent(Array.isArray(node.content) ? node.content : [])
				return `<h${level}>${content}</h${level}>`
			}

			case 'bulletList': {
				const bulletItems = Array.isArray(node.content) ? node.content : []
				const items = bulletItems
					.map((item: ContentNode) => {
						const itemContent = Array.isArray(item.content)
							? item.content.map(renderNode).join('')
							: ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ul>${items}</ul>`
			}

			case 'orderedList': {
				const orderedItems = Array.isArray(node.content) ? node.content : []
				const items = orderedItems
					.map((item: ContentNode) => {
						const itemContent = Array.isArray(item.content)
							? item.content.map(renderNode).join('')
							: ''
						return `<li>${itemContent}</li>`
					})
					.join('')
				return `<ol>${items}</ol>`
			}

			case 'listItem': {
				// List items are handled by their parent list
				return Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
			}

			case 'taskList': {
				const items = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<ul data-type="taskList">${items}</ul>`
			}

			case 'taskItem': {
				const checked = node.attrs?.checked === true
				const content = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<li data-type="taskItem" data-checked="${checked}">${content}</li>`
			}

			case 'blockquote': {
				const content = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<blockquote>${content}</blockquote>`
			}

			case 'codeBlock': {
				const language = (node.attrs?.language || '') as string
				const codeContent = Array.isArray(node.content) ? node.content[0]?.text || '' : ''
				return `<pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre>`
			}

			case 'image': {
				const src = (node.attrs?.src || '') as string
				const alt = escapeHtml(String(node.attrs?.alt || ''))
				const title = escapeHtml(String(node.attrs?.title || ''))
				const width = node.attrs?.width
				const height = node.attrs?.height
				const widthAttr = width ? ` width="${width}"` : ''
				const heightAttr = height ? ` height="${height}"` : ''

				// Check if we have a media ID stored in attributes first
				const mediaId = node.attrs?.mediaId || extractMediaIdFromUrl(src)

				if (mediaId) {
					// Always use direct photo permalink
					const photoUrl = options.albumSlug
						? `/photos/${options.albumSlug}/${mediaId}`
						: `/photos/${mediaId}`
					return `<figure class="interactive-figure"><a href="${photoUrl}" class="photo-link"><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} /></a>${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
				} else {
					return `<figure><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} />${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`
				}
			}

			case 'horizontalRule': {
				return '<hr>'
			}

			case 'hardBreak': {
				return '<br>'
			}

			case 'urlEmbed': {
				const url = (node.attrs?.url || '') as string
				const title = (node.attrs?.title || '') as string
				const description = (node.attrs?.description || '') as string
				const image = (node.attrs?.image || '') as string
				const favicon = (node.attrs?.favicon || '') as string
				const siteName = (node.attrs?.siteName || '') as string

				// Helper to get domain from URL
				const getDomain = (url: string) => {
					try {
						const urlObj = new URL(url)
						return urlObj.hostname.replace('www.', '')
					} catch {
						return ''
					}
				}

				// Helper to extract YouTube video ID
				const getYouTubeVideoId = (url: string): string | null => {
					const patterns = [
						/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
						/youtube\.com\/watch\?.*v=([^&\n?#]+)/
					]

					for (const pattern of patterns) {
						const match = url.match(pattern)
						if (match && match[1]) {
							return match[1]
						}
					}
					return null
				}

				// Check if it's a YouTube URL
				const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url)
				const videoId = isYouTube ? getYouTubeVideoId(url) : null

				if (isYouTube && videoId) {
					// Render YouTube embed
					let embedHtml = '<div class="url-embed-rendered url-embed-youtube">'
					embedHtml += '<div class="youtube-embed-wrapper">'
					embedHtml += `<iframe src="https://www.youtube.com/embed/${videoId}" `
					embedHtml += 'frameborder="0" '
					embedHtml +=
						'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
					embedHtml += 'allowfullscreen>'
					embedHtml += '</iframe>'
					embedHtml += '</div>'
					embedHtml += '</div>'
					return embedHtml
				}

				// Regular URL embed for non-YouTube links
				let embedHtml = '<div class="url-embed-rendered">'
				embedHtml += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="url-embed-link">`

				if (image) {
					embedHtml += `<div class="url-embed-image"><img src="${image}" alt="${title || 'Link preview'}" /></div>`
				}

				embedHtml += '<div class="url-embed-text">'
				embedHtml += '<div class="url-embed-meta">'
				if (favicon) {
					embedHtml += `<img src="${favicon}" alt="" class="url-embed-favicon" />`
				}
				embedHtml += `<span class="url-embed-domain">${siteName || getDomain(url)}</span>`
				embedHtml += '</div>'

				if (title) {
					embedHtml += `<h3 class="url-embed-title">${title}</h3>`
				}

				if (description) {
					embedHtml += `<p class="url-embed-description">${description}</p>`
				}

				embedHtml += '</div>'
				embedHtml += '</a>'
				embedHtml += '</div>'

				return embedHtml
			}

			case 'video': {
				const src = (node.attrs?.src || '') as string
				const title = (node.attrs?.title || '') as string
				let html = '<figure class="video-figure">'
				html += `<video src="${escapeHtml(src)}" controls preload="metadata" playsinline></video>`
				if (title) html += `<figcaption>${escapeHtml(title)}</figcaption>`
				html += '</figure>'
				return html
			}

			case 'audio': {
				const src = (node.attrs?.src || '') as string
				const title = (node.attrs?.title || '') as string
				const waveformData = node.attrs?.waveformData as number[] | null | undefined
				const waveformAttr = waveformData
					? ` data-waveform="${escapeHtml(JSON.stringify(waveformData))}"`
					: ''
				let html = '<figure class="audio-figure">'
				html += `<div data-audio-player data-src="${escapeHtml(src)}" data-title="${escapeHtml(title)}"${waveformAttr}></div>`
				if (title) html += `<figcaption>${escapeHtml(title)}</figcaption>`
				html += '</figure>'
				return html
			}

			case 'gallery': {
				const images = Array.isArray(node.attrs?.images)
					? (node.attrs.images as Array<Record<string, unknown>>)
					: []
				const layout = ['grid', 'masonry', 'carousel'].includes(String(node.attrs?.layout))
					? String(node.attrs?.layout)
					: 'grid'
				const columns = Number(node.attrs?.columns ?? 3)
				const safeColumns = Number.isFinite(columns)
					? Math.min(6, Math.max(1, Math.floor(columns)))
					: 3
				const items = images
					.map((image) => {
						const id = image.id === undefined || image.id === null ? null : String(image.id)
						const src = escapeHtml(String(image.url ?? ''))
						const alt = escapeHtml(String(image.alt ?? ''))
						const title = escapeHtml(String(image.title ?? ''))
						const imageHtml = `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" />`
						const caption = title ? `<figcaption>${title}</figcaption>` : ''
						if (!id) return `<figure class="edra-gallery-item">${imageHtml}${caption}</figure>`
						const photoUrl = options.albumSlug
							? `/photos/${escapeHtml(options.albumSlug)}/${escapeHtml(id)}`
							: `/photos/${escapeHtml(id)}`
						return `<figure class="edra-gallery-item"><a href="${photoUrl}" class="photo-link">${imageHtml}</a>${caption}</figure>`
					})
					.join('')
				return `<div class="edra-gallery-container" data-layout="${layout}" data-columns="${safeColumns}"><div class="edra-gallery-grid ${layout}">${items}</div></div>`
			}

			case 'geolocation': {
				const latitude = Number(node.attrs?.latitude)
				const longitude = Number(node.attrs?.longitude)
				if (
					!Number.isFinite(latitude) ||
					!Number.isFinite(longitude) ||
					Math.abs(latitude) > 90 ||
					Math.abs(longitude) > 180
				)
					return ''
				const zoom = Number(node.attrs?.zoom ?? 15)
				const safeZoom = Number.isFinite(zoom) ? Math.min(19, Math.max(1, zoom)) : 15
				const title = escapeHtml(String(node.attrs?.title ?? 'Location'))
				const description = escapeHtml(String(node.attrs?.description ?? ''))
				const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${safeZoom}/${latitude}/${longitude}`
				const span = 180 / 2 ** (safeZoom - 1)
				const bbox = [
					Math.max(-180, longitude - span),
					Math.max(-90, latitude - span / 2),
					Math.min(180, longitude + span),
					Math.min(90, latitude + span / 2)
				].join(',')
				const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
				return `<figure class="geolocation-rendered" data-latitude="${latitude}" data-longitude="${longitude}" data-zoom="${safeZoom}"><iframe src="${escapeHtml(embedUrl)}" title="${title || 'Location'}" loading="lazy"></iframe><a href="${mapUrl}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong>${description ? `<span>${description}</span>` : ''}</a></figure>`
			}

			case 'iframe': {
				const src = escapeHtml(String(node.attrs?.src ?? ''))
				if (!src) return ''
				const title = escapeHtml(String(node.attrs?.title ?? 'Embedded content'))
				const width = escapeHtml(String(node.attrs?.width ?? '100%'))
				const height = escapeHtml(String(node.attrs?.height ?? '480'))
				return `<div class="iframe-wrapper"><iframe src="${src}" title="${title}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe></div>`
			}

			case 'table': {
				const rows = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<div class="tableWrapper"><table><tbody>${rows}</tbody></table></div>`
			}

			case 'tableRow': {
				const cells = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<tr>${cells}</tr>`
			}

			case 'tableHeader':
			case 'tableCell': {
				const tag = node.type === 'tableHeader' ? 'th' : 'td'
				const colspan = Number(node.attrs?.colspan ?? 1)
				const rowspan = Number(node.attrs?.rowspan ?? 1)
				const attributes = `${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}`
				const content = Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				return `<${tag}${attributes}>${content}</${tag}>`
			}

			case 'inlineMath': {
				const latex = escapeHtml(String(node.attrs?.latex ?? ''))
				return `<span class="math-inline" data-latex="${latex}">${latex}</span>`
			}

			case 'blockMath': {
				const latex = escapeHtml(String(node.attrs?.latex ?? ''))
				return `<div class="math-block" data-latex="${latex}">${latex}</div>`
			}

			default: {
				// For any unknown block types, try to render their content
				if (node.content) {
					return Array.isArray(node.content) ? node.content.map(renderNode).join('') : ''
				}
				return ''
			}
		}
	}

	// Render inline content (text nodes with marks)
	const renderInlineContent = (content: ContentNode[]): string => {
		return content
			.map((node: ContentNode) => {
				if (node.type === 'text') {
					let text = escapeHtml(node.text || '')

					// Apply marks (bold, italic, etc.)
					if (node.marks) {
						node.marks.forEach((mark: Mark) => {
							switch (mark.type) {
								case 'bold':
									text = `<strong>${text}</strong>`
									break
								case 'italic':
									text = `<em>${text}</em>`
									break
								case 'underline':
									text = `<u>${text}</u>`
									break
								case 'strike':
									text = `<s>${text}</s>`
									break
								case 'code':
									text = `<code>${text}</code>`
									break
								case 'link': {
									const href = mark.attrs?.href || '#'
									const target = mark.attrs?.target || '_blank'
									text = `<a href="${href}" target="${target}" rel="noopener noreferrer">${text}</a>`
									break
								}
								case 'highlight':
									text = `<mark>${text}</mark>`
									break
								case 'subscript':
									text = `<sub>${text}</sub>`
									break
								case 'superscript':
									text = `<sup>${text}</sup>`
									break
							}
						})
					}

					return text
				}

				// Handle other inline nodes
				return renderNode(node)
			})
			.join('')
	}

	// Helper to escape HTML
	const escapeHtml = (str: string): string => {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
	}

	return (doc.content as ContentNode[]).map(renderNode).join('')
}
