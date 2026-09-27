export function createSvgLogo(url: () => string | null) {
	let content = $state('')
	$effect(() => {
		const source = url()
		content = ''
		if (!source) return
		const abort = new AbortController()
		fetch(source, { signal: abort.signal })
			.then(async (response) => {
				if (!response.ok) return
				const text = await response.text()
				if (abort.signal.aborted) return
				const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
				const svg = doc.querySelector('svg')
				if (!svg) return
				svg.removeAttribute('width')
				svg.removeAttribute('height')
				content = svg.outerHTML
			})
			.catch((error) => {
				if (!abort.signal.aborted) console.error('Failed to load SVG:', error)
			})
		return () => abort.abort()
	})
	return {
		get content() {
			return content
		}
	}
}
