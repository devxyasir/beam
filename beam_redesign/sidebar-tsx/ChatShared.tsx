/*--------------------------------------------------------------------------------------
 *  Shared utilities and small UI primitives extracted from SidebarChat.tsx
 *  Used by ToolCards, MessageBubbles, ToolRenderers, and the main orchestrator.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { URI } from "../../../../../../../base/common/uri.js";
import { ScrollType } from "../../../../../../../editor/common/editorCommon.js";
import { useAccessor } from '../util/services.js';

// ─── Path helpers ────────────────────────────────────────────────────────────

export const getRelative = (uri: URI, accessor: ReturnType<typeof useAccessor>) => {
	const workspaceContextService = accessor.get('IWorkspaceContextService')
	let path: string
	const isInside = workspaceContextService.isInsideWorkspace(uri)
	if (isInside) {
		const f = workspaceContextService.getWorkspace().folders.find(f => uri.fsPath?.startsWith(f.uri.fsPath))
		if (f) { path = uri.fsPath.replace(f.uri.fsPath, '').replace(/^[\\/]+/, '') }
		else { path = uri.fsPath }
	}
	else {
		path = uri.fsPath
	}
	return path || undefined
}

export const getFolderName = (pathStr: string) => {
	pathStr = pathStr.replace(/[/\\]+/g, '/')
	const parts = pathStr.split('/')
	const nonEmptyParts = parts.filter(part => part.length > 0)
	if (nonEmptyParts.length === 0) return '/'
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + '/'
	const lastTwo = nonEmptyParts.slice(-2)
	return lastTwo.join('/') + '/'
}

export const getBasename = (pathStr: string, parts: number = 1) => {
	pathStr = pathStr.replace(/[/\\]+/g, '/')
	const allParts = pathStr.split('/')
	if (allParts.length === 0) return pathStr
	return allParts.slice(-parts).join('/')
}

// ─── File opener ─────────────────────────────────────────────────────────────

export const voidOpenFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number]
) => {
	const commandService = accessor.get('ICommandService')
	const editorService = accessor.get('ICodeEditorService')

	let editorSelection = undefined;
	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER,
		};
	}

	commandService.executeCommand('vscode.open', uri).then(() => {
		setTimeout(() => {
			if (!editorSelection) return;
			const editor = editorService.getActiveCodeEditor()
			if (!editor) return;
			editor.setSelection(editorSelection)
			editor.revealRange(editorSelection, ScrollType.Immediate)
		}, 50)
	})
};

// ─── Small UI primitives ─────────────────────────────────────────────────────

export const IconX = ({ size, className = '', ...props }: { size: number, className?: string } & React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			className={className}
			{...props}
		>
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				d='M6 18 18 6M6 6l12 12'
			/>
		</svg>
	);
};

export const IconArrowUp = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fill="black"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
			></path>
		</svg>
	);
};


export const IconSquare = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			className={className}
			stroke="black"
			fill="black"
			strokeWidth="0"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
		</svg>
	);
};

export const IconWarning = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			className={className}
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 16 16"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
			/>
		</svg>
	);
};


export const IconLoading = ({ className = '' }: { className?: string }) => {
	const [loadingText, setLoadingText] = useState('.');
	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval>;
		const toggleLoadingText = () => {
			if (loadingText === '...') {
				setLoadingText('.');
			} else {
				setLoadingText(loadingText + '.');
			}
		};
		intervalId = setInterval(toggleLoadingText, 300);
		return () => clearInterval(intervalId);
	}, [loadingText, setLoadingText]);
	return <div className={`${className}`}>{loadingText}</div>;
}

// ─── Prose wrappers ──────────────────────────────────────────────────────────

export const SmallProseWrapper = ({ children }: { children: React.ReactNode }) => {
	return <div className='
text-beam-fg-4
prose
prose-sm
break-words
max-w-none
leading-snug
text-[13px]

[&>:first-child]:!mt-0
[&>:last-child]:!mb-0

prose-h1:text-[14px]
prose-h1:my-4

prose-h2:text-[13px]
prose-h2:my-4

prose-h3:text-[13px]
prose-h3:my-3

prose-h4:text-[13px]
prose-h4:my-2

prose-p:my-2
prose-p:leading-snug
prose-hr:my-2

prose-ul:my-2
prose-ul:pl-4
prose-ul:list-outside
prose-ul:list-disc
prose-ul:leading-snug


prose-ol:my-2
prose-ol:pl-4
prose-ol:list-outside
prose-ol:list-decimal
prose-ol:leading-snug

marker:text-inherit

prose-blockquote:pl-2
prose-blockquote:my-2

prose-code:text-beam-fg-3
prose-code:text-[12px]
prose-code:before:content-none
prose-code:after:content-none

prose-pre:text-[12px]
prose-pre:p-2
prose-pre:my-2

prose-table:text-[13px]
'>
		{children}
	</div>
}

export const ProseWrapper = ({ children }: { children: React.ReactNode }) => {
	return <div className='
text-beam-fg-2
prose
prose-sm
break-words
prose-p:block
prose-hr:my-4
prose-pre:my-2
marker:text-inherit
prose-ol:list-outside
prose-ol:list-decimal
prose-ul:list-outside
prose-ul:list-disc
prose-li:my-0
prose-code:before:content-none
prose-code:after:content-none
prose-headings:prose-sm
prose-headings:font-bold

prose-p:leading-normal
prose-ol:leading-normal
prose-ul:leading-normal

max-w-none
'
	>
		{children}
	</div>
}

// ─── Scroll helpers ──────────────────────────────────────────────────────────

export const scrollToBottom = (divRef: { current: HTMLElement | null }) => {
	if (divRef.current) {
		divRef.current.scrollTop = divRef.current.scrollHeight;
	}
};

export const ScrollToBottomContainer = ({ children, className, style, scrollContainerRef }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, scrollContainerRef: React.MutableRefObject<HTMLDivElement | null> }) => {
	const [isAtBottom, setIsAtBottom] = useState(true);
	const divRef = scrollContainerRef

	const onScroll = () => {
		const div = divRef.current;
		if (!div) return;
		const isBottom = Math.abs(
			div.scrollHeight - div.clientHeight - div.scrollTop
		) < 4;
		setIsAtBottom(isBottom);
	};

	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom(divRef);
		}
	}, [children, isAtBottom]);

	useEffect(() => {
		scrollToBottom(divRef);
	}, []);

	return (
		<div
			ref={divRef}
			onScroll={onScroll}
			className={className}
			style={style}
		>
			{children}
		</div>
	);
};

// ─── Tool accent class helper ────────────────────────────────────────────────

export const toolAccentClass = (toolName: string | undefined): string => {
	if (!toolName) return ''
	if (['read_file', 'ls_dir', 'get_dir_tree', 'read_lint_errors'].includes(toolName)) return '@@beam-tool-read'
	if (['edit_file', 'rewrite_file', 'create_file_or_folder', 'delete_file_or_folder'].includes(toolName)) return '@@beam-tool-write'
	if (['run_command', 'run_persistent_command', 'open_persistent_terminal', 'kill_persistent_terminal'].includes(toolName)) return '@@beam-tool-terminal'
	if (['search_for_files', 'search_pathnames_only', 'search_in_file'].includes(toolName)) return '@@beam-tool-search'
	return ''
}

// ─── Shared sub-components ───────────────────────────────────────────────────

export const ToolChildrenWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
	return <div className={`${className ? className : ''} cursor-default select-none`}>
		<div className='px-2 min-w-full overflow-hidden'>
			{children}
		</div>
	</div>
}

export const CodeChildren = ({ children, className }: { children: React.ReactNode, className?: string }) => {
	return <div className={`${className ?? ''} p-1 rounded-sm overflow-auto text-sm`}>
		<div className='!select-text cursor-auto'>
			{children}
		</div>
	</div>
}

export const ListableToolItem = ({ name, onClick, isSmall, className, showDot }: { name: React.ReactNode, onClick?: () => void, isSmall?: boolean, className?: string, showDot?: boolean }) => {
	return <div
		className={`
			${onClick ? 'hover:brightness-125 hover:cursor-pointer transition-all duration-200 ' : ''}
			flex items-center flex-nowrap whitespace-nowrap
			${className ? className : ''}
			`}
		onClick={onClick}
	>
		{showDot === false ? null : <div className="flex-shrink-0"><svg className="w-1 h-1 opacity-60 mr-1.5 fill-current" viewBox="0 0 100 40"><rect x="0" y="15" width="100" height="10" /></svg></div>}
		<div className={`${isSmall ? 'italic text-beam-fg-4 flex items-center' : ''}`}>{name}</div>
	</div>
}

export const BottomChildren = ({ children, title }: { children: React.ReactNode, title: string }) => {
	const [isOpen, setIsOpen] = useState(false);
	if (!children) return null;
	return (
		<div className="w-full px-2 mt-0.5">
			<div
				className={`flex items-center cursor-pointer select-none transition-colors duration-150 pl-0 py-0.5 rounded group`}
				onClick={() => setIsOpen(o => !o)}
				style={{ background: 'none' }}
			>
				<svg className={`mr-1 h-3 w-3 flex-shrink-0 transition-transform duration-100 text-beam-fg-4 group-hover:text-beam-fg-3 ${isOpen ? 'rotate-90' : ''}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				<span className="font-medium text-beam-fg-4 group-hover:text-beam-fg-3 text-xs">{title}</span>
			</div>
			<div
				className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-xs pl-4`}
			>
				<div className="overflow-x-auto text-beam-fg-4 opacity-90 border-l-2 border-beam-warning px-2 py-0.5">
					{children}
				</div>
			</div>
		</div>
	);
}

// ─── Loading title helper ────────────────────────────────────────────────────

export const loadingTitleWrapper = (item: React.ReactNode): React.ReactNode => {
	return <span className='flex items-center flex-nowrap'>
		{item}
		<IconLoading className='w-3 text-sm' />
	</span>
}

// ─── Edit tool diff stats ────────────────────────────────────────────────────

export const getCommandLabel = (command: string) => {
	const commands = command
		.split('|')
		.map(part => part.trim().split(/\s+/)[0])
		.filter(Boolean)
		.slice(0, 2)
	return commands.length ? commands.join(', ') : 'terminal'
}

export const countLinesForChange = (value: string) => value.replace(/\r\n/g, '\n').split('\n').filter(line => line.length > 0).length

export const getEditStats = (toolName: 'edit_file' | 'rewrite_file', content: string) => {
	if (toolName === 'rewrite_file') {
		return { added: countLinesForChange(content), removed: 0 }
	}

	const blocks = content.match(/<<<<<<< SEARCH[\s\S]*?=======[\s\S]*?>>>>>>> REPLACE/g) ?? []
	if (blocks.length === 0) return { added: 0, removed: 0 }

	return blocks.reduce((acc, block) => {
		const parts = block.match(/<<<<<<< SEARCH\n?([\s\S]*?)\n?=======\n?([\s\S]*?)\n?>>>>>>> REPLACE/)
		if (!parts) return acc
		return {
			added: acc.added + countLinesForChange(parts[2] ?? ''),
			removed: acc.removed + countLinesForChange(parts[1] ?? ''),
		}
	}, { added: 0, removed: 0 })
}

// ─── Extension label helper ──────────────────────────────────────────────────

export const extensionLabel = (uri: URI) => {
	const basename = getBasename(uri.fsPath)
	const ext = basename.includes('.') ? basename.split('.').pop() : ''
	return (ext || 'file').slice(0, 4).toUpperCase()
}
