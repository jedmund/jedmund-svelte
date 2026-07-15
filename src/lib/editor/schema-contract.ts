export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface RichTextDocument {
	type: 'doc'
	content?: RichTextNode[]
	[key: string]: JsonValue | RichTextNode[] | undefined
}

export interface RichTextNode {
	type: string
	attrs?: Record<string, JsonValue>
	content?: RichTextNode[]
	marks?: RichTextMark[]
	text?: string
	[key: string]: JsonValue | RichTextNode[] | RichTextMark[] | undefined
}

export interface RichTextMark {
	type: string
	attrs?: Record<string, JsonValue>
}

export interface CorpusDocument {
	source: string
	id: string | number
	field: string
	content: RichTextDocument
}

export interface ValueSummary {
	count: number
	types: Record<string, number>
}

export interface SchemaManifest {
	documents: number
	nodes: Record<string, number>
	marks: Record<string, number>
	attributes: Record<string, ValueSummary>
}

export type JsonDifferenceKind = 'added' | 'removed' | 'changed' | 'type-changed'

export interface JsonDifference {
	path: string
	kind: JsonDifferenceKind
	before?: JsonValue
	after?: JsonValue
}

const NODE_SCHEMA_DEFAULTS: Record<string, Record<string, JsonValue>> = {
	audio: { align: 'left', width: '100%' },
	gallery: { columns: 3, gap: '16px', layout: 'grid' },
	geolocation: { markerColor: '#ef4444', zoom: 15 },
	iframe: { align: 'left', width: '100%' },
	image: { align: 'left', width: '100%' },
	tableCell: { colspan: 1, rowspan: 1 },
	tableHeader: { colspan: 1, rowspan: 1 },
	video: { align: 'left', width: '100%' }
}

const MARK_SCHEMA_DEFAULTS: Record<string, Record<string, JsonValue>> = {
	link: {
		rel: 'noopener noreferrer nofollow',
		target: '_blank'
	}
}

const increment = (counts: Record<string, number>, key: string): void => {
	counts[key] = (counts[key] ?? 0) + 1
}

const valueType = (value: JsonValue): string => {
	if (value === null) return 'null'
	if (Array.isArray(value)) return 'array'
	return typeof value
}

const recordAttribute = (
	attributes: Record<string, ValueSummary>,
	owner: string,
	name: string,
	value: JsonValue
): void => {
	const key = `${owner}.${name}`
	const summary = (attributes[key] ??= { count: 0, types: {} })
	summary.count += 1
	increment(summary.types, valueType(value))
}

export const isRichTextDocument = (value: unknown): value is RichTextDocument => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const candidate = value as Record<string, unknown>
	return (
		candidate.type === 'doc' &&
		(candidate.content === undefined || Array.isArray(candidate.content))
	)
}

export const createSchemaManifest = (documents: CorpusDocument[]): SchemaManifest => {
	const manifest: SchemaManifest = {
		documents: documents.length,
		nodes: {},
		marks: {},
		attributes: {}
	}

	const visit = (node: RichTextNode): void => {
		increment(manifest.nodes, node.type)

		for (const [name, value] of Object.entries(node.attrs ?? {})) {
			recordAttribute(manifest.attributes, `node:${node.type}`, name, value)
		}

		for (const mark of node.marks ?? []) {
			increment(manifest.marks, mark.type)
			for (const [name, value] of Object.entries(mark.attrs ?? {})) {
				recordAttribute(manifest.attributes, `mark:${mark.type}`, name, value)
			}
		}

		for (const child of node.content ?? []) visit(child)
	}

	for (const document of documents) {
		increment(manifest.nodes, document.content.type)
		for (const node of document.content.content ?? []) visit(node)
	}

	return normalizeEditorJson(manifest) as unknown as SchemaManifest
}

export const normalizeEditorJson = (value: unknown): JsonValue => {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value
	}

	if (Array.isArray(value)) return value.map(normalizeEditorJson)

	if (typeof value === 'object') {
		const normalized: Record<string, JsonValue> = {}
		for (const key of Object.keys(value).sort()) {
			const item = (value as Record<string, unknown>)[key]
			if (item !== undefined) normalized[key] = normalizeEditorJson(item)
		}
		return normalized
	}

	throw new TypeError(`Unsupported editor JSON value: ${typeof value}`)
}

const normalizeAttributes = (
	attributes: Record<string, JsonValue> | undefined,
	defaults: Record<string, JsonValue> = {}
): Record<string, JsonValue> | undefined => {
	if (!attributes) return undefined

	const normalized = Object.fromEntries(
		Object.entries(attributes).filter(([name, value]) => value !== null && value !== defaults[name])
	) as Record<string, JsonValue>

	return Object.keys(normalized).length > 0 ? normalized : undefined
}

/**
 * Canonicalizes defaults that TipTap/ProseMirror materialize while parsing JSON.
 * Mark order is schema-rank dependent and is semantically unordered.
 */
export const normalizeSchemaRoundTripJson = (document: RichTextDocument): RichTextDocument => {
	const normalizeMark = (mark: RichTextMark): RichTextMark => {
		const attrs = normalizeAttributes(mark.attrs, MARK_SCHEMA_DEFAULTS[mark.type])
		return attrs ? { type: mark.type, attrs } : { type: mark.type }
	}

	const normalizeNode = (node: RichTextNode): RichTextNode => {
		const normalized: RichTextNode = { type: node.type }
		const attrs = normalizeAttributes(node.attrs, NODE_SCHEMA_DEFAULTS[node.type])
		if (attrs) normalized.attrs = attrs
		if (node.text !== undefined) normalized.text = node.text
		if (node.marks) {
			normalized.marks = node.marks
				.map(normalizeMark)
				.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
		}
		if (node.content) normalized.content = node.content.map(normalizeNode)
		return normalized
	}

	return {
		type: 'doc',
		...(document.content ? { content: document.content.map(normalizeNode) } : {})
	}
}

export const compareEditorJson = (before: unknown, after: unknown): JsonDifference[] => {
	const left = normalizeEditorJson(before)
	const right = normalizeEditorJson(after)
	const differences: JsonDifference[] = []

	const compare = (a: JsonValue | undefined, b: JsonValue | undefined, path: string): void => {
		if (a === undefined) {
			differences.push({ path, kind: 'added', after: b })
			return
		}
		if (b === undefined) {
			differences.push({ path, kind: 'removed', before: a })
			return
		}

		const aType = valueType(a)
		const bType = valueType(b)
		if (aType !== bType) {
			differences.push({ path, kind: 'type-changed', before: a, after: b })
			return
		}

		if (Array.isArray(a) && Array.isArray(b)) {
			const length = Math.max(a.length, b.length)
			for (let index = 0; index < length; index += 1) {
				compare(a[index], b[index], `${path}[${index}]`)
			}
			return
		}

		if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
			const aRecord = a as Record<string, JsonValue>
			const bRecord = b as Record<string, JsonValue>
			const keys = new Set([...Object.keys(aRecord), ...Object.keys(bRecord)])
			for (const key of [...keys].sort()) {
				compare(aRecord[key], bRecord[key], path ? `${path}.${key}` : key)
			}
			return
		}

		if (a !== b) differences.push({ path, kind: 'changed', before: a, after: b })
	}

	compare(left, right, '$')
	return differences
}
