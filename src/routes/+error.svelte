<script>
	import { page } from '$app/stores'
</script>

<div class="error-container">
	<h1 class="error-code">404</h1>
	<p class="error-message">Not Found</p>
</div>

<style lang="scss">
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		text-align: center;
	}

	.error-code {
		font-size: 120px;
		font-weight: 500;
		line-height: 1;
		margin: 0;
		color: var(--text-primary);
	}

	.error-message {
		font-size: 24px;
		margin-top: $unit-2x;
		color: var(--text-secondary);
	}
</style>
