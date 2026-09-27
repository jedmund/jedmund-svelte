export function createCardTilt(strength: number, scale: number) {
	let element = $state<HTMLElement>()
	let hovering = false
	let transform = $state('')
	let logoTransform = $state('')
	return {
		get element() {
			return element
		},
		set element(value: HTMLElement | undefined) {
			element = value
		},
		get transform() {
			return transform
		},
		get logoTransform() {
			return logoTransform
		},
		enter() {
			hovering = true
		},
		leave() {
			hovering = false
			transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
			logoTransform = 'translate(0, 0)'
		},
		move(event: MouseEvent) {
			if (!element || !hovering) return
			const rect = element.getBoundingClientRect()
			if (!rect.width || !rect.height) return
			const rotateX = ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -strength
			const rotateY = ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * strength
			transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
			logoTransform = `translate(${-rotateY * 1.25}px, ${rotateX * 1.25}px)`
		}
	}
}
