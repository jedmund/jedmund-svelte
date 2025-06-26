<script>
	import { onMount, onDestroy } from 'svelte'
	import { Spring } from 'svelte/motion'
	import { nowPlayingStream } from '$lib/stores/now-playing-stream'
	import { albumStream } from '$lib/stores/album-stream'
	import AvatarSVG from './AvatarSVG.svelte'
	import AvatarHeadphones from './AvatarHeadphones.svelte'
	import { get } from 'svelte/store'

	// Props for testing/forcing states
	let { forcePlayingMusic = false } = $props()

	let isHovering = $state(false)
	let isBlinking = $state(false)
	let isPlayingMusic = $state(forcePlayingMusic)

	// Track store subscriptions for debugging
	let nowPlayingStoreState = $state(null)
	let albumStoreState = $state(null)

	const scale = new Spring(1, {
		stiffness: 0.1,
		damping: 0.125
	})

	function handleMouseEnter() {
		isHovering = true
		scale.target = 1.25
	}

	function handleMouseLeave() {
		isHovering = false
		scale.target = 1
	}

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	async function singleBlink(duration) {
		isBlinking = true
		await sleep(duration)
		isBlinking = false
	}

	async function doubleBlink() {
		await singleBlink(50)
		await sleep(100)
		await singleBlink(150)
	}

	async function blink() {
		await singleBlink(150)

		if (Math.random() < 0.45) {
			await doubleBlink()
		}
	}

	let blinkInterval

	onMount(() => {
		blinkInterval = setInterval(() => {
			if (!isHovering) {
				blink()
			}
		}, 4000)

		// Subscribe to now playing updates from both sources
		const unsubscribeNowPlaying = nowPlayingStream.subscribe((state) => {
			nowPlayingStoreState = state
			// Check if any album is currently playing, unless forced
			if (!forcePlayingMusic) {
				const nowPlayingFromStream = Array.from(state.updates.values()).some(
					(update) => update.isNowPlaying
				)
				console.log('Avatar - nowPlayingStream update:', {
					updatesCount: state.updates.size,
					hasNowPlaying: nowPlayingFromStream
				})
				// Don't set to false if we haven't received album data yet
				if (nowPlayingFromStream || albumStoreState !== null) {
					isPlayingMusic =
						nowPlayingFromStream || (albumStoreState?.some((album) => album.isNowPlaying) ?? false)
				}
			}
		})

		// Also check the album stream
		const unsubscribeAlbums = albumStream.subscribe((state) => {
			albumStoreState = state.albums
			if (!forcePlayingMusic) {
				const hasNowPlaying = state.albums.some((album) => album.isNowPlaying)

				// Get the current state of nowPlayingStream
				const nowPlayingState = nowPlayingStoreState || get(nowPlayingStream)
				const nowPlayingFromStream = Array.from(nowPlayingState.updates.values()).some(
					(update) => update.isNowPlaying
				)

				console.log('Avatar - albumStream update:', {
					albumsCount: state.albums.length,
					hasNowPlayingInAlbums: hasNowPlaying,
					hasNowPlayingInStream: nowPlayingFromStream,
					albums: state.albums.map((a) => ({ name: a.name, isNowPlaying: a.isNowPlaying }))
				})

				// Update isPlayingMusic based on whether any album is now playing from either source
				isPlayingMusic = hasNowPlaying || nowPlayingFromStream
			}
		})

		return () => {
			if (blinkInterval) {
				clearInterval(blinkInterval)
			}
			unsubscribeNowPlaying()
			unsubscribeAlbums()
		}
	})
</script>

<div
	class="face-container"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	style="transform: scale({scale.current})"
>
	<AvatarSVG>
		<!-- Face group -->
		<g slot="face" class="face" class:hover={isHovering} class:blink={isBlinking}>
			<!-- Normal face -->
			<g class="normal">
				<path
					d="M216.12 280C216.12 277.37 216.28 276 218.72 275.87C221.16 275.74 221.06 278.75 221.06 278.75C221.06 278.75 220.67 293.91 215.06 307.75C215.06 307.75 212.19 315.19 210.12 315.19C209.084 315.438 207.994 315.317 207.038 314.848C206.081 314.379 205.318 313.591 204.88 312.62C204.88 312.62 203.56 309.07 202.16 308.97C199.59 308.78 197.96 313.58 197.6 317.23C197.38 319.5 196.44 320.94 194.12 320.94C191.8 320.94 190.94 319.55 191.19 317.12C192.19 310.94 196.47 303.91 199.44 300.94C199.728 300.646 200.072 300.411 200.451 300.25C200.831 300.088 201.238 300.003 201.65 300C204.75 300 205.65 302.67 206.07 304.89C206.81 308.75 208.12 308.47 208.12 308.47C208.12 308.47 208.7 308.67 209.5 307.06C212.94 300.12 216.12 288.44 216.12 280Z"
					fill="#070610"
				/>
				<path
					d="M267.4 265.57C267.49 263.69 268.84 260.57 271.88 261C274.25 261.31 275.69 263 275.31 266.5C274.88 270.5 271.47 287.69 268.86 292.25C267.37 294.86 266 295.44 263.86 294.96C262.86 294.73 261.73 293.44 262.28 290.06C263 285.59 266.77 277.57 267.4 265.57Z"
					fill="#070610"
				/>
				<path
					d="M168.91 258.88C168.91 258.88 170.91 258.81 171.29 261.53C172.1 266.64 171.55 276.73 169.64
					285.1C169.64 285.1 168.27 288.92 165.46 288.92C162.65 288.92 162.29 285.75 162.36 283.66C162.43
					281.57 165.1 275.59 165.1 264.86C165.1 258.08 168.91 258.88 168.91 258.88Z"
					fill="#070610"
				/>
				<path
					d="M178.25 359.94C198 360.69 231.62 355.44 231.62 355.44C231.62 355.44 232 344.88 235.5 341C239
					337.12 241.12 339.12 241.12 339.12C241.12 339.12 244 340.5 241.12 345.12C238.24 349.74 238.56
					356.38 239.31 359.56C240.06 362.74 245 370.5 245 370.5C245.033 370.662 245.02 370.83 244.964
					370.986C244.908 371.141 244.809 371.278 244.68 371.381C244.551 371.485 244.396 371.55 244.232
					371.571C244.068 371.592 243.901 371.568 243.75 371.5C242.38 371.12 241.12 372.75 241.12 372.75C241.12
					372.75 240.38 373.61 238.88 371.88C236.122 368.537 233.945 364.754 232.44 360.69C232.44 360.69
					203.86 366.31 177.92 365.31C177.92 365.31 175.81 365.69 175.06 362.56C174.35 359.6 178.25 359.94
					178.25 359.94Z"
					fill="#070610"
				/>
			</g>

			<!-- Open mouth face -->
			<g class="open-mouth">
				<path
					d="M216.12 280C216.12 277.37 216.28 276 218.72 275.87C221.16 275.74 221.06 278.75 221.06 278.75C221.06 278.75 220.67 293.91 215.06 307.75C215.06 307.75 212.19 315.19 210.12 315.19C209.084 315.438 207.994 315.317 207.038 314.848C206.081 314.379 205.318 313.591 204.88 312.62C204.88 312.62 203.56 309.07 202.16 308.97C199.59 308.78 197.96 313.58 197.6 317.23C197.38 319.5 196.44 320.94 194.12 320.94C191.8 320.94 190.94 319.55 191.19 317.12C192.19 310.94 196.47 303.91 199.44 300.94C199.728 300.646 200.072 300.411 200.451 300.25C200.831 300.088 201.238 300.003 201.65 300C204.75 300 205.65 302.67 206.07 304.89C206.81 308.75 208.12 308.47 208.12 308.47C208.12 308.47 208.7 308.67 209.5 307.06C212.94 300.12 216.12 288.44 216.12 280Z"
					fill="#070610"
				/>
				<path
					d="M267.4 265.57C267.49 263.69 268.84 260.57 271.88 261C274.25 261.31 275.69 263 275.31 266.5C274.88 270.5 271.47 287.69 268.86 292.25C267.37 294.86 266 295.44 263.86 294.96C262.86 294.73 261.73 293.44 262.28 290.06C263 285.59 266.77 277.57 267.4 265.57Z"
					fill="#070610"
				/>
				<path
					d="M168.91 258.88C168.91 258.88 170.91 258.81 171.29 261.53C172.1 266.64 171.55 276.73 169.64 285.1C169.64 285.1 168.27 288.92 165.46 288.92C162.65 288.92 162.29 285.75 162.36 283.66C162.43 281.57 165.1 275.59 165.1 264.86C165.1 258.08 168.91 258.88 168.91 258.88Z"
					fill="#070610"
				/>
				<path
					d="M256.217 362.498C256.813 344.624 226.749 338.344 212.256 336.895C190.517 336.895 165.88 343.175 165.88 362.498C165.88 377.987 186.67 387.171 212.256 388.101C238.826 389.068 255.734 376.991 256.217 362.498Z"
					fill="#F96A6A"
				/>
				<path
					d="M174.576 377.474C167.813 365.88 178.924 345.107 203.561 335.928C186.17 335.928 167.33 347.136 165.397 355.252C163.465 363.368 169.262 373.609 174.576 377.474Z"
					fill="#821818"
				/>
				<path
					d="M220.573 347.039L221.539 338.827L215.742 337.378L209.462 337.861L208.979 346.073L220.573 347.039Z"
					fill="white"
				/>
				<path
					d="M206.081 346.556L207.047 338.344L201.25 336.895L194.97 337.378L194.487 345.59L206.081 346.556Z"
					fill="white"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M210.324 333.996C235.928 335.445 257.806 346.099 258.633 359.116C260.565 389.551 224.817 391 210.324 391C195.832 391 161.237 385.203 162.499 359.116C163.154 345.59 184.721 332.547 210.324 333.996ZM255.251 362.015C251.869 345.107 232.546 340.276 211.29 338.344C201.284 337.434 169.712 340.759 167.813 359.116C165.464 381.821 200.856 387.522 211.29 387.135C224.334 386.652 255.251 383.754 255.251 362.015Z"
					fill="black"
				/>
				<path
					d="M208.979 348.006C206.943 347.039 206.621 345.59 206.943 344.141L207.53 337.861L210.429 337.378C210.267 338.988 209.946 343.271 209.946 343.658C209.946 344.624 210.419 345.126 211.395 345.59C213.052 346.378 218.269 347.115 219.607 345.107C220.474 343.807 220.573 339.793 220.573 338.344L224.438 338.344C224.2 339.889 223.738 344.407 222.989 346.073C222.5 347.014 220.879 348.693 220.09 348.972C217.605 349.505 211.145 349.033 208.979 348.006Z"
					fill="black"
				/>
				<path
					d="M194.486 347.522C192.071 346.073 191.749 343.175 192.071 341.725L193.037 337.378L195.936 336.895C195.775 338.505 195.453 342.788 195.453 343.175C195.453 344.141 195.927 344.643 196.902 345.107C198.559 345.895 203.776 346.632 205.114 344.624C205.981 343.324 206.08 339.31 206.08 337.861L209.945 337.861L209.945 337.861C209.707 339.406 208.175 345.373 207.425 347.039C206.937 347.98 206.386 348.21 205.597 348.489C203.112 349.022 196.541 348.756 194.486 347.522Z"
					fill="black"
				/>
			</g>

			<!-- Blinking face -->
			<g class="blink">
				<path
					d="M216.12 280C216.12 277.37 216.28 276 218.72 275.87C221.16 275.74 221.06 278.75 221.06 278.75C221.06 278.75 220.67 293.91 215.06 307.75C215.06 307.75 212.19 315.19 210.12 315.19C209.084 315.438 207.994 315.317 207.038 314.848C206.081 314.379 205.318 313.591 204.88 312.62C204.88 312.62 203.56 309.07 202.16 308.97C199.59 308.78 197.96 313.58 197.6 317.23C197.38 319.5 196.44 320.94 194.12 320.94C191.8 320.94 190.94 319.55 191.19 317.12C192.19 310.94 196.47 303.91 199.44 300.94C199.728 300.646 200.072 300.411 200.451 300.25C200.831 300.088 201.238 300.003 201.65 300C204.75 300 205.65 302.67 206.07 304.89C206.81 308.75 208.12 308.47 208.12 308.47C208.12 308.47 208.7 308.67 209.5 307.06C212.94 300.12 216.12 288.44 216.12 280Z"
					fill="#070610"
				/>
				<path
					d="M262.09 286.69C262.51 285.52 263.24 284.85 264.22 285.22C265.53 285.72 264.78 288.12 266.09 288.59C269.01 289.64 269.21 286.7 270.2 286.59C271.64 286.4 271.8 288.19 271.51 290.07C271.11 292.66 270.58 293.22 269.69 294.26C268.16 296.04 266.56 296.26 264.44 295.76C263.44 295.53 261.81 294.57 261.63 291.76C261.479 290.056 261.635 288.339 262.09 286.69Z"
					fill="#070610"
				/>
				<path
					d="M166.38 281.12C168.81 281.12 168.88 279.12 169.63 279.12C170.38 279.12 170.85 280.01 171.04 281.03C171.518 282.867 171.297 284.816 170.42 286.5C170.42 286.5 167.75 289.67 165.5 289.31C165.067 289.287 164.642 289.178 164.252 288.988C163.862 288.797 163.514 288.531 163.229 288.203C162.945 287.875 162.729 287.494 162.595 287.081C162.461 286.668 162.412 286.232 162.45 285.8C162.52 283.71 163.06 284.46 163.08 282.25C163.08 280.25 163.3 279.5 164.29 279.33C165.56 279.12 165.19 281.12 166.38 281.12Z"
					fill="#070610"
				/>

				<path
					d="M178.25 359.94C198 360.69 231.62 355.44 231.62 355.44C231.62 355.44 232 344.88 235.5 341C239
					337.12 241.12 339.12 241.12 339.12C241.12 339.12 244 340.5 241.12 345.12C238.24 349.74 238.56
					356.38 239.31 359.56C240.06 362.74 245 370.5 245 370.5C245.033 370.662 245.02 370.83 244.964
					370.986C244.908 371.141 244.809 371.278 244.68 371.381C244.551 371.485 244.396 371.55 244.232
					371.571C244.068 371.592 243.901 371.568 243.75 371.5C242.38 371.12 241.12 372.75 241.12 372.75C241.12
					372.75 240.38 373.61 238.88 371.88C236.122 368.537 233.945 364.754 232.44 360.69C232.44 360.69
					203.86 366.31 177.92 365.31C177.92 365.31 175.81 365.69 175.06 362.56C174.35 359.6 178.25 359.94
					178.25 359.94Z"
					fill="#070610"
				/>
			</g>
		</g>
	</AvatarSVG>

	<!-- Headphones overlay when playing music -->
	<AvatarHeadphones isVisible={isPlayingMusic} />
</div>

<style lang="scss">
	.face-container {
		--face-size: #{$avatar-radius * 2};
		width: var(--face-size);
		height: var(--face-size);
		display: inline-block;
		position: relative;
		border-radius: $avatar-radius;
	}

	.face-container :global(svg) {
		border-radius: $avatar-radius;
		width: 100%;
		height: 100%;
	}

	.face :global(.normal),
	.face :global(.open-mouth),
	.face :global(.blink) {
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.face :global(.normal) {
		opacity: 1;
	}

	.face.hover :global(.normal) {
		opacity: 0;
	}

	.face.hover :global(.open-mouth) {
		opacity: 1;
	}

	.face.blink :global(.normal) {
		opacity: 0;
	}

	.face.blink :global(.blink) {
		opacity: 1;
	}
</style>
