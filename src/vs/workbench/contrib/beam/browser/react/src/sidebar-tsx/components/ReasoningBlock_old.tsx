import React, { useState, useEffect } from 'react'
import { ToolHeaderWrapper, ToolChildrenWrapper } from './ToolHeader'
import { IconLoading, IconBrain } from './Icons'
import { tintClasses } from './designTokens'

// Reasoning block for completed reasoning (purple bordered card)
export const ReasoningBlock = ({
	isDoneReasoning,
	isStreaming,
	children,
}: {
	isDoneReasoning: boolean
	isStreaming: boolean
	children: React.ReactNode
}) => {
	const isDone = isDoneReasoning || !isStreaming
	const isWriting = !isDone
	const [isOpen, setIsOpen] = useState(isWriting)

	// Close when done
	useEffect(() => {
		if (!isWriting) setIsOpen(false)
	}, [isWriting])

	return (
		<ToolHeaderWrapper
			title={
				<span className="text-purple-500 uppercase text-[9px] tracking-wider font-medium">
					AGENT REASONING
				</span>
			}
			desc1={isWriting ? <IconLoading /> : ''}
			isOpen={isOpen}
			onClick={() => setIsOpen(v => !v)}
			tint="purple"
			icon={<IconBrain size={16} />}
		>
			<ToolChildrenWrapper>
				<div className="!select-text cursor-auto prose prose-invert prose-sm max-w-none">
					{children}
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Streaming reasoning indicator
export const ReasoningSoFar = () => (
	<ToolHeaderWrapper
		title={
			<span className="text-purple-500 uppercase text-[9px] tracking-wider font-medium">
				AGENT REASONING
			</span>
		}
		desc1={
			<span className="flex items-center gap-2">
				Thinking...
				<IconLoading />
			</span>
		}
		tint="purple"
		icon={<IconBrain size={16} />}
		isOpen={true}
	/>
)

// Stepper component for reasoning steps (matches HTML spec)
export const ReasoningStepper = ({
	steps,
}: {
	steps: Array<{
		label: string
		sub?: string
		status: 'done' | 'active' | 'pending'
	}>
}) => {
	return (
		<div className="border-l-[1.5px] border-border2 ml-3 pl-3.5 py-1">
			{steps.map((step, idx) => (
				<div key={idx} className="relative py-1">
					{/* Dot indicator */}
					<div
						className={`absolute -left-[21px] top-2 w-2 h-2 rounded-full border-[1.5px] transition-colors ${
							step.status === 'done'
								? 'bg-green-500 border-green-500'
								: step.status === 'active'
									? 'bg-blue-500 border-blue-500 animate-pulse'
									: 'bg-surface border-border2'
						}`}
					/>
					<div className="text-xs font-semibold text-beam-fg">{step.label}</div>
					{step.sub && <div className="text-[11px] text-muted mt-0.5">{step.sub}</div>}
				</div>
			))}
		</div>
	)
}

// Reasoning card with stepper (full component matching HTML spec)
export const ReasoningCard = ({
	title,
	duration,
	steps,
	children,
}: {
	title: string
	duration?: string
	steps?: Array<{ label: string; sub?: string; status: 'done' | 'active' | 'pending' }>
	children?: React.ReactNode
}) => {
	const [showVerbose, setShowVerbose] = useState(false)

	return (
		<div className="bg-surface border border-border rounded-[10px] p-4 mb-2.5 transition-colors hover:border-border2">
			{/* Header with tag */}
			<div className="flex items-center gap-1.5 mb-2">
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${tintClasses.blue.dimBg} ${tintClasses.blue.icon} border ${tintClasses.blue.dimBorder}`}>
					THINKING
				</span>
				<span className="text-xs text-muted">{title}</span>
				{duration && <span className="text-[9px] text-muted ml-auto">{duration}</span>}
			</div>

			{/* Stepper */}
			{steps && <ReasoningStepper steps={steps} />}

			{/* Verbose logs toggle */}
			{children && (
				<div className="mt-2">
					<button
						onClick={() => setShowVerbose(v => !v)}
						className="text-[9px] text-muted hover:text-beam-fg transition-colors flex items-center gap-1"
					>
						{showVerbose ? '▾' : '▸'} Show verbose logs
					</button>
					{showVerbose && (
						<div className="mt-2 text-[10px] text-muted font-mono bg-[#0a0a0c] border border-white/[0.06] rounded-lg p-3">
							{children}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
