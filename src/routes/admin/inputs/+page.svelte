<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Button from '$lib/components/admin/Button.svelte'

	let textValue = $state('')
	let emailValue = $state('')
	let passwordValue = $state('')
	let urlValue = $state('https://')
	let searchValue = $state('')
	let numberValue = $state(0)
	let textareaValue = $state('')
	let colorValue = $state('#ff0000')
	let withErrorValue = $state('')
	let disabledValue = $state('Disabled input')
	let readonlyValue = $state('Readonly input')
	let charLimitValue = $state('')
</script>

<AdminPage title="Input Components Demo">
	<div class="input-demo">
		<section>
			<h2>Basic Inputs</h2>
			<div class="input-group">
				<Input
					label="Text Input"
					placeholder="Enter some text"
					bind:value={textValue}
					helpText="This is a helpful hint"
				/>

				<Input
					type="email"
					label="Email Input"
					placeholder="email@example.com"
					bind:value={emailValue}
					required
				/>

				<Input
					type="password"
					label="Password Input"
					placeholder="Enter password"
					bind:value={passwordValue}
					required
				/>
			</div>
		</section>

		<section>
			<h2>Specialized Inputs</h2>
			<div class="input-group">
				<Input
					type="url"
					label="URL Input"
					placeholder="https://example.com"
					bind:value={urlValue}
				/>

				<Input
					type="search"
					label="Search Input"
					placeholder="Search..."
					bind:value={searchValue}
					prefixIcon
				>
					<svg slot="prefix" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
						<path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				</Input>

				<Input
					type="number"
					label="Number Input"
					bind:value={numberValue}
					min={0}
					max={100}
					step={5}
				/>

				<Input type="color" label="Color Input" bind:value={colorValue} />
			</div>
		</section>

		<section>
			<h2>Textarea</h2>
			<Input
				type="textarea"
				label="Description"
				placeholder="Enter a detailed description..."
				bind:value={textareaValue}
				rows={4}
				helpText="Markdown is supported"
			/>
		</section>

		<section>
			<h2>Input Sizes</h2>
			<div class="input-group">
				<Input buttonSize="small" label="Small Input" placeholder="Small size" />

				<Input buttonSize="medium" label="Medium Input" placeholder="Medium size (default)" />

				<Input buttonSize="large" label="Large Input" placeholder="Large size" />
			</div>
		</section>

		<section>
			<h2>Input States</h2>
			<div class="input-group">
				<Input
					label="Input with Error"
					placeholder="Try typing something"
					bind:value={withErrorValue}
					error={withErrorValue.length > 0 && withErrorValue.length < 3
						? 'Too short! Minimum 3 characters'
						: ''}
				/>

				<Input label="Disabled Input" bind:value={disabledValue} disabled />

				<Input label="Readonly Input" bind:value={readonlyValue} readonly />
			</div>
		</section>

		<section>
			<h2>Input with Icons</h2>
			<div class="input-group">
				<Input label="With Prefix Icon" placeholder="Username" prefixIcon>
					<svg slot="prefix" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
						<path
							d="M4 14c0-2.21 1.79-4 4-4s4 1.79 4 4"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
				</Input>

				<Input label="With Suffix Icon" placeholder="Email" type="email" suffixIcon>
					<svg slot="suffix" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<rect
							x="2"
							y="4"
							width="12"
							height="8"
							rx="1"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<path
							d="M2 5l6 3 6-3"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
				</Input>
			</div>
		</section>

		<section>
			<h2>Character Limit</h2>
			<Input
				label="Bio"
				placeholder="Tell us about yourself..."
				bind:value={charLimitValue}
				maxLength={100}
				showCharCount
				helpText="Keep it brief"
			/>

			<Input
				type="textarea"
				label="Tweet-style Input"
				placeholder="What's happening?"
				maxLength={280}
				showCharCount
				rows={3}
			/>
		</section>

		<section>
			<h2>Form Example</h2>
			<form class="demo-form" on:submit|preventDefault>
				<Input label="Project Name" placeholder="My Awesome Project" required />

				<Input
					type="url"
					label="Project URL"
					placeholder="https://example.com"
					helpText="Include the full URL with https://"
				/>

				<Input
					type="textarea"
					label="Project Description"
					placeholder="Describe your project..."
					rows={4}
					maxLength={500}
					showCharCount
				/>

				<div class="form-actions">
					<Button variant="secondary">Cancel</Button>
					<Button variant="primary" type="submit">Save Project</Button>
				</div>
			</form>
		</section>
	</div>
</AdminPage>

<style lang="scss">
	.input-demo {
		display: flex;
		flex-direction: column;
		gap: $unit-5x;
		max-width: 800px;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		h2 {
			font-size: 18px;
			font-weight: 600;
			color: $grey-20;
			margin: 0;
		}
	}

	.input-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: $unit-3x;
	}

	.demo-form {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding: $unit-3x;
		background-color: $grey-97;
		border-radius: 8px;
	}

	.form-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
		margin-top: $unit-2x;
	}
</style>
