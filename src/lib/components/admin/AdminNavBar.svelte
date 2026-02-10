<script lang="ts">
	import { page } from '$app/stores'
	import AvatarSimple from '$lib/components/AvatarSimple.svelte'
	import WorkIcon from '$icons/work.svg?component'
	import UniverseIcon from '$icons/universe.svg?component'
	import AlbumIcon from '$icons/album.svg?component'
	import MediaIcon from '$icons/media.svg?component'
	import TagIcon from '$icons/tag.svg?component'
	import SettingsIcon from '$icons/settings.svg?component'

	const currentPath = $derived($page.url.pathname)

	import type { Component } from 'svelte'

	interface NavItem {
		text: string
		href: string
		icon: Component
	}

	const navItems: NavItem[] = [
		{ text: 'Projects', href: '/admin/projects', icon: WorkIcon },
		{ text: 'Universe', href: '/admin/posts', icon: UniverseIcon },
		{ text: 'Albums', href: '/admin/albums', icon: AlbumIcon },
		{ text: 'Media', href: '/admin/media', icon: MediaIcon },
		{ text: 'Tags', href: '/admin/tags', icon: TagIcon }
	]

	const settingsItem: NavItem = { text: 'Settings', href: '/admin/settings', icon: SettingsIcon }

	// Calculate active index based on current path
	const activeIndex = $derived(
		currentPath.startsWith('/admin/projects')
			? 0
			: currentPath.startsWith('/admin/posts')
				? 1
				: currentPath.startsWith('/admin/albums')
					? 2
					: currentPath.startsWith('/admin/media')
						? 3
						: currentPath.startsWith('/admin/tags')
							? 4
							: currentPath.startsWith('/admin/settings')
								? 5
								: -1
	)
</script>

<nav class="admin-nav-rail">
	<a href="/" class="nav-brand">
		<div class="brand-logo">
			<AvatarSimple />
		</div>
	</a>

	<div class="nav-links">
		{#each navItems as item, index}
			<a href={item.href} class="nav-link" class:active={index === activeIndex}>
				<item.icon class="nav-icon" />
				<span class="nav-text">{item.text}</span>
			</a>
		{/each}
	</div>

	<div class="nav-bottom">
		<a href={settingsItem.href} class="nav-link" class:active={activeIndex === 5}>
			<settingsItem.icon class="nav-icon" />
			<span class="nav-text">{settingsItem.text}</span>
		</a>
	</div>
</nav>

<style lang="scss">
	.admin-nav-rail {
		position: sticky;
		top: 0;
		align-self: flex-start;
		width: 80px;
		min-width: 80px;
		height: 100vh;
		background: $bg-color;
		border-right: 1px solid $gray-80;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: $unit $unit-2x;
		gap: $unit-half;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		padding: $unit-2x $unit-half;
		border-radius: $corner-radius-2xl;
		transition: background-color 0.2s ease;
		width: 100%;

		&:hover {
			background-color: $gray-70;
		}

		.brand-logo {
			height: 40px;
			width: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			:global(.face-container) {
				--face-size: 40px;
				width: 40px;
				height: 40px;
			}

			:global(svg) {
				width: 40px;
				height: 40px;
			}
		}
	}

	.nav-links {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-half;
		width: 100%;
	}

	.nav-bottom {
		margin-top: auto;
		width: 100%;
		padding-bottom: $unit;
	}

	.nav-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit-half;
		padding: $unit-2x $unit-half;
		border-radius: $corner-radius-2xl;
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 500;
		color: $gray-30;
		transition: all 0.2s ease;
		width: 100%;

		&:hover {
			background-color: $gray-70;
		}

		&.active {
			color: $red-60;
			background-color: $salmon-pink;
		}

		:global(.nav-icon) {
			font-size: 1.5rem;
			line-height: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			height: 24px;
		}

		.nav-text {
			text-align: center;
			white-space: nowrap;
			line-height: 1.2;
		}
	}
</style>
