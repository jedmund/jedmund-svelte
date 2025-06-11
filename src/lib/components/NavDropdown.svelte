<script lang="ts">
	import WorkIcon from '$icons/work.svg'
	import LabsIcon from '$icons/labs.svg'
	import UniverseIcon from '$icons/universe.svg'
	import PhotosIcon from '$icons/photos.svg'
	import ChevronDownIcon from '$icons/chevron-down.svg'
	import { page } from '$app/stores'

	const currentPath = $derived($page.url.pathname)
	let isOpen = $state(false)
	let dropdownElement: HTMLDivElement

	interface NavItem {
		icon: typeof WorkIcon
		text: string
		href: string
		variant: 'work' | 'universe' | 'labs' | 'photos'
	}

	const navItems: NavItem[] = [
		{ icon: WorkIcon, text: 'Work', href: '/', variant: 'work' },
		{ icon: UniverseIcon, text: 'Universe', href: '/universe', variant: 'universe' },
		{ icon: PhotosIcon, text: 'Photos', href: '/photos', variant: 'photos' },
		{ icon: LabsIcon, text: 'Labs', href: '/labs', variant: 'labs' }
	]

	// Get current active item
	const activeItem = $derived(
		currentPath === '/'
			? navItems[0]
			: navItems.find((item) => currentPath.startsWith(item.href === '/' ? '/work' : item.href)) ||
					navItems[0]
	)

	// Get background color based on variant
	function getBgColor(variant: string): string {
		switch (variant) {
			case 'work':
				return '#ffcdc5'
			case 'photos':
				return '#e8c5ff'
			case 'universe':
				return '#ffebc5'
			case 'labs':
				return '#c5eaff'
			default:
				return '#c5eaff'
		}
	}

	// Get text color based on variant
	function getTextColor(variant: string): string {
		switch (variant) {
			case 'work':
				return '#d0290d'
			case 'photos':
				return '#7c3aed'
			case 'universe':
				return '#b97d14'
			case 'labs':
				return '#1482c1'
			default:
				return '#1482c1'
		}
	}

	function toggleDropdown(e: MouseEvent) {
		e.stopPropagation()
		isOpen = !isOpen
		console.log('Dropdown toggled:', isOpen)
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
			isOpen = false
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false
		}
	}

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.addEventListener('click', handleClickOutside)
			document.addEventListener('keydown', handleKeydown)

			return () => {
				document.removeEventListener('click', handleClickOutside)
				document.removeEventListener('keydown', handleKeydown)
			}
		}
	})
</script>

<div class="nav-dropdown" bind:this={dropdownElement}>
	<button
		class="dropdown-trigger"
		onclick={toggleDropdown}
		aria-expanded={isOpen}
		aria-haspopup="true"
		style="color: {getTextColor(activeItem.variant)};"
	>
		<svelte:component this={activeItem.icon} class="nav-icon" />
		<span>{activeItem.text}</span>
		<ChevronDownIcon class="chevron {isOpen ? 'open' : ''}" />
	</button>

	{#if isOpen}
		<div class="dropdown-menu">
			{#each navItems as item}
				<a
					href={item.href}
					class="dropdown-item"
					class:active={item === activeItem}
					onclick={() => (isOpen = false)}
				>
					<svelte:component this={item.icon} class="nav-icon" />
					<span>{item.text}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.nav-dropdown {
		position: relative;
		height: 52px; // Match avatar height
		min-width: 180px; // Wider to better match dropdown menu
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		gap: $unit;
		width: 100%;
		height: 100%;
		padding: 0 $unit-2x;
		border: none;
		border-radius: 100px;
		background: white;
		font-size: 1rem;
		font-weight: 400;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

		&:hover {
			transform: translateY(-1px);
			box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		}

		&:active {
			transform: translateY(0);
		}

		:global(svg.nav-icon) {
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			fill: currentColor;
		}

		:global(svg.chevron) {
			width: 16px;
			height: 16px;
			margin-left: auto;
			flex-shrink: 0;
			transition: transform 0.2s ease;
			fill: none;
			stroke: currentColor;
			stroke-width: 2px;
			stroke-linecap: round;
			stroke-linejoin: round;

			&.open {
				transform: rotate(180deg);
			}
		}
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit);
		left: 50%;
		transform: translateX(-50%);
		min-width: 180px;
		background: white;
		border-radius: $unit-2x;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: $unit;
		z-index: 1000;
		animation: dropdownOpen 0.2s ease;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x $unit-2x;
		border-radius: $unit;
		text-decoration: none;
		color: $grey-20;
		font-size: 1rem;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-97;
		}

		&.active {
			background-color: $grey-95;
			font-weight: 500;
		}

		:global(svg.nav-icon) {
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			fill: currentColor;
		}
	}

	@keyframes dropdownOpen {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
