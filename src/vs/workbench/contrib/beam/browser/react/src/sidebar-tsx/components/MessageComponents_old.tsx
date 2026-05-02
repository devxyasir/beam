import React, { useEffect, useState } from 'react'
import { IconCheck, IconCopy, IconRefresh, IconThumbsUp, IconThumbsDown, IconDots, IconLoading } from './Icons.js'

// Message wrapper for consistent spacing
export const MessageWrapper = ({ children, className = '', isGhost = false }: { children: React.ReactNode; className?: string; isGhost?: boolean }) => (
	<div className={`relative mb-4 ${isGhost ? 'opacity-50' : ''} ${className}`}>
		{children}
	</div>
)

// Small prose wrapper for reasoning blocks
export const SmallProseWrapper = ({ children }: { children: React.ReactNode }) => (
	<div className="
		text-beam-fg-4
		prose
		prose-xs
		prose-invert
		max-w-none
		prose-headings:mt-2
		prose-headings:mb-1
		prose-p:my-1
		prose-pre:my-2
		prose-ol:my-1
		prose-ul:my-1
		prose-li:my-0.5
	">
		{children}
	</div>
)

// Full prose wrapper for assistant messages
export const ProseWrapper = ({ children }: { children: React.ReactNode }) => (
	<div className="
		text-beam-fg-2
		prose
		prose-invert
		max-w-none
		prose-headings:mt-4
		prose-headings:mb-2
		prose-p:my-2
		prose-pre:my-3
		prose-ol:my-2
		prose-ul:my-2
		prose-li:my-1
		prose-a:text-blue-400
		prose-a:hover:text-blue-300
	">
		{children}
	</div>
)

// Message timestamp
export const MessageTimestamp = ({ time }: { time: Date | number | string }) => {
	const formatted = new Date(time).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	return (
		<span className="text-[10px] text-beam-fg-4 ml-2 select-none">
			{formatted}
		</span>
	)
}

// Copy button with feedback
export const CopyButton = ({ text, size = 16, className = '' }: { text: string; size?: number; className?: string }) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<button
			onClick={handleCopy}
			className={`p-1 rounded hover:bg-white/10 transition-colors text-beam-fg-3 ${className}`}
			title={copied ? 'Copied!' : 'Copy'}
		>
			{copied ? <IconCheck size={size} className="text-green-500" /> : <IconCopy size={size} />}
		</button>
	)
}

// Message action bar
export const MessageActionBar = ({
	content,
	onRetry,
	onFeedback,
	isStreaming = false,
}: {
	content: string
	onRetry?: () => void
	onFeedback?: (type: 'good' | 'bad') => void
	isStreaming?: boolean
}) => {
	if (isStreaming) return null

	return (
		<div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
			<CopyButton text={content} size={14} />

			{onRetry && (
				<button
					onClick={onRetry}
					className="p-1 rounded hover:bg-white/10 transition-colors text-beam-fg-3"
					title="Regenerate"
				>
					<IconRefresh size={14} />
				</button>
			)}

			{onFeedback && (
				<>
					<div className="w-px h-4 bg-beam-border-2 mx-1" />
					<button
						onClick={() => onFeedback('good')}
						className="p-1 rounded hover:bg-white/10 transition-colors text-beam-fg-3"
						title="Helpful"
					>
						<IconThumbsUp size={14} />
					</button>
					<button
						onClick={() => onFeedback('bad')}
						className="p-1 rounded hover:bg-white/10 transition-colors text-beam-fg-3"
						title="Not helpful"
					>
						<IconThumbsDown size={14} />
					</button>
				</>
			)}
		</div>
	)
}

// User message component
export const UserMessage = ({
	content,
	files = [],
	className = '',
}: {
	content: string
	files?: Array<{ name: string; uri: string }>
	className?: string
}) => (
	<div className={`group ${className}`}>
		<div className="bg-beam-bg-3/50 rounded-lg px-3 py-2">
			{/* File attachments */}
			{files.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-2">
					{files.map((file, idx) => (
						<span
							key={idx}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-beam-bg-1 border border-beam-border-2 text-beam-fg-3"
						>
							📄 {file.name}
						</span>
					))}
				</div>
			)}
			{/* Message content */}
			<div className="text-sm text-beam-fg whitespace-pre-wrap break-words">{content}</div>
		</div>
	</div>
)

// Assistant message component
export const AssistantMessage = ({
	content,
	isStreaming = false,
	isGhost = false,
	onRetry,
	onFeedback,
	className = '',
}: {
	content: string
	isStreaming?: boolean
	isGhost?: boolean
	onRetry?: () => void
	onFeedback?: (type: 'good' | 'bad') => void
	className?: string
}) => (
	<div className={`group ${isGhost ? 'opacity-50' : ''} ${className}`}>
		<div className="text-sm text-beam-fg-2">
			{content}
			{isStreaming && <span className="inline-block ml-1 animate-pulse">▋</span>}
		</div>

		{/* Action bar */}
		{!isStreaming && (
			<MessageActionBar
				content={content}
				onRetry={onRetry}
				onFeedback={onFeedback}
			/>
		)}
	</div>
)

// Streaming indicator for loading states
export const StreamingIndicator = ({ text = 'Thinking' }: { text?: string }) => (
	<div className="flex items-center gap-2 text-beam-fg-4 text-xs py-2">
		<div className="flex items-center gap-1">
			<span className="w-1.5 h-1.5 bg-beam-fg-4 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
			<span className="w-1.5 h-1.5 bg-beam-fg-4 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
			<span className="w-1.5 h-1.5 bg-beam-fg-4 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
		</div>
		<span>{text}</span>
	</div>
)

// Chat message group (combines user + assistant)
export const ChatMessageGroup = ({
	children,
	className = '',
}: {
	children: React.ReactNode
	className?: string
}) => (
	<div className={`flex flex-col gap-4 ${className}`}>
		{children}
	</div>
)
