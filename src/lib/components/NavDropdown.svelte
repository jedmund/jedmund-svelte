<script lang="ts">
	import WorkIcon from '$icons/work.svg'
	import LabsIcon from '$icons/labs.svg'
	import UniverseIcon from '$icons/universe.svg'
	import PhotosIcon from '$icons/photos.svg'
	import AboutIcon from '$icons/about.svg'
	import ChevronDownIcon from '$icons/chevron-down.svg'
	import { page } from '$app/stores'

	const currentPath = $derived($page.url.pathname)
	let isOpen = $state(false)
	let dropdownElement: HTMLDivElement

	interface NavItem {
		icon: typeof WorkIcon
		text: string
		href: string
		variant: 'work' | 'universe' | 'labs' | 'photos' | 'about'
		subItems?: { text: string; href: string }[]
	}

	const navItems: NavItem[] = [
		{ icon: WorkIcon, text: 'Work', href: '/', variant: 'work' },
		{ icon: UniverseIcon, text: 'Universe', href: '/universe', variant: 'universe' },
		{
			icon: PhotosIcon,
			text: 'Photography',
			href: '/photos',
			variant: 'photos',
			subItems: [
				{ text: 'Photos', href: '/photos' },
				{ text: 'Albums', href: '/albums' }
			]
		},
		{ icon: LabsIcon, text: 'Labs', href: '/labs', variant: 'labs' },
		{ icon: AboutIcon, text: 'About', href: '/about', variant: 'about' }
	]

	// Get current active item
	const activeItem = $derived(
		currentPath === '/'
			? navItems[0]
			: currentPath === '/about'
				? navItems[4]
				: currentPath.startsWith('/albums') || currentPath.startsWith('/photos')
					? navItems.find((item) => item.variant === 'photos')
					: navItems.find((item) =>
							currentPath.startsWith(item.href === '/' ? '/work' : item.href)
						) || navItems[0]
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
			case 'about':
				return '#ffcdc5'
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
			case 'about':
				return '#d0290d'
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
		<activeItem.icon class="nav-icon" />
		<span>{activeItem.text}</span>
		<ChevronDownIcon class="chevron {isOpen ? 'open' : ''}" />
	</button>

	{#if isOpen}
		<div class="dropdown-menu">
			{#each navItems as item}
				{#if item.subItems}
					<div class="dropdown-section">
						<div class="dropdown-item section-header">
							<item.icon class="nav-icon" />
							<span>{item.text}</span>
						</div>
						{#each item.subItems as subItem}
							<a
								href={subItem.href}
								class="dropdown-item sub-item"
								class:active={currentPath === subItem.href}
								onclick={() => (isOpen = false)}
							>
								<span>{subItem.text}</span>
							</a>
						{/each}
					</div>
				{:else}
					<a
						href={item.href}
						class="dropdown-item"
						class:active={item === activeItem}
						onclick={() => (isOpen = false)}
					>
						<item.icon class="nav-icon" />
						<span>{item.text}</span>
					</a>
				{/if}
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

	.dropdown-section {
		& + .dropdown-section,
		& + .dropdown-item {
			margin-top: $unit;
			padding-top: $unit;
			border-top: 1px solid $grey-95;
		}
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

		&:hover:not(.section-header) {
			background-color: $grey-97;
		}

		&.active {
			background-color: $grey-95;
			font-weight: 500;
		}

		&.section-header {
			color: $grey-50;
			font-size: 0.875rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			padding: $unit $unit-2x;
			cursor: default;
		}

		&.sub-item {
			padding-left: $unit-4x + $unit-2x;
			font-size: 0.9375rem;
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
