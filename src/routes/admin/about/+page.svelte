<script lang="ts">
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import { toast } from '$lib/stores/toast'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Textarea from '$lib/components/admin/Textarea.svelte'
	import Switch from '$lib/components/admin/Switch.svelte'
	import SelectField from '$lib/components/admin/SelectField.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Composer from '$lib/components/admin/composer'
	import XIcon from '$icons/x.svg?component'
	import type { JSONContent } from '@tiptap/core'

	// Types
	interface Profile {
		id: number
		bio: JSONContent | null
		shortBio: string | null
		headline: string | null
		location: string | null
		avatarUrl: string | null
	}

	interface SocialLinkItem {
		id?: number
		platform: string
		label: string
		url: string
		isActive: boolean
		displayOrder: number
	}

	interface WorkHistoryItem {
		id?: number
		company: string
		role: string
		url: string
		startDate: string
		endDate: string
		isCurrent: boolean
		description: string
		displayOrder: number
	}

	interface MentionItem {
		id?: number
		title: string
		href: string
		source: string
		sourceType: string
		date: string
		isActive: boolean
		displayOrder: number
	}

	let loading = $state(true)
	let saving = $state(false)
	let activeTab = $state('bio')

	// Data
	let profile = $state<Profile>({
		id: 0,
		bio: null,
		shortBio: '',
		headline: '',
		location: '',
		avatarUrl: ''
	})
	let socialLinks = $state<SocialLinkItem[]>([])
	let deletedSocialLinks = $state<number[]>([])
	let workHistory = $state<WorkHistoryItem[]>([])
	let deletedWorkHistory = $state<number[]>([])
	let mentions = $state<MentionItem[]>([])
	let deletedMentions = $state<number[]>([])

	let editorInstance: { getContent: () => JSONContent | undefined } | undefined = $state()

	const tabOptions = [
		{ value: 'bio', label: 'Bio' },
		{ value: 'social', label: 'Social' },
		{ value: 'work', label: 'Work History' },
		{ value: 'mentions', label: 'Mentions' }
	]

	const sourceTypeOptions = [
		{ value: 'Article', label: 'Article' },
		{ value: 'Podcast', label: 'Podcast' },
		{ value: 'Blog', label: 'Blog' },
		{ value: 'Video', label: 'Video' },
		{ value: 'Interview', label: 'Interview' }
	]

	onMount(loadAllData)

	async function loadAllData() {
		try {
			const [profileRes, socialRes, workRes, mentionsRes] = await Promise.all([
				api.get<{ profile: Profile }>('/api/admin/about/profile'),
				api.get<{ items: SocialLinkItem[] }>('/api/admin/about/social-links'),
				api.get<{ items: WorkHistoryItem[] }>('/api/admin/about/work-history'),
				api.get<{ items: MentionItem[] }>('/api/admin/about/mentions')
			])

			if (profileRes?.profile) {
				profile = profileRes.profile
			}
			if (socialRes?.items) {
				socialLinks = socialRes.items
			}
			if (workRes?.items) {
				workHistory = workRes.items.map((item) => ({
					...item,
					startDate: item.startDate ? formatDateForInput(item.startDate) : '',
					endDate: item.endDate ? formatDateForInput(item.endDate) : '',
					url: item.url || '',
					description: item.description || ''
				}))
			}
			if (mentionsRes?.items) {
				mentions = mentionsRes.items.map((item) => ({
					...item,
					source: item.source || ''
				}))
			}
		} catch {
			toast.error('Failed to load about data')
		} finally {
			loading = false
		}
	}

	function formatDateForInput(dateStr: string): string {
		const d = new Date(dateStr)
		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, '0')
		return `${year}-${month}`
	}

	async function handleSave() {
		saving = true

		try {
			const bioContent = editorInstance?.getContent?.()

			const promises = []

			// Save profile
			promises.push(
				api.put('/api/admin/about/profile', {
					bio: bioContent ?? profile.bio,
					shortBio: profile.shortBio,
					headline: profile.headline,
					location: profile.location,
					avatarUrl: profile.avatarUrl
				})
			)

			// Save social links
			promises.push(
				api.put('/api/admin/about/social-links', {
					items: socialLinks.map((item, i) => ({ ...item, displayOrder: i })),
					deleted: deletedSocialLinks
				})
			)

			// Save work history
			promises.push(
				api.put('/api/admin/about/work-history', {
					items: workHistory.map((item, i) => ({
						...item,
						displayOrder: i,
						startDate: item.startDate ? `${item.startDate}-01` : undefined,
						endDate: item.endDate ? `${item.endDate}-01` : null
					})),
					deleted: deletedWorkHistory
				})
			)

			// Save mentions
			promises.push(
				api.put('/api/admin/about/mentions', {
					items: mentions.map((item, i) => ({ ...item, displayOrder: i })),
					deleted: deletedMentions
				})
			)

			await Promise.all(promises)

			deletedSocialLinks = []
			deletedWorkHistory = []
			deletedMentions = []

			toast.success('About page saved')
		} catch {
			toast.error('Failed to save about page')
		} finally {
			saving = false
		}
	}

	// Social Links
	function addSocialLink() {
		socialLinks = [
			...socialLinks,
			{ platform: '', label: '', url: '', isActive: true, displayOrder: socialLinks.length }
		]
	}

	function removeSocialLink(index: number) {
		const item = socialLinks[index]
		if (item.id) deletedSocialLinks = [...deletedSocialLinks, item.id]
		socialLinks = socialLinks.filter((_, i) => i !== index)
	}

	// Work History
	function addWorkHistory() {
		workHistory = [
			...workHistory,
			{
				company: '',
				role: '',
				url: '',
				startDate: '',
				endDate: '',
				isCurrent: false,
				description: '',
				displayOrder: workHistory.length
			}
		]
	}

	function removeWorkHistory(index: number) {
		const item = workHistory[index]
		if (item.id) deletedWorkHistory = [...deletedWorkHistory, item.id]
		workHistory = workHistory.filter((_, i) => i !== index)
	}

	function toggleCurrentPosition(index: number, checked: boolean) {
		workHistory[index].isCurrent = checked
		if (checked) {
			workHistory[index].endDate = ''
		}
	}

	// Mentions
	function addMention() {
		mentions = [
			...mentions,
			{
				title: '',
				href: '',
				source: '',
				sourceType: 'Article',
				date: '',
				isActive: true,
				displayOrder: mentions.length
			}
		]
	}

	function removeMention(index: number) {
		const item = mentions[index]
		if (item.id) deletedMentions = [...deletedMentions, item.id]
		mentions = mentions.filter((_, i) => i !== index)
	}

	function handleContentUpdate(content: JSONContent) {
		profile.bio = content
	}
</script>

<svelte:head>
	<title>About - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<header class="about-header">
			<div class="header-left">
				<h1>About</h1>
			</div>
			<div class="header-center">
				<AdminSegmentedControl
					options={tabOptions}
					value={activeTab}
					onChange={(value) => (activeTab = value)}
				/>
			</div>
			<div class="header-right">
				<Button variant="primary" onclick={handleSave} loading={saving}>
					Save changes
				</Button>
			</div>
		</header>
	{/snippet}

	<div class="about-container">
		{#if loading}
			<div class="loading-container">
				<LoadingSpinner />
			</div>
		{:else}
			<div class="tab-panels">
				<!-- Bio Tab -->
				<div class="panel" class:active={activeTab === 'bio'}>
					<div class="form-section">
						<Input label="Headline" bind:value={profile.headline} placeholder="Software designer and developer" />
						<Input label="Location" bind:value={profile.location} placeholder="San Francisco" />
						<Textarea
							label="Short Bio"
							bind:value={profile.shortBio}
							rows={4}
							helpText="Plain text shown on the home page intro card"
						/>
					</div>
					<div class="form-section">
						<h3>Full Bio</h3>
						<div class="composer-wrapper">
							<Composer
								bind:this={editorInstance}
								data={profile.bio ?? undefined}
								placeholder="Write your bio..."
								onChange={handleContentUpdate}
								variant="minimal"
								features={{
									imageUpload: false,
									mediaLibrary: false,
									urlEmbed: false,
									tables: false,
									codeBlocks: false,
									bubbleMenu: true,
									toolbar: true
								}}
							/>
						</div>
					</div>
				</div>

				<!-- Social Links Tab -->
				<div class="panel" class:active={activeTab === 'social'}>
					<div class="form-section">
						<div class="section-header">
							<h3>Social Links</h3>
							<Button variant="secondary" buttonSize="small" onclick={addSocialLink}>
								Add social link
							</Button>
						</div>

						{#each socialLinks as link, index}
							<div class="list-row">
								<div class="list-row-fields">
									<Input label="Label" bind:value={link.label} placeholder="Platform name" />
									<Input label="URL" bind:value={link.url} placeholder="https://..." />
								</div>
								<div class="list-row-actions">
									<div class="switch-label">
										<span>Active</span>
										<Switch bind:checked={link.isActive} />
									</div>
									<Button
										variant="danger-text"
										buttonSize="small"
										iconOnly
										onclick={() => removeSocialLink(index)}
									>
										{#snippet icon()}
											<XIcon />
										{/snippet}
									</Button>
								</div>
							</div>
						{/each}

						{#if socialLinks.length === 0}
							<p class="empty-state">No social links yet.</p>
						{/if}
					</div>
				</div>

				<!-- Work History Tab -->
				<div class="panel" class:active={activeTab === 'work'}>
					<div class="form-section">
						<div class="section-header">
							<h3>Work History</h3>
							<Button variant="secondary" buttonSize="small" onclick={addWorkHistory}>
								Add work experience
							</Button>
						</div>

						{#each workHistory as entry, index}
							<div class="card-row">
								<div class="card-row-header">
									<span class="card-row-title">
										{entry.company || 'New Entry'}
										{#if entry.role}
											<span class="card-row-subtitle"> — {entry.role}</span>
										{/if}
									</span>
									<Button
										variant="danger-text"
										buttonSize="small"
										iconOnly
										onclick={() => removeWorkHistory(index)}
									>
										{#snippet icon()}
											<XIcon />
										{/snippet}
									</Button>
								</div>
								<div class="card-row-fields">
									<Input label="Company" bind:value={entry.company} placeholder="Company name" />
									<Input label="Role" bind:value={entry.role} placeholder="Job title" />
									<Input label="URL" bind:value={entry.url} placeholder="https://..." />
									<div class="date-row">
										<Input label="Start Date" type="month" bind:value={entry.startDate} />
										<Input
											label="End Date"
											type="month"
											bind:value={entry.endDate}
											disabled={entry.isCurrent}
										/>
										<div class="switch-label">
											<span>Current</span>
											<Switch
												checked={entry.isCurrent}
												onchange={(checked) => toggleCurrentPosition(index, checked)}
											/>
										</div>
									</div>
									<Textarea
										label="Description"
										bind:value={entry.description}
										rows={2}
										placeholder="Brief description (optional)"
									/>
								</div>
							</div>
						{/each}

						{#if workHistory.length === 0}
							<p class="empty-state">No work history yet.</p>
						{/if}
					</div>
				</div>

				<!-- Mentions Tab -->
				<div class="panel" class:active={activeTab === 'mentions'}>
					<div class="form-section">
						<div class="section-header">
							<h3>Mentions</h3>
							<Button variant="secondary" buttonSize="small" onclick={addMention}>
								Add mention
							</Button>
						</div>

						{#each mentions as mention, index}
							<div class="list-row">
								<div class="list-row-fields mentions-fields">
									<Input label="Title" bind:value={mention.title} placeholder="Article title" />
									<Input label="URL" bind:value={mention.href} placeholder="https://..." />
									<div class="mention-meta-row">
										<Input
											label="Source"
											bind:value={mention.source}
											placeholder="e.g. USA Today"
										/>
										<SelectField
											label="Type"
											options={sourceTypeOptions}
											bind:value={mention.sourceType}
										/>
										<Input
											label="Date"
											bind:value={mention.date}
											placeholder="Apr 2018"
										/>
									</div>
								</div>
								<div class="list-row-actions">
									<div class="switch-label">
										<span>Active</span>
										<Switch bind:checked={mention.isActive} />
									</div>
									<Button
										variant="danger-text"
										buttonSize="small"
										iconOnly
										onclick={() => removeMention(index)}
									>
										{#snippet icon()}
											<XIcon />
										{/snippet}
									</Button>
								</div>
							</div>
						{/each}

						{#if mentions.length === 0}
							<p class="empty-state">No mentions yet.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</AdminPage>

<style lang="scss">
	.about-header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		h1 {
			margin: 0;
			font-size: $font-size-large;
			font-weight: 700;
			color: $gray-10;
		}
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-center {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.header-right {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.about-container {
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.tab-panels {
		.panel {
			display: none;

			&.active {
				display: block;
			}
		}
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin-bottom: $unit-4x;

		h3 {
			margin: 0;
			font-size: $font-size-small;
			font-weight: 600;
			color: $gray-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.composer-wrapper {
		border: 1px solid $gray-80;
		border-radius: $corner-radius-lg;
		min-height: 200px;
		overflow: hidden;
	}

	// List rows (social links, mentions)
	.list-row {
		display: flex;
		gap: $unit-2x;
		align-items: flex-start;
		padding: $unit-2x;
		background: $gray-95;
		border-radius: $corner-radius-lg;
	}

	.list-row-fields {
		flex: 1;
		display: flex;
		gap: $unit-2x;

		:global(.form-field) {
			flex: 1;
		}
	}

	.list-row-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding-top: $unit-3x;
	}

	.switch-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-small;
		color: $gray-30;
		white-space: nowrap;
	}

	// Card rows (work history)
	.card-row {
		padding: $unit-2x;
		background: $gray-95;
		border-radius: $corner-radius-lg;
	}

	.card-row-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: $unit-2x;
	}

	.card-row-title {
		font-weight: 600;
		font-size: $font-size-small;
		color: $gray-10;
	}

	.card-row-subtitle {
		font-weight: 400;
		color: $gray-40;
	}

	.card-row-fields {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.date-row {
		display: flex;
		gap: $unit-2x;
		align-items: flex-end;

		:global(.form-field) {
			flex: 1;
		}

		.switch-label {
			padding-bottom: $unit;
		}
	}

	// Mentions-specific
	.mentions-fields {
		flex-direction: column;
	}

	.mention-meta-row {
		display: flex;
		gap: $unit-2x;

		:global(.form-field) {
			flex: 1;
		}
	}

	.empty-state {
		text-align: center;
		color: $gray-40;
		padding: $unit-4x;
		font-size: $font-size-small;
	}
</style>
