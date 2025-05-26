<script lang="ts">
	import Avatar from './Avatar.svelte'
	import SegmentedController from './SegmentedController.svelte'

	let scrollY = $state(0)
	let hasScrolled = $derived(scrollY > 10)

	$effect(() => {
		const handleScroll = () => {
			scrollY = window.scrollY
		}

		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	})
</script>

<header class="site-header {hasScrolled ? 'scrolled' : ''}">
	<div class="header-content">
		<a href="/about" class="header-link" aria-label="@jedmund">
			<Avatar />
		</a>
		<SegmentedController />
	</div>
</header>

<style lang="scss">
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		justify-content: center;
		padding: $unit-5x 0;
		transition: padding 0.3s ease;
		pointer-events: none;

		&.scrolled {
			padding: $unit-2x 0;
			
			&::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				height: 120px;
				background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15), transparent);
				backdrop-filter: blur(6px);
				-webkit-backdrop-filter: blur(6px);
				mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
				-webkit-mask-image: linear-gradient(to bottom, black 0%, black 15%, transparent 90%);
				pointer-events: none;
				z-index: -1;
			}
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
