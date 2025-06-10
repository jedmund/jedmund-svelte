<script lang="ts">
	import Avatar from './Avatar.svelte'
	import SegmentedController from './SegmentedController.svelte'

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
		<SegmentedController />
	</div>
</header>

<style lang="scss">
	.site-header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		justify-content: center;
		// Smooth padding transition based on scroll
		padding: calc($unit-5x - ($unit-5x - $unit-2x) * var(--padding-progress)) 0;
		pointer-events: none;
		// Add a very subtle transition to smooth out any remaining jitter
		transition: padding 0.1s ease-out;

		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 120px;
			background: linear-gradient(
				to bottom,
				rgba(0, 0, 0, 0.15),
				transparent
			);
			backdrop-filter: blur(6px);
			-webkit-backdrop-filter: blur(6px);
			mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
			-webkit-mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
			pointer-events: none;
			z-index: -1;
			opacity: var(--gradient-opacity);
			// Add a very subtle transition to smooth out any remaining jitter
			transition: opacity 0.1s ease-out;
		}
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: $unit-3x;
		pointer-events: auto;
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
			transition: transform 0.2s ease;
		}

		&:hover {
			:global(svg) {
				transform: scale(1.05);
			}
		}
	}
</style>
