<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import AvatarSimple from '$lib/components/AvatarSimple.svelte'
	import WorkIcon from '$icons/work.svg?component'
	import UniverseIcon from '$icons/universe.svg?component'
	import PhotosIcon from '$icons/photos.svg?component'

	const currentPath = $derived($page.url.pathname)
	let isScrolled = $state(false)

	onMount(() => {
		const handleScroll = () => {
			isScrolled = window.scrollY > 0
		}

		window.addEventListener('scroll', handleScroll)
		handleScroll() // Check initial scroll position

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	})

	interface NavItem {
		text: string
		href: string
		icon: any
	}

	const navItems: NavItem[] = [
		{ text: 'Projects', href: '/admin/projects', icon: WorkIcon },
		{ text: 'Universe', href: '/admin/posts', icon: UniverseIcon },
		{ text: 'Albums', href: '/admin/albums', icon: PhotosIcon },
		{ text: 'Media', href: '/admin/media', icon: PhotosIcon }
	]

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
						: -1
	)
</script>

<nav class="admin-nav-bar" class:scrolled={isScrolled}>
	<div class="nav-container">
		<div class="nav-content">
			<a href="/" class="nav-brand">
				<div class="brand-logo">
					<AvatarSimple />
				</div>
				<span class="brand-text">Back to jedmund.com</span>
			</a>

			<div class="nav-links">
				{#each navItems as item, index}
					<a href={item.href} class="nav-link" class:active={index === activeIndex}>
						<item.icon class="nav-icon" />
						<span class="nav-text">{item.text}</span>
					</a>
				{/each}
			</div>
		</div>
	</div>
</nav>

<style lang="scss">
	// Breakpoint variables
	$phone-max: 639px;
	$tablet-min: 640px;
	$tablet-max: 1023px;
	$laptop-min: 1024px;
	$laptop-max: 1439px;
	$monitor-min: 1440px;

	.admin-nav-bar {
		position: sticky;
		top: 0;
		z-index: 100;
		width: 100%;
		background: $bg-color;
		border-bottom: 1px solid transparent;
		transition: border-bottom 0.2s ease;

		&.scrolled {
			border-bottom: 1px solid $grey-60;
		}
	}

	.nav-container {
		width: 100%;
		padding: 0 $unit-3x;

		// Phone: Full width with padding
		@media (max-width: $phone-max) {
			padding: 0 $unit-2x;
		}

		// Tablet: Constrained width
		@media (min-width: $tablet-min) and (max-width: $tablet-max) {
			max-width: 768px;
			margin: 0 auto;
			padding: 0 $unit-4x;
		}

		// Laptop: Wider constrained width
		@media (min-width: $laptop-min) and (max-width: $laptop-max) {
			max-width: 900px;
			margin: 0 auto;
			padding: 0 $unit-5x;
		}

		// Monitor: Maximum constrained width
		@media (min-width: $monitor-min) {
			max-width: 900px;
			margin: 0 auto;
			padding: 0 $unit-6x;
		}
	}

	.nav-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
		gap: $unit-4x;

		@media (max-width: $phone-max) {
			height: 56px;
			gap: $unit-2x;
		}
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: $unit;
		text-decoration: none;
		color: $grey-30;
		font-weight: 400;
		font-size: 0.925rem;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-20;
		}

		.brand-logo {
			height: 32px;
			width: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			:global(.face-container) {
				--face-size: 32px;
				width: 32px;
				height: 32px;
			}

			:global(svg) {
				width: 32px;
				height: 32px;
			}
		}

		.brand-text {
			white-space: nowrap;

			@media (max-width: $phone-max) {
				display: none;
			}
		}
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: $unit;
		flex: 1;
		justify-content: right;

		@media (max-width: $phone-max) {
			gap: 0;
		}
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: $unit;
		padding: $unit $unit-2x;
		border-radius: $card-corner-radius;
		text-decoration: none;
		font-size: 0.925rem;
		font-weight: 500;
		color: $grey-30;
		transition: all 0.2s ease;
		position: relative;

		@media (max-width: $phone-max) {
			padding: $unit-2x $unit;
		}

		&:hover {
			background-color: $grey-70;
		}

		&.active {
			color: $red-60;
			background-color: $salmon-pink;
		}

		.nav-icon {
			font-size: 1.1rem;
			line-height: 1;

			@media (max-width: $tablet-max) {
				font-size: 1rem;
			}
		}

		.nav-text {
			@media (max-width: $phone-max) {
				display: none;
			}
		}
	}

	.nav-actions {
		// Placeholder for future actions if needed
	}
</style>
