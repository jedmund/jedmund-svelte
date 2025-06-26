<script lang="ts">
	import Avatar from './Avatar.svelte'
	import SegmentedController from './SegmentedController.svelte'
	import NavDropdown from './NavDropdown.svelte'

	let scrollY = $state(0)
	// Smooth gradient opacity from 0 to 1 over the first 100px of scroll
	let gradientOpacity = $derived(Math.min(scrollY / 100, 1))
	// Padding transition happens more quickly
	let paddingProgress = $derived(Math.min(scrollY / 50, 1))

	$effect(() => {
		let ticking = false

		const updateScroll = () => {
			scrollY = window.scrollY
			ticking = false
		}

		const handleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(updateScroll)
				ticking = true
			}
		}

		// Set initial value
		scrollY = window.scrollY

		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	})
</script>

<header
	class="site-header"
	style="--gradient-opacity: {gradientOpacity}; --padding-progress: {paddingProgress}"
>
	<div class="header-content">
		<a href="/about" class="header-link" aria-label="@jedmund">
			<Avatar />
		</a>
		<div class="nav-desktop">
			<SegmentedController />
		</div>
		<div class="nav-mobile">
			<NavDropdown />
		</div>
	</div>
</header>

<style lang="scss">
	.site-header {
		position: sticky;
		top: 0;
		z-index: $z-index-header;
		display: flex;
		justify-content: center;
		// Smooth padding transition based on scroll
		padding: calc($unit-5x - ($unit-5x - $unit-2x) * var(--padding-progress)) $unit-2x;
		pointer-events: none;
		// Add a very subtle transition to smooth out any remaining jitter
		transition: padding $transition-instant ease-out;

		@include breakpoint('phone') {
			padding: calc($unit-3x - ($unit-3x - $unit-2x) * var(--padding-progress)) $unit-2x;
		}

		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 120px;
			background: linear-gradient(to bottom, $shadow-medium, transparent);
			backdrop-filter: blur(6px);
			-webkit-backdrop-filter: blur(6px);
			mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
			-webkit-mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
			pointer-events: none;
			z-index: -1;
			opacity: var(--gradient-opacity);
			// Add a very subtle transition to smooth out any remaining jitter
			transition: opacity $transition-instant ease-out;
		}
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit-3x;
		pointer-events: auto;
		width: 100%;

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.header-link {
		display: flex;
		align-items: center;
		text-decoration: none;
		height: 52px; // Reduced by 4px for optical balance

		:global(.face-container) {
			height: 52px;
			width: 52px;
		}

		:global(svg) {
			height: 100%;
			width: 100%;
		}
	}

	.nav-desktop {
		display: block;

		@include breakpoint('phone') {
			display: none;
		}
	}

	.nav-mobile {
		display: none;

		@include breakpoint('phone') {
			display: block;
		}
	}
</style>
