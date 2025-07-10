<script lang="ts">
	import { onMount } from 'svelte'
	import type { Snippet } from 'svelte'

	interface BaseItem {
		value: string | number
		label: string
		href?: string
		[key: string]: any
	}

	interface Props<T extends BaseItem = BaseItem> {
		items: T[]
		value?: string | number
		defaultValue?: string | number
		onChange?: (value: string | number, item: T) => void
		variant?: 'navigation' | 'selection'
		size?: 'small' | 'medium' | 'large'
		fullWidth?: boolean
		pillColor?: string | ((item: T) => string)
		showPill?: boolean
		gap?: number
		containerPadding?: number
		class?: string
		children?: Snippet<[{ item: T; index: number; isActive: boolean; isHovered: boolean }]>
	}

	let {
		items = [],
		value = $bindable(),
		defaultValue,
		onChange,
		variant = 'selection',
		size = 'medium',
		fullWidth = false,
		pillColor = 'white',
		showPill = true,
		gap = 4,
		containerPadding = 4,
		class: className = '',
		children
	}: Props = $props()

	// State
	let containerElement: HTMLElement
	let itemElements: HTMLElement[] = []
	let pillStyle = ''
	let hoveredIndex = $state(-1)
	let internalValue = $state(defaultValue ?? value ?? items[0]?.value ?? '')

	// Derived state
	const currentValue = $derived(value ?? internalValue)
	const activeIndex = $derived(items.findIndex((item) => item.value === currentValue))

	// Effects
	$effect(() => {
		if (value !== undefined) {
			internalValue = value
		}
	})

	$effect(() => {
		updatePillPosition()
	})

	// Functions
	function updatePillPosition() {
		if (!showPill) return

		if (activeIndex >= 0 && itemElements[activeIndex] && containerElement) {
			const activeElement = itemElements[activeIndex]
			const containerRect = containerElement.getBoundingClientRect()
			const activeRect = activeElement.getBoundingClientRect()

			const left = activeRect.left - containerRect.left - containerPadding
			const width = activeRect.width

			pillStyle = `transform: translateX(${left}px); width: ${width}px;`
		} else {
			pillStyle = 'opacity: 0;'
		}
	}

	function handleItemClick(item: BaseItem, index: number) {
		if (variant === 'selection') {
			const newValue = item.value
			internalValue = newValue
			if (value === undefined) {
				// Uncontrolled mode
				value = newValue
			}
			onChange?.(newValue, item)
		}
		// Navigation variant handles clicks via href
	}

	function handleKeyDown(event: KeyboardEvent) {
		const currentIndex = activeIndex >= 0 ? activeIndex : 0
		let newIndex = currentIndex

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault()
				newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
				break
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault()
				newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
				break
			case 'Home':
				event.preventDefault()
				newIndex = 0
				break
			case 'End':
				event.preventDefault()
				newIndex = items.length - 1
				break
			case 'Enter':
			case ' ':
				if (variant === 'navigation' && items[currentIndex]?.href) {
					// Let the link handle navigation
					return
				}
				event.preventDefault()
				if (items[currentIndex]) {
					handleItemClick(items[currentIndex], currentIndex)
				}
				return
		}

		if (newIndex !== currentIndex && items[newIndex]) {
			if (variant === 'navigation' && items[newIndex].href) {
				// Focus the link
				itemElements[newIndex]?.focus()
			} else {
				handleItemClick(items[newIndex], newIndex)
			}
		}
	}

	function getPillColor(item: BaseItem): string {
		if (typeof pillColor === 'function') {
			return pillColor(item)
		}
		return pillColor
	}

	// Lifecycle
	onMount(() => {
		const handleResize = () => updatePillPosition()
		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	})

	// Size classes
	const sizeClasses = {
		small: 'segmented-controller-small',
		medium: 'segmented-controller-medium',
		large: 'segmented-controller-large'
	}
</script>

<div
	bind:this={containerElement}
	class="base-segmented-controller {sizeClasses[size]} {className}"
	class:full-width={fullWidth}
	role="tablist"
	style="--gap: {gap}px; --container-padding: {containerPadding}px;"
	onkeydown={handleKeyDown}
>
	{#if showPill && activeIndex >= 0}
		<div
			class="segmented-pill"
			style="{pillStyle}; background-color: {getPillColor(items[activeIndex])};"
			aria-hidden="true"
		></div>
	{/if}

	{#each items as item, index}
		{@const isActive = index === activeIndex}
		{@const isHovered = index === hoveredIndex}

		{#if variant === 'navigation' && item.href}
			<a
				bind:this={itemElements[index]}
				href={item.href}
				class="segmented-item"
				class:active={isActive}
				role="tab"
				aria-selected={isActive}
				tabindex={isActive ? 0 : -1}
				onmouseenter={() => (hoveredIndex = index)}
				onmouseleave={() => (hoveredIndex = -1)}
			>
				{#if children}
					{@render children({ item, index, isActive, isHovered })}
				{:else}
					<span class="item-label">{item.label}</span>
				{/if}
			</a>
		{:else}
			<button
				bind:this={itemElements[index]}
				type="button"
				class="segmented-item"
				class:active={isActive}
				role="tab"
				aria-selected={isActive}
				tabindex={isActive ? 0 : -1}
				onclick={() => handleItemClick(item, index)}
				onmouseenter={() => (hoveredIndex = index)}
				onmouseleave={() => (hoveredIndex = -1)}
			>
				{#if children}
					{@render children({ item, index, isActive, isHovered })}
				{:else}
					<span class="item-label">{item.label}</span>
				{/if}
			</button>
		{/if}
	{/each}
</div>

<style lang="scss">
	.base-segmented-controller {
		display: inline-flex;
		align-items: center;
		gap: var(--gap);
		padding: var(--container-padding);
		background-color: $gray-90;
		border-radius: $corner-radius-xl;
		position: relative;
		box-sizing: border-box;

		&.full-width {
			width: 100%;

			.segmented-item {
				flex: 1;
			}
		}
	}

	.segmented-pill {
		position: absolute;
		top: var(--container-padding);
		bottom: var(--container-padding);
		background-color: white;
		border-radius: $corner-radius-lg;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: $shadow-sm;
		z-index: $z-index-base;
		pointer-events: none;
	}

	.segmented-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		cursor: pointer;
		text-decoration: none;
		border-radius: $corner-radius-lg;
		transition: all 0.2s ease;
		z-index: $z-index-above;
		font-family: inherit;
		outline: none;

		&:not(.active):hover {
			background-color: rgba(0, 0, 0, 0.05);
		}

		&:focus-visible {
			box-shadow: 0 0 0 2px $blue-50;
		}

		&.active {
			color: $gray-10;

			.item-label {
				font-weight: 600;
			}
		}

		&:not(.active) {
			color: $gray-50;

			&:hover {
				color: $gray-30;
			}
		}
	}

	.item-label {
		position: relative;
		transition: all 0.2s ease;
		white-space: nowrap;
		user-select: none;
	}

	// Size variants
	.segmented-controller-small {
		.segmented-item {
			padding: $unit $unit-2x;
			font-size: 0.875rem;
			min-height: 32px;
		}
	}

	.segmented-controller-medium {
		.segmented-item {
			padding: calc($unit + $unit-half) $unit-3x;
			font-size: 0.9375rem;
			min-height: 40px;
		}
	}

	.segmented-controller-large {
		.segmented-item {
			padding: $unit-2x $unit-4x;
			font-size: 1rem;
			min-height: 48px;
		}
	}

	// Animation states
	@media (prefers-reduced-motion: reduce) {
		.segmented-pill,
		.segmented-item {
			transition: none;
		}
	}
</style>
