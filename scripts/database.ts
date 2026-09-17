import { spawnSync } from 'node:child_process'
import { readdir, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
	assertDifferent,
	backup,
	connection,
	databaseExists,
	loadEnvironment,
	preflight,
	requireLocal,
	restore,
	redact
} from './lib/database.ts'

const args = process.argv.slice(2)
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
Object.assign(process.env, loadEnvironment(flag('--env-file')))
const remote = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL_PRODUCTION
const local = process.env.DATABASE_URL
async function confirm(prompt: string, expected: string) {
	const rl = createInterface({ input: stdin, output: stdout })
	try {
		if ((await rl.question(prompt)) !== expected) throw new Error('Cancelled')
	} finally {
		rl.close()
	}
}
async function chooseBackup() {
	const files = (await readdir('backups'))
		.filter((file) => /\.sql(?:\.gz)?$/.test(file))
		.sort()
		.reverse()
	if (!files.length) throw new Error('No SQL backups found in backups/')
	files.forEach((file, index) => console.log(`${index + 1}. ${file}`))
	const rl = createInterface({ input: stdin, output: stdout })
	try {
		const choice = Number(await rl.question('Backup number: '))
		if (!Number.isInteger(choice) || choice < 1 || choice > files.length)
			throw new Error('Invalid backup selection')
		return `backups/${files[choice - 1]}`
	} finally {
		rl.close()
	}
}
function migrate(target: string) {
	const result = spawnSync('corepack', ['pnpm', 'db:deploy'], {
		env: { ...process.env, DATABASE_URL: target },
		encoding: 'utf8'
	})
	if (result.status !== 0)
		throw new Error(
			redact(`Local migration failed: ${result.stderr}`, [connection(target).password])
		)
}
async function main() {
	if (args[0] === 'clone') {
		requireLocal(local)
		connection(remote)
		const target = new URL(local!)
		const name = flag('--database') || `jedmund_edra_test_${Date.now()}`
		if (!/^jedmund_edra_test_[a-zA-Z0-9_]+$/.test(name))
			throw new Error('Test database names must start with jedmund_edra_test_')
		target.pathname = `/${name}`
		assertDifferent(remote!, target.toString())
		if (databaseExists(target.toString())) throw new Error('Test database already exists')
		preflight(remote!, target.toString())
		const file = await backup(remote!, 'backups', 'remote_for_edra')
		console.log(`Production dump: ${file}`)
		await restore(file, target.toString())
		migrate(target.toString())
		const envFile = `backups/${name}.env`
		await writeFile(envFile, `DATABASE_URL=${JSON.stringify(target.toString())}\n`, {
			mode: 0o600,
			flag: 'wx'
		})
		console.log(`Local clone: ${name}\nEnvironment file: ${envFile}`)
		return
	}
	if (args[0] === 'backup') {
		if (args[1] === 'sync') {
			assertDifferent(remote!, local!)
			preflight(remote!, local!)
			console.log(`Local backup: ${await backup(local!, 'backups', 'local_before_sync')}`)
			const file = await backup(remote!, 'backups', 'remote_for_sync')
			console.log(`Production dump: ${file}`)
			await confirm(`Replace local database ${connection(local!).name}? Type y: `, 'y')
			await restore(file, local!, true)
			migrate(local!)
		} else {
			if (!['local', 'remote'].includes(args[1])) throw new Error('Usage: backup local|remote|sync')
			const target = args[1] === 'local' ? local : remote
			if (args[1] === 'local') requireLocal(target)
			preflight(target!)
			console.log(`Backup: ${await backup(target!, 'backups', args[1])}`)
		}
		return
	}
	if (args[0] === 'restore') {
		const kind = args[2] || 'local'
		if (!['local', 'remote'].includes(kind))
			throw new Error('Usage: restore <file.sql[.gz]> [local|remote]')
		const file = args[1] || (await chooseBackup())
		const target = kind === 'local' ? local : remote
		if (kind === 'local') requireLocal(target)
		const expected = kind === 'remote' ? 'RESTORE REMOTE' : 'y'
		await confirm(
			`Replace ${kind} database ${connection(target).name}? Type ${expected}: `,
			expected
		)
		if (databaseExists(target!))
			console.log(
				`Before-restore backup: ${await backup(target!, 'backups', `${kind}_before_restore`)}`
			)
		await restore(file, target!, true)
		if (kind === 'local') migrate(target!)
		return
	}
	throw new Error('Usage: database.ts backup|restore|clone')
}
main().catch((error) => {
	console.error(redact(error.message))
	process.exitCode = 1
})
