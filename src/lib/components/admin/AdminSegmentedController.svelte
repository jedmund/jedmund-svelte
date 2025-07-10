<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import BaseSegmentedController from './BaseSegmentedController.svelte'

	const currentPath = $derived($page.url.pathname)

	interface NavItem {
		value: string
		label: string
		href: string
		icon: string
	}

	const navItems: NavItem[] = [
		{ value: 'dashboard', label: 'Dashboard', href: '/admin', icon: '📊' },
		{ value: 'projects', label: 'Projects', href: '/admin/projects', icon: '💼' },
		{ value: 'universe', label: 'Universe', href: '/admin/posts', icon: '🌟' },
		{ value: 'media', label: 'Media', href: '/admin/media', icon: '🖼️' }
	]

	// Track dropdown state
	let showDropdown = $state(false)

	// Calculate active value based on current path
	const activeValue = $derived(
		currentPath === '/admin'
			? 'dashboard'
			: currentPath.startsWith('/admin/projects')
				? 'projects'
				: currentPath.startsWith('/admin/posts')
					? 'universe'
					: currentPath.startsWith('/admin/media')
						? 'media'
						: ''
	)

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

<nav class="admin-segmented-controller">
	<BaseSegmentedController
		items={navItems}
		value={activeValue}
		variant="navigation"
		pillColor="#e5e5e5"
		gap={4}
		containerPadding={0}
		class="admin-nav-pills"
	>
		{#snippet children({ item, isActive })}
			<span class="icon">{item.icon}</span>
			<span>{item.label}</span>
		{/snippet}
	</BaseSegmentedController>

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
		background: $gray-100;
		padding: $unit;
		border-radius: 100px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: visible;
	}

	:global(.admin-nav-pills) {
		flex: 1;
		background: transparent !important;
		padding: 0 !important;
		box-shadow: none !important;

		:global(.segmented-pill) {
			background-color: $gray-85 !important;
		}

		:global(.segmented-item) {
			gap: 6px;
			padding: 10px 16px;
			font-size: 1rem;
			color: $gray-20;

			&:global(.active) {
				color: $gray-10;
			}
		}
	}

	.icon {
		font-size: 1.1rem;
		line-height: 1;
		width: 20px;
		text-align: center;
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
		color: $gray-40;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
			color: $gray-20;
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
		z-index: $z-index-modal;
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
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $gray-95;
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
