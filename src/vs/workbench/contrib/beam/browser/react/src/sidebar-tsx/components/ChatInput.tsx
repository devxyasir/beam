import React, { useState, useRef, useEffect, useCallback, ButtonHTMLAttributes, useMemo } from 'react'
import { IconX, IconArrowUp, IconSquare, IconLoading } from './Icons.js'
import { tintClasses, colors } from './designTokens.js'

// Types
export type FeatureName = 'Chat' | 'Composer' | 'Edit'
export type ChatMode = 'agent' | 'chat' | 'ask'

// Autocomplete item type
export interface AutocompleteItem {
	id: string
	label: string
	detail?: string
	type: 'file' | 'folder' | 'symbol' | 'command' | 'context'
	icon?: React.ReactNode
}

// Chip type for selected files/context
export interface Chip {
	id: string
	label: string
	type: 'file' | 'folder' | 'context'
	uri?: string
}

// BeamChatArea container component
export interface BeamChatAreaProps {
	children?: React.ReactNode
	onSubmit: () => void
	onAbort: () => void
	onClose?: () => void
	onClickAnywhere?: () => void
	divRef?: React.RefObject<HTMLDivElement>
	isStreaming?: boolean
	isDisabled?: boolean
	className?: string
	showModelDropdown?: boolean
	showSelections?: boolean
	showProspectiveSelections?: boolean
	selections?: Chip[]
	setSelections?: React.Dispatch<React.SetStateAction<Chip[]>>
	featureName: FeatureName
	loadingIcon?: React.ReactNode
}

// Default button size
const DEFAULT_BUTTON_SIZE = 22

// Submit button
export const ButtonSubmit = ({ className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { disabled: boolean }) => (
	<button
		type='button'
		className={`rounded-full flex-shrink-0 flex-grow-0 flex items-center justify-center transition-colors
			${disabled ? 'bg-vscode-disabled-fg cursor-default opacity-50' : 'bg-white hover:bg-gray-100 cursor-pointer'}
			${className}
		`}
		{...props}
	>
		<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="stroke-[2] p-[2px] text-black" />
	</button>
)

// Stop button
export const ButtonStop = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
	<button
		className={`rounded-full flex-shrink-0 flex-grow-0 cursor-pointer flex items-center justify-center bg-white hover:bg-gray-100 ${className}`}
		type='button'
		{...props}
	>
		<IconSquare size={DEFAULT_BUTTON_SIZE} className="stroke-[3] p-[7px] text-black" />
	</button>
)

// Chip component for selected files (renamed to avoid conflict with ToolHeader.FileChip)
export const InputFileChip = ({ chip, onRemove }: { chip: Chip; onRemove?: (id: string) => void }) => {
	const tintClass = chip.type === 'folder' ? tintClasses.amber : tintClasses.blue

	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${tintClass.dimBg} ${tintClass.dimBorder} border ${tintClass.icon}`}>
			{chip.type === 'folder' ? '📁' : '📄'}
			<span className="max-w-[120px] truncate">{chip.label}</span>
			{onRemove && (
				<button
					onClick={() => onRemove(chip.id)}
					className="hover:opacity-70 ml-0.5"
					type="button"
				>
					<IconX size={10} />
				</button>
			)}
		</span>
	)
}

// Selected files section
export const SelectedFiles = ({
	selections,
	setSelections,
	showProspectiveSelections = false,
}: {
	selections: Chip[]
	setSelections: React.Dispatch<React.SetStateAction<Chip[]>>
	showProspectiveSelections?: boolean
}) => {
	const removeChip = useCallback((id: string) => {
		setSelections(prev => prev.filter(s => s.id !== id))
	}, [setSelections])

	if (selections.length === 0 && !showProspectiveSelections) return null

	return (
		<div className="flex flex-wrap gap-1.5 pb-2 mb-2 border-b border-beam-border-2/50">
			{selections.map(chip => (
				<InputFileChip key={chip.id} chip={chip} onRemove={removeChip} />
			))}
			{showProspectiveSelections && (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-beam-fg-3 bg-beam-bg-2 border border-dashed border-beam-border-2 animate-pulse">
					+ Adding context...
				</span>
			)}
		</div>
	)
}

// Model dropdown (simplified - integrates with existing VSCode services)
export const ModelDropdown = ({ className = '', featureName }: { className?: string; featureName: FeatureName }) => {
	const [isOpen, setIsOpen] = useState(false)
	const [selected, setSelected] = useState('claude-3.5-sonnet')
	const dropdownRef = useRef<HTMLDivElement>(null)

	const models = useMemo(() => [
		{ id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
		{ id: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', provider: 'Anthropic' },
		{ id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
		{ id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
		{ id: 'gemini-pro', label: 'Gemini Pro', provider: 'Google' },
	], [])

	// Close on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const currentModel = models.find(m => m.id === selected)

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-1 px-2 py-1 text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-2 rounded hover:border-beam-border-1 transition-colors"
			>
				<span className="max-w-[100px] truncate">{currentModel?.label || selected}</span>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d={isOpen ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
				</svg>
			</button>

			{isOpen && (
				<div className="absolute bottom-full mb-1 left-0 w-56 bg-beam-bg-1 border border-beam-border-2 rounded-md shadow-lg z-50 py-1">
					{models.map(model => (
						<button
							key={model.id}
							onClick={() => { setSelected(model.id); setIsOpen(false) }}
							className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-beam-bg-2 transition-colors ${selected === model.id ? 'bg-beam-bg-2/50' : ''}`}
						>
							<span className="text-beam-fg">{model.label}</span>
							<span className="text-beam-fg-4 text-[10px]">{model.provider}</span>
						</button>
					))}
				</div>
			)}
		</div>
	)
}

// Chat mode dropdown (Agent/Chat/Ask)
export const ChatModeDropdown = ({ className = '', onChange }: { className?: string; onChange?: (mode: ChatMode) => void }) => {
	const [mode, setMode] = useState<ChatMode>('agent')
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	const modes: { id: ChatMode; label: string; desc: string; icon: string }[] = [
		{ id: 'agent', label: 'Agent', desc: 'Can run tools and edit files', icon: '🤖' },
		{ id: 'chat', label: 'Chat', desc: 'Ask questions and get help', icon: '💬' },
		{ id: 'ask', label: 'Ask', desc: 'Simple Q&A mode', icon: '❓' },
	]

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const handleSelect = (newMode: ChatMode) => {
		setMode(newMode)
		setIsOpen(false)
		onChange?.(newMode)
	}

	const current = modes.find(m => m.id === mode)

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-1 px-2 py-1 text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-2 rounded hover:border-beam-border-1 transition-colors"
			>
				<span>{current?.icon}</span>
				<span>{current?.label}</span>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d={isOpen ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
				</svg>
			</button>

			{isOpen && (
				<div className="absolute bottom-full mb-1 left-0 w-48 bg-beam-bg-1 border border-beam-border-2 rounded-md shadow-lg z-50 py-1">
					{modes.map(m => (
						<button
							key={m.id}
							onClick={() => handleSelect(m.id)}
							className={`w-full px-3 py-2 text-left hover:bg-beam-bg-2 transition-colors ${mode === m.id ? 'bg-beam-bg-2/50' : ''}`}
						>
							<div className="flex items-center gap-2">
								<span>{m.icon}</span>
								<div>
									<div className="text-xs font-medium text-beam-fg">{m.label}</div>
									<div className="text-[10px] text-beam-fg-4">{m.desc}</div>
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	)
}

// Autocomplete popup for @ and #
export const AutocompletePopup = ({
	items,
	query,
	selectedIndex,
	onSelect,
	onClose,
	position,
}: {
	items: AutocompleteItem[]
	query: string
	selectedIndex: number
	onSelect: (item: AutocompleteItem) => void
	onClose: () => void
	position: { x: number; y: number }
}) => {
	const filtered = useMemo(() => {
		if (!query) return items.slice(0, 10)
		return items
			.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
			.slice(0, 10)
	}, [items, query])

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [onClose])

	if (filtered.length === 0) return null

	return (
		<div
			className="absolute z-50 w-64 bg-beam-bg-1 border border-beam-border-2 rounded-md shadow-lg py-1 max-h-64 overflow-auto"
			style={{ left: position.x, top: position.y }}
		>
			{filtered.map((item, idx) => (
				<button
					key={item.id}
					onClick={() => onSelect(item)}
					className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-beam-bg-2 transition-colors ${idx === selectedIndex ? 'bg-beam-bg-2' : ''}`}
				>
					<span className="text-sm">
						{item.type === 'file' && '📄'}
						{item.type === 'folder' && '📁'}
						{item.type === 'symbol' && '🔣'}
						{item.type === 'command' && '⚡'}
						{item.type === 'context' && '🔍'}
					</span>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-medium text-beam-fg truncate">{item.label}</div>
						{item.detail && <div className="text-[10px] text-beam-fg-4 truncate">{item.detail}</div>}
					</div>
				</button>
			))}
		</div>
	)
}

// Main ChatInput component with @/# autocomplete
export const ChatInput = ({
	value,
	onChange,
	onSubmit,
	placeholder = "Type a message... Use @ for files, # for symbols",
	autocompleteItems = [],
	textareaRef: externalTextareaRef,
	className = '',
}: {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
	placeholder?: string
	autocompleteItems?: AutocompleteItem[]
	textareaRef?: React.RefObject<HTMLTextAreaElement>
	className?: string
}) => {
	const innerTextareaRef = useRef<HTMLTextAreaElement>(null)
	const textareaRef = externalTextareaRef ?? innerTextareaRef
	const [showAutocomplete, setShowAutocomplete] = useState(false)
	const [autocompleteType, setAutocompleteType] = useState<'@' | '#' | null>(null)
	const [autocompleteQuery, setAutocompleteQuery] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })

	// Handle input changes
	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value
		onChange(newValue)

		// Check for @ or # trigger
		const cursorPos = e.target.selectionStart || 0
		const beforeCursor = newValue.slice(0, cursorPos)
		const lastAt = beforeCursor.lastIndexOf('@')
		const lastHash = beforeCursor.lastIndexOf('#')

		// Find which trigger is closest and not completed
		const lastTrigger = Math.max(lastAt, lastHash)
		if (lastTrigger >= 0) {
			const triggerChar = beforeCursor[lastTrigger]
			const afterTrigger = beforeCursor.slice(lastTrigger + 1)
			// Check if there's a space after trigger (meaning it's completed)
			if (!afterTrigger.includes(' ') && afterTrigger.length >= 0) {
				setShowAutocomplete(true)
				setAutocompleteType(triggerChar as '@' | '#')
				setAutocompleteQuery(afterTrigger)
				setSelectedIndex(0)

				// Calculate position for popup
				if (textareaRef.current) {
					const textarea = textareaRef.current
					const rect = textarea.getBoundingClientRect()
					setCursorPosition({ x: 16, y: -180 })
				}
			} else {
				setShowAutocomplete(false)
			}
		} else {
			setShowAutocomplete(false)
		}
	}

	// Handle keyboard navigation
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (!showAutocomplete) {
			// Submit on Enter (without shift)
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				onSubmit()
			}
			return
		}

		const items = autocompleteItems.filter(item =>
			item.label.toLowerCase().includes(autocompleteQuery.toLowerCase())
		).slice(0, 10)

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setSelectedIndex(prev => (prev + 1) % items.length)
				break
			case 'ArrowUp':
				e.preventDefault()
				setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
				break
			case 'Enter':
			case 'Tab':
				e.preventDefault()
				if (items[selectedIndex]) {
					handleAutocompleteSelect(items[selectedIndex])
				}
				break
			case 'Escape':
				setShowAutocomplete(false)
				break
		}
	}

	// Handle autocomplete selection
	const handleAutocompleteSelect = (item: AutocompleteItem) => {
		if (!textareaRef.current) return

		const cursorPos = textareaRef.current.selectionStart || 0
		const beforeCursor = value.slice(0, cursorPos)
		const afterCursor = value.slice(cursorPos)

		// Find the trigger position
		const lastTrigger = Math.max(beforeCursor.lastIndexOf('@'), beforeCursor.lastIndexOf('#'))
		const newValue = value.slice(0, lastTrigger) + item.label + ' ' + afterCursor

		onChange(newValue)
		setShowAutocomplete(false)

		// Restore focus and set cursor position
		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus()
				const newCursorPos = lastTrigger + item.label.length + 1
				textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
			}
		}, 0)
	}

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
		}
	}, [value])

	return (
		<div className={`relative ${className}`}>
			<textarea
				ref={textareaRef}
				value={value}
				onChange={handleInput}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				className="w-full bg-transparent text-sm text-beam-fg placeholder:text-beam-fg-3 resize-none outline-none min-h-[40px] max-h-[200px] py-1"
				rows={1}
			/>
			{showAutocomplete && (
				<AutocompletePopup
					items={autocompleteItems}
					query={autocompleteQuery}
					selectedIndex={selectedIndex}
					onSelect={handleAutocompleteSelect}
					onClose={() => setShowAutocomplete(false)}
					position={cursorPosition}
				/>
			)}
		</div>
	)
}

// Main BeamChatArea component
export const BeamChatArea: React.FC<BeamChatAreaProps> = ({
	children,
	onSubmit,
	onAbort,
	onClose,
	onClickAnywhere,
	divRef,
	isStreaming = false,
	isDisabled = false,
	className = '',
	showModelDropdown = true,
	showSelections = false,
	showProspectiveSelections = false,
	selections,
	setSelections,
	featureName,
	loadingIcon,
}) => {
	return (
		<div
			ref={divRef}
			className={`
				gap-x-1
                flex flex-col p-2 relative input text-left shrink-0
                rounded-md
                bg-beam-bg-1
				transition-all duration-200
				border border-beam-border-3 focus-within:border-beam-border-1 hover:border-beam-border-1
				max-h-[80vh] overflow-y-auto
                ${className}
            `}
			onClick={(e) => {
				onClickAnywhere?.()
			}}
		>
			{/* Selections section */}
			{showSelections && selections && setSelections && (
				<SelectedFiles
					selections={selections}
					setSelections={setSelections}
					showProspectiveSelections={showProspectiveSelections}
				/>
			)}

			{/* Input section */}
			<div className="relative w-full">
				{children}

				{/* Close button (X) if onClose is provided */}
				{onClose && (
					<div className='absolute -top-1 -right-1 cursor-pointer z-1'>
						<IconX
							size={12}
							className="stroke-[2] opacity-80 text-beam-fg-3 hover:brightness-95"
							onClick={onClose}
						/>
					</div>
				)}
			</div>

			{/* Bottom row */}
			<div className='flex flex-row justify-between items-end gap-1'>
				{showModelDropdown && (
					<div className='flex flex-col gap-y-1'>
						<div className='flex items-center flex-wrap gap-x-2 gap-y-1 text-nowrap '>
							{featureName === 'Chat' && <ChatModeDropdown className='text-xs text-beam-fg-3' />}
							<ModelDropdown featureName={featureName} className='text-xs text-beam-fg-3' />
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">
					{isStreaming && loadingIcon}

					{isStreaming ? (
						<ButtonStop onClick={onAbort} />
					) : (
						<ButtonSubmit onClick={onSubmit} disabled={isDisabled} />
					)}
				</div>
			</div>
		</div>
	)
}
