<script lang="ts">
	import { createCardTilt } from '$lib/public/card-tilt.svelte'
	import { createSvgLogo } from '$lib/public/svg-logo.svelte'
	import { goto } from '$app/navigation'

	interface Props {
		logoUrl: string | null
		backgroundColor: string
		name: string
		slug: string
		description: string
		highlightColor: string
		status?: 'draft' | 'published' | 'list-only' | 'password-protected'
		index?: number
	}

	let {
		logoUrl,
		backgroundColor,
		name,
		slug,
		description,
		highlightColor,
		status = 'published',
		index = 0
	}: Props = $props()

	const isEven = $derived(index % 2 === 0)
	const isClickable = $derived(status === 'published' || status === 'password-protected')
	const isListOnly = $derived(status === 'list-only')
	const isPasswordProtected = $derived(status === 'password-protected')

	// Create highlighted description
	const highlightedDescription = $derived(
		description.replace(
			new RegExp(`(${name})`, 'gi'),
			`<span style="color: ${highlightColor};">$1</span>`
		)
	)

	const tilt = createCardTilt(4, 1.014)
	const logo = createSvgLogo(() => logoUrl)
	function handleClick() {
		if (isClickable) {
			goto(`/work/${slug}`).catch((error) => console.error('Project navigation failed:', error))
		}
	}
</script>

<div
	class="project-item {isEven ? 'even' : 'odd'}"
	class:clickable={isClickable}
	class:list-only={isListOnly}
	class:password-protected={isPasswordProtected}
	bind:this={tilt.element}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick()}
	onmousemove={isClickable ? tilt.move : undefined}
	onmouseenter={isClickable ? tilt.enter : undefined}
	onmouseleave={isClickable ? tilt.leave : undefined}
	style="transform: {tilt.transform};"
	role={isClickable ? 'button' : undefined}
	{...isClickable ? { tabindex: 0 } : {}}
>
	<div class="project-logo" style="background-color: {backgroundColor}">
		{#if logo.content}
			<div class="logo-svg" style="transform: {tilt.logoTransform}">
				{@html logo.content}
			</div>
		{:else if logoUrl}
			<img
				src={logoUrl}
				alt="{name} logo"
				class="logo-image"
				style="transform: {tilt.logoTransform}"
			/>
		{/if}
	</div>
	<div class="project-content">
		<p class="project-description">{@html highlightedDescription}</p>

		{#if isListOnly}
			<div class="status-indicator list-only">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
					<path
						d="M20.188 10.934c.388.472.612 1.057.612 1.686 0 .63-.224 1.214-.612 1.686a11.79 11.79 0 01-1.897 1.853c-1.481 1.163-3.346 2.24-5.291 2.24-1.945 0-3.81-1.077-5.291-2.24A11.79 11.79 0 016.812 14.32C6.224 13.648 6 13.264 6 12.62c0-.63.224-1.214.612-1.686A11.79 11.79 0 018.709 9.08c1.481-1.163 3.346-2.24 5.291-2.24 1.945 0 3.81 1.077 5.291 2.24a11.79 11.79 0 011.897 1.853z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path d="M2 2l20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span>Coming Soon</span>
			</div>
		{:else if isPasswordProtected}
			<div class="status-indicator password-protected">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="3"
						y="11"
						width="18"
						height="11"
						rx="2"
						ry="2"
						stroke="currentColor"
						stroke-width="2"
					/>
					<circle cx="12" cy="16" r="1" fill="currentColor" />
					<path
						d="M7 11V7a5 5 0 0 1 10 0v4"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>Password Required</span>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.project-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-3x;
		background: $gray-100;
		border-radius: $card-corner-radius;
		transition:
			transform 0.15s ease-out,
			box-shadow 0.15s ease-out,
			opacity 0.15s ease-out;
		transform-style: preserve-3d;
		will-change: transform;
		cursor: default;

		&.clickable {
			cursor: pointer;

			&:hover {
				box-shadow:
					0 10px 30px rgba(0, 0, 0, 0.1),
					0 1px 8px rgba(0, 0, 0, 0.06);
			}
		}

		&.list-only {
			opacity: 0.7;
			background: $gray-97;
		}
	}

	.project-logo {
		flex-shrink: 0;
		width: 80px;
		height: 80px;
		border-radius: $unit-2x;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-2x;
		box-sizing: border-box;

		.logo-image {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			transition: transform 0.4s cubic-bezier(0.2, 2.1, 0.3, 0.95);
			will-change: transform;
		}

		.logo-svg {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			transition: transform 0.4s cubic-bezier(0.2, 2.1, 0.3, 0.95);

			:global(svg) {
				width: 48px;
				height: 48px;
			}
		}
	}

	.project-content {
		flex: 1;
		min-width: 0;
	}

	.project-description {
		margin: 0;
		font-size: 1rem; // 18px
		line-height: 1.3;
		color: $gray-00;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: $unit-half;
		margin-top: $unit;
		font-size: 0.875rem;
		font-weight: 500;

		&.list-only {
			color: $gray-60;
		}

		&.password-protected {
			color: $blue-50;
		}

		svg {
			flex-shrink: 0;
		}
	}

	@include breakpoint('phone') {
		.project-item {
			flex-direction: column !important;
			gap: $unit-2x;
			padding: $unit-2x;
		}

		.project-logo {
			width: 100%;
			height: auto;
			aspect-ratio: 16 / 9;
			box-sizing: border-box;
		}
	}
</style>
