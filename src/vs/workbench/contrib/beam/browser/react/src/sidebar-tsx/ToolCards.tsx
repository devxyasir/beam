/*--------------------------------------------------------------------------------------
 *  Tool card UI primitives: ToolHeaderWrapper, ToolPathChip, ToolActivityRow,
 *  SearchToolCard, TerminalToolCard, EditTool, and related helpers.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { URI } from "../../../../../../../base/common/uri.js";
import { useAccessor } from '../util/services.js';
import { useEditToolStreamState } from '../markdown/ApplyBlockHoverButtons.js';
import { ChevronRight, AlertTriangle, Ban, CircleEllipsis, File, Folder, FileIcon, Search, Terminal } from 'lucide-react';
import { BeamDiffEditor } from '../util/inputs.js';
import { ChatMarkdownRender, getApplyBoxId } from '../markdown/ChatMarkdownRender.js';
import { CopyButton, EditToolAcceptRejectButtonsHTML } from '../markdown/ApplyBlockHoverButtons.js';
import { LintErrorItem } from "../../../../common/toolsServiceTypes.js";
import {
	getRelative, getBasename, getFolderName, voidOpenFileFn, IconLoading,
	SmallProseWrapper, extensionLabel, getEditStats,
} from './ChatShared.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToolHeaderParams = {
	icon?: React.ReactNode;
	title: React.ReactNode;
	desc1: React.ReactNode;
	desc1OnClick?: () => void;
	desc2?: React.ReactNode;
	isError?: boolean;
	info?: string;
	desc1Info?: string;
	isRejected?: boolean;
	numResults?: number;
	hasNextPage?: boolean;
	children?: React.ReactNode;
	bottomChildren?: React.ReactNode;
	onClick?: () => void;
	desc2OnClick?: () => void;
	isOpen?: boolean;
	className?: string;
}

// ─── ToolHeaderWrapper ───────────────────────────────────────────────────────

export const ToolHeaderWrapper = ({
	icon, title, desc1, desc1OnClick, desc1Info, desc2, numResults, hasNextPage,
	children, info, bottomChildren, isError, onClick, desc2OnClick, isOpen, isRejected, className,
}: ToolHeaderParams) => {

	const [isOpen_, setIsOpen] = useState(false);
	const isExpanded = isOpen !== undefined ? isOpen : isOpen_

	const isDropdown = children !== undefined
	const isClickable = !!(isDropdown || onClick)

	const isDesc1Clickable = !!desc1OnClick

	const desc1HTML = <span
		className={`text-beam-fg-4 text-xs italic truncate ml-2
			${isDesc1Clickable ? 'cursor-pointer hover:brightness-125 transition-all duration-150' : ''}
		`}
		onClick={desc1OnClick}
		{...desc1Info ? {
			'data-tooltip-id': 'beam-tooltip',
			'data-tooltip-content': desc1Info,
			'data-tooltip-place': 'top',
			'data-tooltip-delay-show': 1000,
		} : {}}
	>{desc1}</span>

	return (<div className='@@beam-tool-enter'>
		<div className={`w-full border border-beam-border-3 rounded-md px-2 py-1 bg-beam-bg-3 overflow-hidden @@beam-tool-card ${className}`}>
			{/* header */}
			<div className={`select-none flex items-center min-h-[24px]`}>
				<div className={`flex items-center w-full gap-x-2 overflow-hidden justify-between ${isRejected ? 'line-through' : ''}`}>
					{/* left */}
					<div className='ml-1 flex items-center overflow-hidden'>
						<div className={`
							flex items-center min-w-0 overflow-hidden grow
							${isClickable ? 'cursor-pointer hover:brightness-125 transition-all duration-150' : ''}
						`}
							onClick={() => {
								if (isDropdown) { setIsOpen(v => !v); }
								if (onClick) { onClick(); }
							}}
						>
							{isDropdown && (<ChevronRight
								className={`
								text-beam-fg-3 mr-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)]
								${isExpanded ? 'rotate-90' : ''}
							`}
							/>)}
							<span className="text-beam-fg-3 flex-shrink-0">{title}</span>
							{!isDesc1Clickable && desc1HTML}
						</div>
						{isDesc1Clickable && desc1HTML}
					</div>

					{/* right */}
					<div className="flex items-center gap-x-2 flex-shrink-0">
						{info && <CircleEllipsis className='ml-2 text-beam-fg-4 opacity-60 flex-shrink-0' size={14}
							data-tooltip-id='beam-tooltip' data-tooltip-content={info} data-tooltip-place='top-end'
						/>}
						{isError && <AlertTriangle className='text-beam-warning opacity-90 flex-shrink-0' size={14}
							data-tooltip-id='beam-tooltip' data-tooltip-content={'Error running tool'} data-tooltip-place='top'
						/>}
						{isRejected && <Ban className='text-beam-fg-4 opacity-90 flex-shrink-0' size={14}
							data-tooltip-id='beam-tooltip' data-tooltip-content={'Canceled'} data-tooltip-place='top'
						/>}
						{desc2 && <span className="text-beam-fg-4 text-xs" onClick={desc2OnClick}>{desc2}</span>}
						{numResults !== undefined && (
							<span className="text-beam-fg-4 text-xs ml-auto mr-1">
								{`${numResults}${hasNextPage ? '+' : ''} result${numResults !== 1 ? 's' : ''}`}
							</span>
						)}
					</div>
				</div>
			</div>
			{/* children */}
			{<div
				className={`overflow-hidden transition-all duration-200 ease-in-out @@beam-tool-expand ${isExpanded ? 'opacity-100 py-1 scale-y-100' : 'max-h-0 opacity-0 scale-y-95'}
					text-beam-fg-4 rounded-sm overflow-x-auto
				  `}
			>
				{children}
			</div>}
		</div>
		{bottomChildren}
	</div>);
};

// ─── ToolPathChip ────────────────────────────────────────────────────────────

export const ToolPathChip = ({ uri, isFolder, label, accessor, range }: { uri: URI, isFolder?: boolean, label?: string, accessor: ReturnType<typeof useAccessor>, range?: [number, number] }) => {
	const Icon = isFolder ? Folder : File
	const displayText = label || getRelative(uri, accessor) || uri.fsPath
	return <button
		type='button'
		className='@@beam-tool-path-chip inline-flex min-w-0 items-center gap-1 align-baseline'
		onClick={(e) => {
			e.stopPropagation()
			voidOpenFileFn(uri, accessor, range)
		}}
		data-tooltip-id='beam-tooltip'
		data-tooltip-content={uri.fsPath}
		data-tooltip-place='top'
	>
		<Icon size={13} className={isFolder ? '@@beam-tool-folder-icon flex-shrink-0' : '@@beam-tool-file-icon flex-shrink-0'} />
		<span className='truncate'>{displayText}</span>
	</button>
}

// ─── ToolActivityRow ─────────────────────────────────────────────────────────

export const ToolActivityRow = ({
	verb, uri, isFolder, accessor, range, detail, children, isError, isRejected,
}: {
	verb: React.ReactNode; uri: URI; isFolder?: boolean; accessor: ReturnType<typeof useAccessor>;
	range?: [number, number]; detail?: React.ReactNode; children?: React.ReactNode; isError?: boolean; isRejected?: boolean;
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const hasChildren = children !== undefined && children !== null

	return <div className={`@@beam-tool-enter @@beam-activity-row ${isRejected ? 'opacity-60 line-through' : ''}`}>
		<div
			className={`flex min-w-0 items-center gap-1.5 text-xs leading-6 ${hasChildren ? 'cursor-pointer' : ''}`}
			onClick={() => {
				if (hasChildren) setIsOpen(v => !v)
			}}
		>
			{hasChildren ? <ChevronRight size={14} className={`text-beam-fg-4 flex-shrink-0 transition-transform duration-100 ${isOpen ? 'rotate-90' : ''}`} /> : <span className='w-[14px] flex-shrink-0' />}
			<span className='text-beam-fg-3 flex-shrink-0'>{verb}</span>
			<ToolPathChip uri={uri} isFolder={isFolder} accessor={accessor} range={range} />
			{detail && <span className='text-beam-fg-4 truncate'>{detail}</span>}
			{isError && <AlertTriangle size={13} className='text-beam-warning flex-shrink-0' />}
		</div>
		{hasChildren && <div className={`ml-5 overflow-hidden transition-all duration-150 ${isOpen ? 'max-h-[420px] opacity-100 py-1' : 'max-h-0 opacity-0'}`}>
			{children}
		</div>}
	</div>
}

export const ToolActivityListItem = ({ uri, isFolder, accessor, label }: { uri: URI, isFolder?: boolean, accessor: ReturnType<typeof useAccessor>, label?: string }) => {
	return <div className='flex min-w-0 items-center py-0.5 text-xs'>
		<span className='w-[14px] flex-shrink-0' />
		<ToolPathChip uri={uri} isFolder={isFolder} accessor={accessor} label={label} />
	</div>
}

// ─── SearchResultPath ────────────────────────────────────────────────────────

export const SearchResultPath = ({ uri, accessor, line, relevance }: { uri: URI, accessor: ReturnType<typeof useAccessor>, line?: number, relevance?: number }) => {
	const display = (getRelative(uri, accessor) || uri.fsPath).replace(/\\/g, '/')
	return <button
		type='button'
		className='@@beam-search-result-row group flex min-w-0 items-center gap-2 text-left'
		onClick={(e) => {
			e.stopPropagation()
			voidOpenFileFn(uri, accessor, line ? [line, line] : undefined)
		}}
		data-tooltip-id='beam-tooltip'
		data-tooltip-content={uri.fsPath}
		data-tooltip-place='top'
	>
		<span className='@@beam-search-ext'>{extensionLabel(uri)}</span>
		<span className='truncate font-mono text-[10px] text-[color:var(--beam-search-path)] group-hover:brightness-125'>
			{display}{line ? `:${line}` : ''}
		</span>
		{relevance !== undefined && <span className='@@beam-search-relevance'>{relevance}%</span>}
	</button>
}

// ─── SearchToolCard ──────────────────────────────────────────────────────────

export const SearchToolCard = ({
	query, scope, results, lines, isError, isRejected, hasNextPage, isSearching, children,
}: {
	query: string; scope?: React.ReactNode; results?: URI[]; lines?: { uri: URI, line: number }[];
	isError?: boolean; isRejected?: boolean; hasNextPage?: boolean; isSearching?: boolean; children?: React.ReactNode;
}) => {
	const accessor = useAccessor()
	const [isOpen, setIsOpen] = useState(true)
	const resultLines = lines ?? results?.map(uri => ({ uri, line: undefined as number | undefined })) ?? []

	return <div className={`@@beam-search-card @@beam-tool-enter ${isRejected ? 'opacity-60 line-through' : ''}`}>
		<button
			type='button'
			className='flex w-full min-w-0 items-center gap-1.5 px-1 py-1 text-left'
			onClick={() => setIsOpen(v => !v)}
		>
			<Search size={13} className='flex-shrink-0 text-[color:var(--beam-tool-search)]' />
			<span className='truncate text-xs text-[color:var(--beam-agent-text)]'>{isSearching ? 'Searching files' : 'Searched'}</span>
			<span className='truncate font-mono text-[10px] text-beam-fg-4'>{query}</span>
			{scope && <span className='truncate text-xs text-beam-fg-4'>in {scope}</span>}
			{resultLines.length > 0 && <span className='ml-auto flex-shrink-0 font-mono text-[9px] text-beam-fg-4'>{resultLines.length}{hasNextPage ? '+' : ''} results</span>}
			<ChevronRight size={13} className={`${resultLines.length > 0 ? '' : 'ml-auto'} flex-shrink-0 text-beam-fg-4 transition-transform duration-100 ${isOpen ? 'rotate-90' : ''}`} />
			{isError && <AlertTriangle size={13} className='flex-shrink-0 text-beam-warning' />}
		</button>
		{isOpen && <div className='ml-5 space-y-0.5 overflow-hidden py-0.5'>
			{isSearching && <div className='@@beam-search-running'>
				<span className='@@beam-dot-pulse' />
				<span>Searching files...</span>
			</div>}
			{children ?? resultLines.slice(0, 8).map((result, index) => (
				<SearchResultPath key={`${result.uri.fsPath}-${result.line ?? index}`} uri={result.uri} accessor={accessor} line={result.line} relevance={Math.max(48, 97 - (index * 11))} />
			))}
			{hasNextPage && <div className='text-xs text-beam-fg-4'>More results available</div>}
			{!children && !isSearching && resultLines.length === 0 && <div className='text-xs text-beam-fg-4'>No results</div>}
		</div>}
	</div>
}

// ─── TerminalToolCard ────────────────────────────────────────────────────────

export const TerminalToolCard = ({
	command, commandLabel, children, isOpenDefault, isError, isRejected, terminalName, footer,
}: {
	command: string; commandLabel: string; children: React.ReactNode; isOpenDefault?: boolean;
	isError?: boolean; isRejected?: boolean; terminalName?: string; footer?: React.ReactNode;
}) => {
	const [isOpen, setIsOpen] = useState(isOpenDefault ?? true)
	useEffect(() => {
		if (isOpenDefault) setIsOpen(true)
	}, [isOpenDefault])

	return <div className={`@@beam-terminal-card @@beam-tool-enter ${isRejected ? 'opacity-60 line-through' : ''}`}>
		<button
			type='button'
			className='flex w-full items-center justify-between gap-3 border-b border-beam-border-3 px-3 py-2 text-left'
			onClick={() => setIsOpen(v => !v)}
		>
			<div className='flex min-w-0 items-center gap-2'>
				<ChevronRight size={14} className={`flex-shrink-0 text-beam-fg-4 transition-transform duration-100 ${isOpen ? 'rotate-90' : ''}`} />
				<Terminal size={14} className='flex-shrink-0 text-[color:var(--beam-tool-terminal)]' />
				<span className='truncate text-xs text-beam-fg-3'>Command {commandLabel}</span>
				{terminalName && <span className='truncate text-xs text-beam-fg-4'>{terminalName}</span>}
			</div>
			{isError && <AlertTriangle size={14} className='flex-shrink-0 text-beam-warning' />}
			{footer}
		</button>
		{isOpen && <div className='overflow-hidden'>
			<div className='@@beam-terminal-command px-3 py-2 font-mono text-xs leading-5'>
				<span className={isError ? 'text-red-400' : 'text-emerald-400'}>⊙</span>
				<span className='ml-2 whitespace-pre-wrap text-[color:var(--beam-terminal-command-fg)]'>{command}</span>
			</div>
			<div className='@@beam-terminal-output-wrap'>
				<div className='@@beam-terminal-bar'>
					<span className='@@beam-terminal-dot' style={{ background: '#ff5c57' }} />
					<span className='@@beam-terminal-dot' style={{ background: '#ffbd2e' }} />
					<span className='@@beam-terminal-dot' style={{ background: '#28c940' }} />
					<span className='ml-1 truncate text-[9px] text-white/30'>Command {commandLabel} - output</span>
				</div>
				{children}
			</div>
		</div>}
	</div>
}

// ─── SimplifiedToolHeader ────────────────────────────────────────────────────

export const SimplifiedToolHeader = ({
	title, children,
}: {
	title: string; children?: React.ReactNode;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDropdown = children !== undefined;
	return (
		<div>
			<div className="w-full">
				<div
					className={`select-none flex items-center min-h-[24px] ${isDropdown ? 'cursor-pointer' : ''}`}
					onClick={() => { if (isDropdown) { setIsOpen(v => !v); } }}
				>
					{isDropdown && (
						<ChevronRight
							className={`text-beam-fg-3 mr-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'rotate-90' : ''}`}
						/>
					)}
					<div className="flex items-center w-full overflow-hidden">
						<span className="text-beam-fg-3">{title}</span>
					</div>
				</div>
				{<div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-beam-fg-4`}>
					{children}
				</div>}
			</div>
		</div>
	);
};

// ─── EditTool ────────────────────────────────────────────────────────────────

export const EditToolChildren = ({ uri, code, type }: { uri: URI | undefined, code: string, type: 'diff' | 'rewrite' }) => {
	const content = type === 'diff' ?
		<BeamDiffEditor uri={uri} searchReplaceBlocks={code} />
		: <div className='@@beam-inline-diff rounded-none border-0'>
			<div className='@@beam-inline-diff-added'>
				{code.replace(/\r\n/g, '\n').split('\n').map((line, index) => (
					<div key={index} className='grid min-h-[18px] font-mono text-[11px] leading-[18px] text-beam-fg-1' style={{ gridTemplateColumns: '2rem minmax(0, 1fr)' }}>
						<span className='select-none text-center opacity-80'>+</span>
						<code className='block whitespace-pre-wrap break-words pr-3'>{line || ' '}</code>
					</div>
				))}
			</div>
		</div>

	return <div className='!select-text cursor-auto'>
		<SmallProseWrapper>
			{content}
		</SmallProseWrapper>
	</div>
}

const EditToolHeaderButtons = ({ applyBoxId, uri, codeStr, toolName, threadId }: { threadId: string, applyBoxId: string, uri: URI, codeStr: string, toolName: 'edit_file' | 'rewrite_file' }) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri })
	return <div className='flex items-center gap-1'>
		{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName='Copy' />}
		<EditToolAcceptRejectButtonsHTML type={toolName} codeStr={codeStr} applyBoxId={applyBoxId} uri={uri} threadId={threadId} />
	</div>
}

export const EditTool = ({ toolMessage, threadId, messageIdx, content }: { toolMessage: any, threadId: string, messageIdx: number, content: string }) => {
	const accessor = useAccessor()
	const isRejected = toolMessage.type === 'rejected'
	const { params, name } = toolMessage
	const editToolType = toolMessage.name === 'edit_file' ? 'diff' : 'rewrite'
	const stats = getEditStats(name, content)
	const basename = getBasename(params.uri.fsPath)
	const applyBoxId = getApplyBoxId({ threadId, messageIdx, tokenIdx: 'N/A' })
	const canAcceptReject = toolMessage.type === 'success' || toolMessage.type === 'rejected' || toolMessage.type === 'tool_error'
	const lintErrors = (toolMessage.type === 'success' || toolMessage.type === 'rejected') ? toolMessage.result?.lintErrors : null
	const error = toolMessage.type === 'tool_error' ? toolMessage.result : null

	return <div className={`@@beam-file-change-card @@beam-tool-enter ${isRejected ? 'opacity-60' : ''}`}>
		<div className='flex items-center justify-between gap-2 border-b border-beam-border-3 px-3 py-2'>
			<button
				type='button'
				className='flex min-w-0 items-center gap-2 text-left'
				onClick={() => voidOpenFileFn(params.uri, accessor)}
				data-tooltip-id='beam-tooltip'
				data-tooltip-content={params.uri.fsPath}
				data-tooltip-place='top'
			>
				<FileIcon size={14} className='@@beam-tool-file-icon flex-shrink-0' />
				<span className='truncate text-xs font-medium text-beam-fg-2'>{basename}</span>
			</button>
			<div className='flex flex-shrink-0 items-center gap-2'>
				<span className='font-mono text-xs'>
					{stats.added > 0 && <span className='text-emerald-400'>+{stats.added}</span>}
					{stats.added > 0 && stats.removed > 0 && <span className='text-beam-fg-4'> </span>}
					{stats.removed > 0 && <span className='text-red-400'>-{stats.removed}</span>}
				</span>
				{canAcceptReject && <EditToolHeaderButtons
					applyBoxId={applyBoxId}
					uri={params.uri}
					codeStr={content}
					toolName={name}
					threadId={threadId}
				/>}
			</div>
		</div>
		<div className='max-h-[360px] overflow-auto'>
			<EditToolChildren uri={params.uri} code={content} type={editToolType} />
		</div>
		{lintErrors && lintErrors.length > 0 && <div className='flex items-center justify-between gap-2 border-t border-beam-border-3 px-3 py-2 text-xs'>
			<div className='flex min-w-0 items-center gap-1.5 text-beam-warning'>
				<AlertTriangle size={13} className='flex-shrink-0' />
				<span className='truncate'>{lintErrors.length} lint error{lintErrors.length === 1 ? '' : 's'}</span>
			</div>
			<span className='text-beam-fg-4'>Auto-fix</span>
		</div>}
		{error && <div className='@@beam-edit-error-banner'>
			<AlertTriangle size={14} className='flex-shrink-0' />
			<div className='min-w-0 flex-1'>
				<div className='font-semibold'>Error while editing</div>
				<div className='truncate text-[color:var(--beam-agent-text)]'>M {basename} - {error}</div>
			</div>
			<button type='button' className='@@beam-mini-action' onClick={() => voidOpenFileFn(params.uri, accessor)}>View file</button>
		</div>}
	</div>
}

// ─── LintErrorChildren ──────────────────────────────────────────────────────

export const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[] }) => {
	return <div className="text-xs text-beam-fg-4 opacity-80 border-l-2 border-beam-warning px-2 py-0.5 flex flex-col gap-0.5 overflow-x-auto whitespace-nowrap">
		{lintErrors.map((error, i) => (
			<div key={i}>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
		))}
	</div>
}
