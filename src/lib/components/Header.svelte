<script lang="ts">
	import Avatar from './Avatar.svelte'
	import SegmentedController from './SegmentedController.svelte'
</script>

<header class="site-header">
	<div class="header-content">
		<a href="/" class="header-link" aria-label="@jedmund">
			<Avatar />
		</a>
		<SegmentedController />
	</div>
</header>

<style lang="scss">
	.site-header {
		display: flex;
		justify-content: center;
		padding: $unit-5x 0;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: $unit-3x;
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
