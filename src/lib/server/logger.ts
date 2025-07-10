import { dev } from '$app/environment'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'music' | 'api' | 'db' | 'media' | 'general'

interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	context?: Record<string, any>
	error?: Error
	category?: LogCategory
}

class Logger {
	private debugCategories: Set<LogCategory> = new Set()

	constructor() {
		// Parse DEBUG environment variable to enable specific categories
		const debugEnv = process.env.DEBUG || ''
		if (debugEnv) {
			const categories = debugEnv.split(',').map((c) => c.trim()) as LogCategory[]
			categories.forEach((cat) => this.debugCategories.add(cat))
		}
	}

	private shouldLog(level: LogLevel, category?: LogCategory): boolean {
		// Always log warnings and errors
		if (level === 'warn' || level === 'error') return true

		// In development, check if category debugging is enabled
		if (dev && category && this.debugCategories.size > 0) {
			return this.debugCategories.has(category)
		}

		// In development without category debugging, log everything except music logs
		if (dev && !category) return true
		if (dev && category === 'music') return this.debugCategories.has('music')

		// In production, only log warnings and errors
		return false
	}

	private formatLog(entry: LogEntry): string {
		const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`]

		if (entry.category) {
			parts.push(`[${entry.category.toUpperCase()}]`)
		}

		parts.push(entry.message)

		if (entry.context) {
			parts.push(JSON.stringify(entry.context, null, 2))
		}

		if (entry.error) {
			parts.push(`\nError: ${entry.error.message}`)
			if (entry.error.stack) {
				parts.push(`Stack: ${entry.error.stack}`)
			}
		}

		return parts.join(' ')
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, any>,
		error?: Error,
		category?: LogCategory
	) {
		if (!this.shouldLog(level, category)) return

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
			error,
			category
		}

		const formatted = this.formatLog(entry)

		switch (level) {
			case 'debug':
			case 'info':
				console.log(formatted)
				break
			case 'warn':
				console.warn(formatted)
				break
			case 'error':
				console.error(formatted)
				break
		}
	}

	debug(message: string, context?: Record<string, any>, category?: LogCategory) {
		this.log('debug', message, context, undefined, category)
	}

	info(message: string, context?: Record<string, any>, category?: LogCategory) {
		this.log('info', message, context, undefined, category)
	}

	warn(message: string, context?: Record<string, any>, category?: LogCategory) {
		this.log('warn', message, context, undefined, category)
	}

	error(message: string, error?: Error, context?: Record<string, any>, category?: LogCategory) {
		this.log('error', message, context, error, category)
	}

	// Convenience method for music-related logs
	music(level: LogLevel, message: string, context?: Record<string, any>) {
		this.log(level, message, context, undefined, 'music')
	}

	// Log API requests
	apiRequest(method: string, path: string, context?: Record<string, any>) {
		this.info(`API Request: ${method} ${path}`, context)
	}

	// Log API responses
	apiResponse(method: string, path: string, status: number, duration: number) {
		const level = status >= 400 ? 'error' : 'info'
		this.log(level, `API Response: ${method} ${path} - ${status} (${duration}ms)`, {
			status,
			duration
		})
	}

	// Log database operations
	dbQuery(operation: string, model: string, duration?: number, context?: Record<string, any>) {
		this.debug(`DB Query: ${operation} on ${model}`, {
			...context,
			duration: duration ? `${duration}ms` : undefined
		})
	}

	// Log media operations
	mediaUpload(filename: string, size: number, mimeType: string, success: boolean) {
		const level = success ? 'info' : 'error'
		this.log(level, `Media Upload: ${filename}`, {
			size: `${(size / 1024 / 1024).toFixed(2)} MB`,
			mimeType,
			success
		})
	}
}

export const logger = new Logger()

// Middleware to log API requests
export function createRequestLogger() {
	return (event: any) => {
		const start = Date.now()
		const { method, url } = event.request
		const path = new URL(url).pathname

		logger.apiRequest(method, path, {
			headers: Object.fromEntries(event.request.headers),
			ip: event.getClientAddress()
		})

		// Log response after it's sent
		event.locals.logResponse = (status: number) => {
			const duration = Date.now() - start
			logger.apiResponse(method, path, status, duration)
		}
	}
}
