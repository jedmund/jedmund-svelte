<script lang="ts">
	import { page } from '$app/stores'
	import Avatar from '$lib/components/Avatar.svelte'

	const currentPath = $derived($page.url.pathname)

	interface NavItem {
		text: string
		href: string
		icon: string
	}

	const navItems: NavItem[] = [
		{ text: 'Dashboard', href: '/admin', icon: 'dashboard' },
		{ text: 'Projects', href: '/admin/projects', icon: 'work' },
		{ text: 'Universe', href: '/admin/posts', icon: 'universe' },
		{ text: 'Media', href: '/admin/media', icon: 'photos' }
	]

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
</script>

<nav class="admin-nav-bar">
	<div class="nav-container">
		<div class="nav-content">
			<a href="/" class="nav-brand">
				<div class="brand-logo">
					<Avatar />
				</div>
				<span class="brand-text">Back to jedmund.com</span>
			</a>

			<div class="nav-links">
				{#each navItems as item, index}
					<a href={item.href} class="nav-link" class:active={index === activeIndex}>
						<svg class="nav-icon" width="20" height="20" viewBox="0 0 20 20">
							{#if item.icon === 'dashboard'}
								<rect
									x="3"
									y="3"
									width="6"
									height="6"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="1"
								/>
								<rect
									x="11"
									y="3"
									width="6"
									height="6"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="1"
								/>
								<rect
									x="3"
									y="11"
									width="6"
									height="6"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="1"
								/>
								<rect
									x="11"
									y="11"
									width="6"
									height="6"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="1"
								/>
							{:else if item.icon === 'work'}
								<rect
									x="2"
									y="4"
									width="16"
									height="12"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="2"
								/>
								<path
									d="M8 4V3C8 2.44772 8.44772 2 9 2H11C11.5523 2 12 2.44772 12 3V4"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<line x1="2" y1="9" x2="18" y2="9" stroke="currentColor" stroke-width="1.5" />
							{:else if item.icon === 'universe'}
								<circle
									cx="10"
									cy="10"
									r="8"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
								/>
								<circle cx="10" cy="10" r="2" fill="currentColor" />
								<circle cx="10" cy="4" r="1" fill="currentColor" />
								<circle cx="16" cy="10" r="1" fill="currentColor" />
								<circle cx="10" cy="16" r="1" fill="currentColor" />
								<circle cx="4" cy="10" r="1" fill="currentColor" />
							{:else if item.icon === 'photos'}
								<rect
									x="3"
									y="5"
									width="14"
									height="10"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
									rx="1"
								/>
								<circle
									cx="7"
									cy="9"
									r="1.5"
									stroke="currentColor"
									stroke-width="1.5"
									fill="none"
								/>
								<path
									d="M3 12L7 8L10 11L13 8L17 12"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									fill="none"
								/>
							{/if}
						</svg>
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
		background-color: $grey-60;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-weight: 400;
		font-size: 0.925rem;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-20;
		}

		.brand-logo {
			height: 40px;
			width: 40px;
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		color: $grey-30;
		transition: all 0.2s ease;
		position: relative;

		@media (max-width: $phone-max) {
			padding: $unit-2x $unit;
		}

		&:hover {
			color: $red-60;
			background-color: $salmon-pink;
		}

		&.active {
			color: white;
			background-color: $red-60;
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
