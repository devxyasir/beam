// Design tokens based on agentic_ide_chat_design_plan.html spec
// Matches Windsurf's design system

export const colors = {
	// Base
	bg: '#0d0d0f',
	surface: '#141417',
	surface2: '#1a1a1f',
	surface3: '#202025',
	border: 'rgba(255,255,255,0.07)',
	border2: 'rgba(255,255,255,0.12)',
	text: '#e8e6e0',
	muted: '#888580',

	// Semantic
	blue: '#4d9bff',
	blueDim: 'rgba(77,155,255,0.12)',
	blueDimBorder: 'rgba(77,155,255,0.3)',

	green: '#3ddc84',
	greenDim: 'rgba(61,220,132,0.1)',
	greenDimBorder: 'rgba(61,220,132,0.3)',

	amber: '#f5a623',
	amberDim: 'rgba(245,166,35,0.1)',
	amberDimBorder: 'rgba(245,166,35,0.3)',

	red: '#ff5c57',
	redDim: 'rgba(255,92,87,0.1)',
	redDimBorder: 'rgba(255,92,87,0.3)',

	purple: '#b57bee',
	purpleDim: 'rgba(181,123,238,0.1)',
	purpleDimBorder: 'rgba(181,123,238,0.3)',

	teal: '#2dd9c0',
	tealDim: 'rgba(45,217,192,0.1)',
} as const

// Tailwind classes for dynamic usage
export const tintClasses = {
	blue: {
		border: 'border-blue-500/30',
		bg: 'bg-blue-500/5',
		icon: 'text-blue-500',
		dimBg: 'bg-blue-500/10',
		dimBorder: 'border-blue-500/30',
	},
	green: {
		border: 'border-green-500/30',
		bg: 'bg-green-500/5',
		icon: 'text-green-500',
		dimBg: 'bg-green-500/10',
		dimBorder: 'border-green-500/30',
	},
	amber: {
		border: 'border-amber-500/30',
		bg: 'bg-amber-500/5',
		icon: 'text-amber-500',
		dimBg: 'bg-amber-500/10',
		dimBorder: 'border-amber-500/30',
	},
	red: {
		border: 'border-red-500/30',
		bg: 'bg-red-500/5',
		icon: 'text-red-500',
		dimBg: 'bg-red-500/10',
		dimBorder: 'border-red-500/30',
	},
	purple: {
		border: 'border-purple-500/30',
		bg: 'bg-purple-500/10',
		icon: 'text-purple-500',
		dimBg: 'bg-purple-500/10',
		dimBorder: 'border-purple-500/30',
	},
	teal: {
		border: 'border-teal-500/30',
		bg: 'bg-teal-500/5',
		icon: 'text-teal-500',
		dimBg: 'bg-teal-500/10',
		dimBorder: 'border-teal-500/30',
	},
	gray: {
		border: 'border-beam-border/50',
		bg: 'bg-beam-bg-2',
		icon: 'text-beam-fg-3',
		dimBg: 'bg-beam-bg-3',
		dimBorder: 'border-beam-border/30',
	},
} as const

export type ToolTint = keyof typeof tintClasses

// Typography
export const typography = {
	heroTitle: 'text-[26px] font-extrabold tracking-tight text-white leading-tight',
	sectionLabel: 'text-[11px] font-bold tracking-[0.12em] uppercase text-muted',
	cardTitle: 'text-sm font-bold text-white mb-0.5',
	cardSub: 'text-xs text-muted',
	cardBody: 'text-xs text-muted leading-relaxed',
	tag: 'text-[10px] font-semibold font-mono',
	monoSmall: 'text-[10px] font-mono',
	monoTiny: 'text-[9px] font-mono',
	reasoningLabel: 'text-[9px] font-bold tracking-[0.08em] uppercase',
} as const

// Spacing & Layout
export const layout = {
	card: 'bg-surface border border-border rounded-[10px] p-4 mb-2.5 transition-colors hover:border-border2',
	cardHeader: 'flex items-start gap-3 mb-2.5',
	cardIcon: 'w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-medium flex-shrink-0',
	mock: 'bg-[#0a0a0c] border border-white/[0.06] rounded-lg p-3 mt-3 font-mono text-xs',
	chip: 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono mr-1',
	tag: 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono',
} as const

// Animations
export const animations = {
	pulse: 'animate-pulse',
	dotPulse: 'w-1.5 h-1.5 rounded-full animate-pulse',
} as const
