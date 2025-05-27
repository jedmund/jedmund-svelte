<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	const currentPath = $derived($page.url.pathname)

	interface NavItem {
		text: string
		href: string
		icon: string
	}

	const navItems: NavItem[] = [
		{ text: 'Dashboard', href: '/admin', icon: '📊' },
		{ text: 'Projects', href: '/admin/projects', icon: '💼' },
		{ text: 'Universe', href: '/admin/posts', icon: '🌟' },
		{ text: 'Media', href: '/admin/media', icon: '🖼️' }
	]

	// Track hover state and dropdown state
	let hoveredIndex = $state<number | null>(null)
	let showDropdown = $state(false)

	// Calculate active index based on current path
	const activeIndex = $derived(
		currentPath === '/admin'
			? 0
			: currentPath.startsWith('/admin/projects')
				? 1
				: currentPath.startsWith('/admin/posts')
					? 2
					: currentPath.startsWith('/admin/media')
						? 3
						: -1
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

	function logout() {
		localStorage.removeItem('admin_auth')
		goto('/admin/login')
	}

	// Close dropdown when clicking outside
	$effect(() => {
		function handleClickOutside(e: MouseEvent) {
			const target = e.target as HTMLElement
			if (!target.closest('.dropdown-container')) {
				showDropdown = false
			}
		}

		if (showDropdown) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})
</script>

<nav class="admin-segmented-controller" bind:this={containerElement}>
	<div class="pills-container">
		{#if activeIndex >= 0}
			<div class="active-pill" style={pillStyle}></div>
		{/if}

		{#each navItems as item, index}
			<a
				href={item.href}
				class="nav-item"
				class:active={index === activeIndex}
				bind:this={itemElements[index]}
				onmouseenter={() => (hoveredIndex = index)}
				onmouseleave={() => (hoveredIndex = null)}
			>
				<span class="icon">{item.icon}</span>
				<span>{item.text}</span>
			</a>
		{/each}
	</div>

	<div class="dropdown-container">
		<button
			class="dropdown-trigger"
			onclick={() => (showDropdown = !showDropdown)}
			aria-label="Menu"
		>
			<svg width="12" height="12" viewBox="0 0 12 12" fill="none" class:rotate={showDropdown}>
				<path
					d="M3 5L6 8L9 5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		{#if showDropdown}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={logout}>
					<span>Log out</span>
				</button>
			</div>
		{/if}
	</div>
</nav>

<style lang="scss">
	.admin-segmented-controller {
		display: flex;
		align-items: center;
		gap: $unit;
		background: $grey-100;
		padding: $unit;
		border-radius: 100px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: visible;
	}

	.pills-container {
		display: flex;
		align-items: center;
		gap: 4px;
		position: relative;
		flex: 1;
	}

	.active-pill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background-color: $grey-85;
		border-radius: 100px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		border-radius: 100px;
		text-decoration: none;
		font-size: 1rem;
		font-weight: 400;
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
		color: $grey-20;
		position: relative;
		z-index: 2;
		transition:
			color 0.2s ease,
			background-color 0.2s ease;

		&:hover:not(.active) {
			background-color: rgba(0, 0, 0, 0.05);
		}

		&.active {
			color: $grey-10;
		}

		.icon {
			font-size: 1.1rem;
			line-height: 1;
			width: 20px;
			text-align: center;
		}
	}

	.dropdown-container {
		position: relative;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: transparent;
		border: none;
		color: $grey-40;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
			color: $grey-20;
		}

		svg {
			transition: transform 0.2s ease;

			&.rotate {
				transform: rotate(180deg);
			}
		}
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit);
		right: 0;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 150px;
		z-index: 1000;
		overflow: hidden;
		animation: slideDown 0.2s ease;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.925rem;
		font-family: 'cstd', 'Helvetica Neue', Helvetica, Arial, sans-serif;
		color: $grey-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-95;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
