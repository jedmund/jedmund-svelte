import type { PageLoad } from './$types'
import type { LabProject } from '$lib/types/labs'

export const load: PageLoad = async () => {
	const projects: LabProject[] = [
		{
			id: 'granblue-team',
			title: 'granblue.team',
			description: 'A comprehensive web application for Granblue Fantasy players to track raids, manage crews, and optimize team compositions. Features real-time raid tracking, character databases, and community tools.',
			status: 'active',
			technologies: [],
			url: 'https://granblue.team',
			github: 'https://github.com/jedmund/granblue-team',
			year: 2022,
			featured: true
		},
		{
			id: 'subway-board',
			title: 'Subway Board',
			description: 'A beautiful, minimalist dashboard displaying real-time NYC subway arrival times. Clean interface inspired by the classic subway map design with live MTA data integration.',
			status: 'maintenance',
			technologies: [],
			github: 'https://github.com/jedmund/subway-board',
			year: 2023,
			featured: true
		},
		{
			id: 'siero-discord',
			title: 'Siero for Discord',
			description: 'A Discord bot for Granblue Fantasy communities providing character lookups, raid notifications, and server management tools. Serves thousands of users across multiple servers.',
			status: 'active',
			technologies: [],
			github: 'https://github.com/jedmund/siero-bot',
			year: 2021,
			featured: true
		},
		{
			id: 'homelab',
			title: 'Homelab',
			description: 'Self-hosted infrastructure running on Kubernetes with monitoring, media servers, and development environments. Includes automated deployments and backup strategies.',
			status: 'active',
			technologies: [],
			github: 'https://github.com/jedmund/homelab',
			year: 2023,
			featured: false
		}
	]

	return {
		projects
	}
}