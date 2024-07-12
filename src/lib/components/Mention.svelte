<script>
	export let href = ''
	export let title = ''
	export let sourceType = ''
	export let date = ''
	export let source = ''
</script>

<li class="mention">
	<a {href} target="_blank">
		<h4>{title}</h4>
		<footer>
			{#if source}
				<span class="source">{source}</span>
			{/if}
			<span class="source-type">{sourceType}</span>
			<time>{date}</time>
		</footer>
	</a>
</li>

<style lang="scss">
	$card-color: #f7f7f7;
	$page-horz-padding: 20px;
	$card-height: 200px;
	$mention-padding: 15px;
	$font-size: 16px;
	$line-height: 1.5;
	$font-weight-med: 500;

	.mention {
		background: $card-color;
		border-radius: $corner-radius;
		cursor: pointer;
		transition: background 0.2s ease-in-out;

		&:hover {
			background: darken($card-color, 2%);
		}

		a {
			display: flex;
			flex-direction: column;
			font-size: $font-size;
			line-height: $line-height;
			padding: $unit-3x;
			text-decoration: none;
			color: inherit;
		}

		h4 {
			display: block;
			font-weight: 400;
			font-size: $font-size;
			flex-grow: 2;
			margin: 0;

			cite {
				font-style: normal;
			}
		}

		footer {
			color: $grey-50;
			flex-grow: 0;
			font-weight: $font-weight-med;
			font-size: 0.8em;
		}

		.source,
		.source-type {
			margin-right: 0.5em;
		}
	}
</style>
