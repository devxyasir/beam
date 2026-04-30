import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ToolTint, tintClasses } from './designTokens'
import { IconChevronDown, IconCheck, IconX } from './Icons'

// Types
export interface ToolHeaderParams {
	icon?: React.ReactNode
	title: React.ReactNode
	desc1?: React.ReactNode
	desc1Info?: React.ReactNode
	desc1OnClick?: () => void
	children?: React.ReactNode
	noCopy?: boolean
	isOpen?: boolean
	isError?: boolean
	isRejected?: boolean
	onClick?: () => void
	info?: React.ReactNode
	className?: string
	tint?: ToolTint
}

// Tool children wrapper component
export const ToolChildrenWrapper = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
	<div className={`px-4 pb-3 ${className}`}>{children}</div>
)

// Code children wrapper
export const CodeChildren = ({ text, className = '' }: { text: string, className?: string }) => (
	<pre className={`bg-beam-bg-3 rounded p-3 overflow-auto max-h-96 text-xs font-mono ${className}`}>
		<code>{text}</code>
	</pre>
)

// Main ToolHeaderWrapper component
export const ToolHeaderWrapper = ({
	icon,
	title,
	desc1,
	desc1Info,
	desc1OnClick,
	children,
	noCopy = false,
	isOpen: isOpenProp = true,
	isError = false,
	isRejected = false,
	onClick,
	info,
	className = '',
	tint = 'gray',
}: ToolHeaderParams) => {
	const [open, setOpen] = useState(isOpenProp)
	const [copied, setCopied] = useState(false)

	// Sync with prop changes
	useEffect(() => {
		setOpen(isOpenProp)
	}, [isOpenProp])

	// Children ref for measuring height
	const childrenRef = useRef<HTMLDivElement>(null)
	const childrenHeight = useRef(0)

	useEffect(() => {
		if (childrenRef.current) {
			childrenHeight.current = childrenRef.current.offsetHeight
		}
	}, [children])

	// Get tint classes or use error/rejected states
	const tintClass = isRejected || isError ? tintClasses.gray : tintClasses[tint]
	const borderColor = isRejected ? 'border-beam-border' : isError ? 'border-red-500' : tintClass.border
	const bgColor = tintClass.bg

	// Handle copy
	const handleCopy = useCallback(() => {
		if (!children || noCopy) return
		// Extract text content from children
		let textToCopy = ''
		if (typeof children === 'string') {
			textToCopy = children
		} else if (React.isValidElement(children) && children.props?.text) {
			textToCopy = children.props.text
		}
		if (textToCopy) {
			navigator.clipboard.writeText(textToCopy)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}, [children, noCopy])

	// Check if children is code
	const childrenIsCode = React.isValidElement(children) && 
		(children.type === CodeChildren || 
		(children.type === ToolChildrenWrapper && React.isValidElement(children.props?.children) && 
			children.props.children.type === CodeChildren))

	const hasChildren = !!children

	return (
		<div className={`w-full overflow-hidden flex flex-col rounded-sm ${borderColor} ${bgColor} border-l-[2px] ${className}`}>
			{/* Header */}
			<div
				className={`flex items-start justify-between gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors hover:bg-white/[0.02]`}
				onClick={() => {
					if (onClick) onClick()
					else setOpen(v => !v)
				}}
			>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					{icon && (
						<div className={`flex-shrink-0 ${tintClass.icon}`}>
							{icon}
						</div>
						)}
					<div className="flex flex-col min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm text-beam-fg truncate">{title}</span>
							{info && <span className="text-xs text-beam-fg-3">{info}</span>}
						</div>
						{desc1 && (
							<div className="flex items-center gap-1.5 text-xs text-beam-fg-3">
								{desc1OnClick ? (
									<button
										onClick={(e) => {
											e.stopPropagation()
											desc1OnClick()
										}}
										className="hover:text-beam-fg transition-colors truncate text-left"
									>
										{desc1}
									</button>
								) : (
									<span className="truncate">{desc1}</span>
								)}
								{desc1Info && <span className="text-beam-fg-4">{desc1Info}</span>}
							</div>
						)}
					</div>
				</div>

				{/* Right side actions */}
				<div className="flex items-center gap-1 flex-shrink-0">
					{/* Copy button for code */}
					{hasChildren && !noCopy && childrenIsCode && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								handleCopy()
							}}
							className="p-1 rounded hover:bg-white/10 transition-colors text-beam-fg-3"
							title={copied ? 'Copied!' : 'Copy'}
						>
							{copied ? <IconCheck size={14} className="text-green-500" /> : <IconX size={14} />}
						</button>
					)}

					{/* Chevron toggle */}
					{hasChildren && (
						<div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
							<IconChevronDown size={16} className="text-beam-fg-3" />
						</div>
					)}
				</div>
			</div>

			{/* Collapsible content */}
			{hasChildren && (
				<div
					className="overflow-hidden transition-all duration-200"
					style={{ maxHeight: open ? childrenHeight.current || 'auto' : 0, opacity: open ? 1 : 0 }}
				>
					<div ref={childrenRef}>
						{children}
					</div>
				</div>
			)}
		</div>
	)
}

// Simplified tool header for basic displays
export const SimplifiedToolHeader = ({
	title,
	children,
}: {
	title: React.ReactNode
	children: React.ReactNode
}) => (
	<div className="flex flex-col border-l-2 border-beam-border/50 bg-beam-bg-2 rounded-sm overflow-hidden">
		<div className="px-3 py-2 text-sm font-medium text-beam-fg">{title}</div>
		<div className="px-3 pb-3">{children}</div>
	</div>
)

// Tool status badge component
export const ToolStatusBadge = ({
	status,
	tint,
}: {
	status: 'running' | 'success' | 'error' | 'rejected'
	tint: ToolTint
}) => {
	const tintClass = tintClasses[tint]

	const statusConfig = {
		running: { text: 'Running', animate: true },
		success: { text: 'Done', animate: false },
		error: { text: 'Error', animate: false },
		rejected: { text: 'Rejected', animate: false },
	}

	const config = statusConfig[status]

	return (
		<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${tintClass.dimBg} ${tintClass.icon} border ${tintClass.dimBorder}`}>
			{config.animate && <span className={`w-1.5 h-1.5 rounded-full ${tintClass.icon.replace('text-', 'bg-')} animate-pulse`} />}
			{config.text}
		</span>
	)
}

// File chip component for displaying file references
export const FileChip = ({
	filename,
	path,
	onClick,
	tint = 'blue',
}: {
	filename: string
	path?: string
	onClick?: () => void
	tint?: ToolTint
}) => {
	const tintClass = tintClasses[tint]

	const content = (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors hover:opacity-80 ${tintClass.dimBg} ${tintClass.dimBorder} border ${tintClass.icon}`}
			title={path}
		>
			{filename}
		</span>
	)

	if (onClick) {
		return <button onClick={onClick}>{content}</button>
	}
	return content
}
