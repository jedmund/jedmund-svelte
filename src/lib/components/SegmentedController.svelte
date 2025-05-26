<script lang="ts">
	import WorkIcon from '$icons/work.svg'
	import LabsIcon from '$icons/labs.svg'
	import UniverseIcon from '$icons/universe.svg'
	import PhotosIcon from '$icons/photos.svg'
	import { page } from '$app/stores'
	
	const currentPath = $derived($page.url.pathname)
	
	interface NavItem {
		icon: typeof WorkIcon
		text: string
		href: string
		variant: 'work' | 'universe' | 'labs' | 'photos'
	}
	
	const navItems: NavItem[] = [
		{ icon: WorkIcon, text: 'Work', href: '/', variant: 'work' },
		{ icon: PhotosIcon, text: 'Photos', href: '/photos', variant: 'photos' },
		{ icon: LabsIcon, text: 'Labs', href: '#', variant: 'labs' },
		{ icon: UniverseIcon, text: 'Universe', href: '/universe', variant: 'universe' }
	]
	
	// Track hover state for each item
	let hoveredIndex = $state<number | null>(null)
	
	// Calculate active index based on current path
	const activeIndex = $derived(
		currentPath === '/' ? 0 : 
		currentPath.startsWith('/photos') ? 1 :
		currentPath.startsWith('/universe') ? 3 : 
		-1
	)
	
	// Calculate pill position and width
	let containerElement: HTMLElement
	let itemElements: HTMLAnchorElement[] = []
	let pillStyle = $state('')
	
	function updatePillPosition() {
		if (activeIndex >= 0 && itemElements[activeIndex] && containerElement) {
			const activeElement = itemElements[activeIndex]
			const containerRect = containerElement.getBoundingClientRect()
			const activeRect = activeElement.getBoundingClientRect()
			
			// Subtract the container padding (8px) from the left position
			const left = activeRect.left - containerRect.left - 8
			const width = activeRect.width
			
			pillStyle = `transform: translateX(${left}px); width: ${width}px;`
		}
	}
	
	$effect(() => {
		updatePillPosition()
		
		// Handle window resize
		const handleResize = () => updatePillPosition()
		window.addEventListener('resize', handleResize)
		
		return () => {
			window.removeEventListener('resize', handleResize)
		}
	})
	
	// Get background color based on variant
	function getBgColor(variant: string): string {
		switch (variant) {
			case 'work': return '#ffcdc5' // $work-bg
			case 'photos': return '#e8c5ff' // $photos-bg (purple)
			case 'universe': return '#ffebc5' // $universe-bg
			case 'labs': return '#c5eaff' // $labs-bg
			default: return '#c5eaff'
		}
	}
	
	// Get text color based on variant
	function getTextColor(variant: string): string {
		switch (variant) {
			case 'work': return '#d0290d' // $work-color
			case 'photos': return '#7c3aed' // $photos-color (purple)
			case 'universe': return '#b97d14' // $universe-color
			case 'labs': return '#1482c1' // $labs-color
			default: return '#1482c1'
		}
	}
</script>

<nav class="segmented-controller" bind:this={containerElement}>
	{#if activeIndex >= 0}
		<div 
			class="active-pill"
			style="{pillStyle} background-color: {getBgColor(navItems[activeIndex].variant)};"
		></div>
	{/if}
	
	{#each navItems as item, index}
		<a 
			href={item.href}
			class="nav-item"
			class:active={index === activeIndex}
			bind:this={itemElements[index]}
			style="color: {index === activeIndex ? getTextColor(item.variant) : '#666'};"
			onmouseenter={() => hoveredIndex = index}
			onmouseleave={() => hoveredIndex = null}
		>
			<svelte:component this={item.icon} class="nav-icon {hoveredIndex === index ? 'animate' : ''}" />
			<span>{item.text}</span>
		</a>
	{/each}
</nav>

<style lang="scss">
	.segmented-controller {
		display: flex;
		align-items: center;
		gap: 4px;
		background: $grey-100;
		padding: $unit;
		border-radius: 100px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
	}
	
	.active-pill {
		position: absolute;
		top: $unit;
		left: $unit;
		height: calc(100% - #{$unit * 2});
		border-radius: 100px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 1;
	}
	
	.nav-item {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 10px 12px;
		border-radius: 100px;
		text-decoration: none;
		font-size: 1rem;
		font-weight: 400;
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
		position: relative;
		z-index: 2;
		transition: color 0.2s ease;
		
		:global(svg.nav-icon) {
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			fill: currentColor;
			transition: fill 0.2s ease;
			
			&.animate {
				animation: iconPulse 0.6s ease;
			}
		}
		
	}
	
	// Different animations for each nav item
	// First item is Work (index 1)
	.nav-item:nth-of-type(1) :global(svg.animate) {
		animation: cursorWiggle 0.6s ease;
	}
	
	// Second item is Photos (index 2)
	.nav-item:nth-of-type(2) :global(svg.animate) {
		animation: photoFlash 0.6s ease;
	}
	
	// Third item is Labs (index 3)
	.nav-item:nth-of-type(3) :global(svg.animate) {
		animation: tubeBubble 0.6s ease;
	}
	
	// Fourth item is Universe (index 4)
	.nav-item:nth-of-type(4) :global(svg.animate) {
		animation: starSpin 0.6s ease;
	}
	
	@keyframes cursorWiggle {
		0%, 100% { transform: rotate(0deg) scale(1); }
		25% { transform: rotate(-8deg) scale(1.05); }
		75% { transform: rotate(8deg) scale(1.05); }
	}
	
	@keyframes photoFlash {
		0%, 100% { transform: scale(1); filter: brightness(1); }
		50% { transform: scale(1.1); filter: brightness(1.3); }
	}
	
	@keyframes tubeBubble {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-2px) scale(1.1); }
	}
	
	@keyframes starSpin {
		0%, 100% { transform: rotate(0deg) scale(1); }
		50% { transform: rotate(45deg) scale(1.1); }
	}
</style>