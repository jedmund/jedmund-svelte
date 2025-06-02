<script>
	import jedmundIcon from '$illos/jedmund.svg?raw'
</script>

<div class="avatar-simple">
	{@html jedmundIcon}
</div>

<style lang="scss">
	.avatar-simple {
		display: inline-block;
		width: 100%;
		height: 100%;

		:global(svg) {
			width: 100%;
			height: 100%;
			border-radius: $avatar-radius;
		}
	}
</style>
