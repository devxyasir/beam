import React, { useState, useEffect } from 'react'

// Icon components matching Windsurf's clean aesthetic

export const IconX = ({ size, className = '', ...props }: { size: number, className?: string } & React.SVGProps<SVGSVGElement>) => (
	<svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className} {...props}>
		<path d='M18 6 6 18' />
		<path d='m6 6 12 12' />
	</svg>
)

export const IconArrowUp = ({ size, className = '' }: { size: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='m18 15-6-6-6 6' />
	</svg>
)

export const IconSquare = ({ size, className = '' }: { size: number, className?: string }) => (
	<svg className={className} width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
		<rect x='3' y='3' width='18' height='18' rx='2' />
	</svg>
)

export const IconWarning = ({ size, className = '' }: { size: number, className?: string }) => (
	<svg className={className} width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
		<path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' />
		<path d='M12 9v4' />
		<path d='M12 17h.01' />
	</svg>
)

export const IconLoading = ({ className = '' }: { className?: string }) => {
	const [loadingText, setLoadingText] = useState('.')
	useEffect(() => {
		const interval = setInterval(() => {
			setLoadingText((prev) => {
				if (prev === '.') return '..'
				if (prev === '..') return '...'
				return '.'
			})
		}, 300)
		return () => clearInterval(interval)
	}, [])
	return <span className={`inline-block w-4 text-center ${className}`}>{loadingText}</span>
}

export const IconCheck = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<polyline points='20 6 9 17 4 12' />
	</svg>
)

export const IconChevronDown = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='m6 9 6 6 6-6' />
	</svg>
)

export const IconChevronRight = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='m9 18 6-6-6-6' />
	</svg>
)

export const IconFile = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' />
		<polyline points='14 2 14 8 20 8' />
	</svg>
)

export const IconFolder = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' />
	</svg>
)

export const IconTerminal = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<polyline points='4 17 10 11 4 5' />
		<line x1='12' y1='19' x2='20' y2='19' />
	</svg>
)

export const IconSearch = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<circle cx='11' cy='11' r='8' />
		<path d='m21 21-4.3-4.3' />
	</svg>
)

export const IconEdit = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
		<path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
	</svg>
)

export const IconCopy = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
		<path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
	</svg>
)

export const IconRefresh = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
		<path d='M21 3v5h-5' />
		<path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
		<path d='M8 16H3v5' />
	</svg>
)

export const IconThumbsUp = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' />
	</svg>
)

export const IconThumbsDown = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3' />
	</svg>
)

export const IconDots = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<circle cx='12' cy='12' r='1' />
		<circle cx='19' cy='12' r='1' />
		<circle cx='5' cy='12' r='1' />
	</svg>
)

export const IconSparkles = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275z' />
	</svg>
)

export const IconBrain = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
	<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={className}>
		<path d='M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z' />
		<path d='M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z' />
	</svg>
)

// Dot pulse animation for loading states
export const IconDotPulse = ({ color = 'bg-blue-500' }: { color?: string }) => (
	<div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
)
