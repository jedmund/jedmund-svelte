import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { lockModalScroll, modalFocus } from '../src/lib/components/admin/modal-lifecycle.ts'

function mockBrowser(t: TestContext) {
	const listeners = new Set<(event: KeyboardEvent) => void>()
	const frames = new Map<number, FrameRequestCallback>()
	let frameId = 0
	class Element {
		style = { position: 'relative', top: '2px', width: '90%', overflow: 'auto' }
		isConnected = true
		children: Element[] = []
		contains(element: unknown) {
			return element === this || this.children.includes(element as Element)
		}
		querySelectorAll() {
			return this.children
		}
		getClientRects() {
			return [1]
		}
		closest() {
			return null
		}
		focus() {
			document.activeElement = this
		}
	}
	const body = new Element()
	const document = {
		body,
		activeElement: body,
		addEventListener: (_: string, callback: (event: KeyboardEvent) => void) =>
			listeners.add(callback),
		removeEventListener: (_: string, callback: (event: KeyboardEvent) => void) =>
			listeners.delete(callback)
	}
	const scrolls: number[][] = []
	const mocks = {
		document,
		window: { scrollY: 125, scrollTo: (x: number, y: number) => scrolls.push([x, y]) },
		HTMLElement: Element,
		requestAnimationFrame: (callback: FrameRequestCallback) => {
			frames.set(++frameId, callback)
			return frameId
		},
		cancelAnimationFrame: (id: number) => frames.delete(id)
	}
	for (const [key, value] of Object.entries(mocks)) {
		const previous = Object.getOwnPropertyDescriptor(globalThis, key)
		Object.defineProperty(globalThis, key, { value, configurable: true })
		t.after(() => {
			if (previous) Object.defineProperty(globalThis, key, previous)
			else Reflect.deleteProperty(globalThis, key)
		})
	}
	return { Element, document, listeners, frames, scrolls }
}

test('nested modal locks restore original body styles only after the last release', (t) => {
	const { document, scrolls } = mockBrowser(t)
	const original = { ...document.body.style }
	const outer = lockModalScroll()
	const inner = lockModalScroll()
	assert.equal(document.body.style.position, 'fixed')
	inner()
	inner()
	assert.equal(document.body.style.overflow, 'hidden')
	outer()
	assert.deepEqual(document.body.style, original)
	assert.deepEqual(scrolls, [[0, 125]])
})

test('modal focus traps Tab, closes only topmost dialog on Escape, and restores opener', (t) => {
	const { Element, document, listeners, frames } = mockBrowser(t)
	const opener = new Element()
	opener.focus()
	const outer = new Element()
	const first = new Element()
	const last = new Element()
	outer.children = [first, last]
	let outerClosed = 0
	const outerAction = modalFocus(outer as unknown as HTMLElement, {
		isOpen: () => true,
		closeOnEscape: () => true,
		close: () => outerClosed++
	})
	for (const callback of frames.values()) callback(0)
	assert.equal(document.activeElement, first)
	last.focus()
	let prevented = false
	const key = (value: string) =>
		({
			key: value,
			shiftKey: false,
			preventDefault: () => {
				prevented = true
			},
			stopPropagation() {}
		}) as KeyboardEvent
	for (const listener of listeners) listener(key('Tab'))
	assert.equal(prevented, true)
	assert.equal(document.activeElement, first)
	const child = new Element()
	let childClosed = 0
	const childAction = modalFocus(child as unknown as HTMLElement, {
		isOpen: () => true,
		closeOnEscape: () => true,
		close: () => childClosed++
	})
	for (const callback of frames.values()) callback(0)
	for (const listener of listeners) listener(key('Escape'))
	assert.equal(childClosed, 1)
	assert.equal(outerClosed, 0)
	childAction.destroy()
	assert.equal(document.activeElement, first)
	outerAction.destroy()
	assert.equal(document.activeElement, opener)
	assert.equal(listeners.size, 0)
	assert.equal(frames.size, 0)
})
