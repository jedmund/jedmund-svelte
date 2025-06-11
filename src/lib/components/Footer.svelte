<script lang="ts">
	const currentYear = new Date().getFullYear()

	const socialLinks = [
		{ name: 'Bluesky', url: 'https://bsky.app/profile/jedmund.com' },
		{ name: 'Mastodon', url: 'https://fireplace.cafe/@jedmund' },
		{ name: 'Github', url: 'https://github.com/jedmund' },
		{ name: 'Glass', url: 'https://glass.photo/jedmund' }
	]
</script>

<footer class="site-footer">
	<div class="footer-content">
		<p class="copyright">
			&copy; {currentYear} Justin Edmund
			<span class="separator">&middot;</span>
			<a href="/rss" class="rss-link">RSS</a>
		</p>
		<nav class="social-links">
			{#each socialLinks as link, index}
				<a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
				{#if index < socialLinks.length - 1}
					<span class="separator">/</span>
				{/if}
			{/each}
		</nav>
	</div>
</footer>

<style lang="scss">
	.site-footer {
		width: 100%;
		padding: $unit-2x 0;
		margin-top: $unit-3x;
	}

	.footer-content {
		max-width: 700px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 $unit-3x;

		@include breakpoint('phone') {
			flex-direction: column;
			gap: $unit-2x;
			text-align: center;
		}
	}

	.copyright {
		margin: 0;
		font-size: 0.875rem; // 14px
		color: $grey-40; // #999

		.separator {
			margin: 0 $unit-half;
		}

		.rss-link {
			color: $grey-40;
			text-decoration: none;
			transition: color 0.2s ease;

			&:hover {
				color: $red-60;
			}
		}
	}

	.social-links {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem; // 14px

		a {
			color: $grey-40;
			text-decoration: none;
			transition: color 0.2s ease;

			&:hover {
				color: $red-60;
			}
		}

		.separator {
			color: $grey-40;
		}
	}
</style>
