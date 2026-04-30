import React from 'react'
import { ToolHeaderWrapper, ToolChildrenWrapper, ToolHeaderParams, FileChip, ToolStatusBadge } from './ToolHeader.js'
import { tintClasses, type ToolTint } from './designTokens.js'
import { IconFile, IconFolder, IconTerminal, IconSearch, IconEdit, IconLoading, IconCheck } from './Icons.js'
import { CodeChildren } from './ToolHeader.js'
import { ProseWrapper } from './MessageComponents.js'

// Tool title mappings for built-in tools (exported for reuse)
export const titleOfBuiltinToolName = {
	'read_file': { done: 'Read file', proposed: 'Read file', running: 'Reading file' },
	'ls_dir': { done: 'Inspected folder', proposed: 'Inspect folder', running: 'Inspecting folder' },
	'get_dir_tree': { done: 'Inspected folder tree', proposed: 'Inspect folder tree', running: 'Inspecting folder tree' },
	'search_pathnames_only': { done: 'Searched by file name', proposed: 'Search by file name', running: 'Searching by file name' },
	'search_for_files': { done: 'Searched', proposed: 'Search', running: 'Searching' },
	'create_file_or_folder': { done: 'Created', proposed: 'Create', running: 'Creating' },
	'delete_file_or_folder': { done: 'Deleted', proposed: 'Delete', running: 'Deleting' },
	'edit_file': { done: 'Edited file', proposed: 'Edit file', running: 'Editing file' },
	'rewrite_file': { done: 'Wrote file', proposed: 'Write file', running: 'Writing file' },
	'run_command': { done: 'Ran terminal', proposed: 'Run terminal', running: 'Running terminal' },
	'run_persistent_command': { done: 'Ran terminal', proposed: 'Run terminal', running: 'Running terminal' },
	'open_persistent_terminal': { done: 'Opened terminal', proposed: 'Open terminal', running: 'Opening terminal' },
	'kill_persistent_terminal': { done: 'Killed terminal', proposed: 'Kill terminal', running: 'Killing terminal' },
	'read_lint_errors': { done: 'Read lint errors', proposed: 'Read lint errors', running: 'Reading lint errors' },
	'search_in_file': { done: 'Searched in file', proposed: 'Search in file', running: 'Searching in file' },
} as const

// Type helper for built-in tool names
type BuiltinToolName = keyof typeof titleOfBuiltinToolName

// Check if a tool name is a built-in tool
export const isABuiltinToolName = (toolName: string): toolName is BuiltinToolName => {
	return toolName in titleOfBuiltinToolName
}

// Get title based on tool state
export const getToolTitle = (
	toolName: string,
	isBuiltIn: boolean,
	status: 'success' | 'running' | 'request' | 'rejected' | 'error' | 'invalid'
): React.ReactNode => {
	if (isBuiltIn) {
		const titles = titleOfBuiltinToolName[toolName as BuiltinToolName]
		if (!titles) return toolName

		switch (status) {
			case 'success': return titles.done
			case 'running': return (
				<span className="flex items-center gap-2">
					{titles.running}
					<IconLoading />
				</span>
				)
			default: return titles.proposed
		}
	}

	// MCP tool titles
	const descriptor = status === 'success' ? 'Called'
		: status === 'running' ? 'Calling'
		: status === 'rejected' ? 'Call'
		: status === 'error' ? 'Call'
		: 'Call'

	const title = `${descriptor} ${toolName}`
	return status === 'running' ? (
		<span className="flex items-center gap-2">
			{title}
			<IconLoading />
		</span>
	) : title
}

// ============================================================================
// Individual Tool Components
// ============================================================================

// Read File Tool - Displays file content with syntax highlighting
export interface ReadFileToolProps {
	uri: string
	filename: string
	relativePath?: string
	content: string
	language?: string
	status: 'success' | 'running' | 'error'
	lineRange?: [number, number]
}

export const ReadFileTool: React.FC<ReadFileToolProps> = ({
	uri,
	filename,
	relativePath,
	content,
	language = 'text',
	status,
	lineRange,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : 'blue'

	return (
		<ToolHeaderWrapper
			title={titleOfBuiltinToolName.read_file.done}
			desc1={filename}
			desc1Info={relativePath}
			tint={tint}
			icon={<IconFile size={16} />}
			isError={isError}
			isOpen={status === 'running'}
		>
			<ToolChildrenWrapper>
				{lineRange && (
					<div className="text-[10px] text-beam-fg-4 mb-2 font-mono">
						Lines {lineRange[0]}-{lineRange[1]}
					</div>
				)}
				<CodeChildren text={content} />
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Edit File Tool - Displays code diff/rewrite
export interface EditFileToolProps {
	uri: string
	filename: string
	relativePath?: string
	content: string
	status: 'success' | 'running' | 'error'
	editType: 'diff' | 'rewrite'
}

export const EditFileTool: React.FC<EditFileToolProps> = ({
	uri,
	filename,
	relativePath,
	content,
	status,
	editType,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : 'green'
	const title = editType === 'diff'
		? titleOfBuiltinToolName.edit_file.done
		: titleOfBuiltinToolName.rewrite_file.done

	return (
		<ToolHeaderWrapper
			title={title}
			desc1={filename}
			desc1Info={relativePath}
			tint={tint}
			icon={<IconEdit size={16} />}
			isError={isError}
			isOpen={status === 'running'}
		>
			<ToolChildrenWrapper>
				<div className="bg-beam-bg-3 rounded p-3 font-mono text-xs overflow-auto max-h-96">
					<pre className="whitespace-pre-wrap">{content}</pre>
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Terminal/Command Tool - Displays command output
export interface TerminalToolProps {
	command: string
	cwd?: string
	output: string
	exitCode?: number
	status: 'success' | 'running' | 'error'
	duration?: number
}

export const TerminalTool: React.FC<TerminalToolProps> = ({
	command,
	cwd,
	output,
	exitCode,
	status,
	duration,
}) => {
	const isError = status === 'error' || (exitCode !== undefined && exitCode !== 0)
	const tint: ToolTint = isError ? 'red' : 'teal'

	return (
		<ToolHeaderWrapper
			title={titleOfBuiltinToolName.run_command.done}
			desc1={command}
			desc1Info={cwd}
			tint={tint}
			icon={<IconTerminal size={16} />}
			isError={isError}
			isOpen={status === 'running' || isError}
		>
			<ToolChildrenWrapper>
				<div className="flex items-center gap-2 mb-2">
					{exitCode !== undefined && (
						<span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${exitCode === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
							Exit {exitCode}
						</span>
					)}
					{duration !== undefined && (
						<span className="text-[10px] text-beam-fg-4 font-mono">
							{duration.toFixed(2)}s
						</span>
					)}
				</div>
				<div className="bg-black rounded p-3 font-mono text-xs overflow-auto max-h-96 text-beam-fg-2">
					<pre className="whitespace-pre-wrap">{output}</pre>
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Search Tool - Displays search results
export interface SearchToolProps {
	query: string
	results: Array<{
		file: string
		line: number
		content: string
	}>
	status: 'success' | 'running' | 'error'
}

export const SearchTool: React.FC<SearchToolProps> = ({
	query,
	results,
	status,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : 'amber'

	return (
		<ToolHeaderWrapper
			title={titleOfBuiltinToolName.search_for_files.done}
			desc1={`"${query}"`}
			desc1Info={`${results.length} results`}
			tint={tint}
			icon={<IconSearch size={16} />}
			isError={isError}
			isOpen={status === 'running'}
		>
			<ToolChildrenWrapper>
				<div className="space-y-2 max-h-64 overflow-auto">
					{results.map((result, idx) => (
						<div
							key={idx}
							className="bg-beam-bg-3 rounded p-2 text-xs font-mono border-l-2 border-beam-border-2"
						>
							<div className="text-beam-fg-3 mb-1">
								{result.file}:{result.line}
							</div>
							<div className="text-beam-fg-2 truncate">{result.content}</div>
						</div>
					))}
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Directory Tool - Displays folder contents
export interface DirectoryToolProps {
	path: string
	items: Array<{
		name: string
		type: 'file' | 'directory'
		size?: number
	}>
	status: 'success' | 'running' | 'error'
}

export const DirectoryTool: React.FC<DirectoryToolProps> = ({
	path,
	items,
	status,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : 'amber'

	return (
		<ToolHeaderWrapper
			title={titleOfBuiltinToolName.ls_dir.done}
			desc1={path}
			tint={tint}
			icon={<IconFolder size={16} />}
			isError={isError}
			isOpen={false}
		>
			<ToolChildrenWrapper>
				<div className="grid grid-cols-2 gap-1 max-h-48 overflow-auto">
					{items.map((item, idx) => (
						<div
							key={idx}
							className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-beam-bg-3"
						>
							<span>{item.type === 'directory' ? '📁' : '📄'}</span>
							<span className="truncate text-beam-fg-2">{item.name}</span>
						</div>
					))}
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Create/Delete File Tool - Simple confirmation display
export interface FileOperationToolProps {
	operation: 'create' | 'delete'
	path: string
	isDirectory: boolean
	status: 'success' | 'running' | 'error'
}

export const FileOperationTool: React.FC<FileOperationToolProps> = ({
	operation,
	path,
	isDirectory,
	status,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : operation === 'create' ? 'green' : 'red'
	const title = operation === 'create'
		? (isDirectory ? titleOfBuiltinToolName.create_file_or_folder.done : 'Created file')
		: (isDirectory ? titleOfBuiltinToolName.delete_file_or_folder.done : 'Deleted file')

	return (
		<ToolHeaderWrapper
			title={title}
			desc1={path}
			tint={tint}
			icon={isDirectory ? <IconFolder size={16} /> : <IconFile size={16} />}
			isError={isError}
			isOpen={false}
		>
			<ToolChildrenWrapper>
				<div className="text-xs text-beam-fg-3">
					{operation === 'create' ? 'Created successfully' : 'Deleted successfully'}
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Lint Errors Tool - Displays lint/diagnostics
export interface LintErrorsToolProps {
	uri: string
	errors: Array<{
		line: number
		column: number
		message: string
		severity: 'error' | 'warning' | 'info'
	}>
	status: 'success' | 'running' | 'error'
}

export const LintErrorsTool: React.FC<LintErrorsToolProps> = ({
	uri,
	errors,
	status,
}) => {
	const isError = status === 'error'
	const tint: ToolTint = isError ? 'red' : errors.length > 0 ? 'amber' : 'green'

	const errorCount = errors.filter(e => e.severity === 'error').length
	const warningCount = errors.filter(e => e.severity === 'warning').length

	return (
		<ToolHeaderWrapper
			title={titleOfBuiltinToolName.read_lint_errors.done}
			desc1={errorCount > 0 ? `${errorCount} errors` : warningCount > 0 ? `${warningCount} warnings` : 'No issues'}
			tint={tint}
			icon={<IconCheck size={16} />}
			isError={isError}
			isOpen={errors.length > 0}
		>
			<ToolChildrenWrapper>
				<div className="space-y-1 max-h-48 overflow-auto">
					{errors.map((error, idx) => (
						<div
							key={idx}
							className={`text-xs font-mono px-2 py-1 rounded border-l-2 ${
								error.severity === 'error'
									? 'bg-red-500/10 border-red-500 text-red-400'
									: error.severity === 'warning'
										? 'bg-amber-500/10 border-amber-500 text-amber-400'
										: 'bg-blue-500/10 border-blue-500 text-blue-400'
							}`}
						>
							<div className="font-medium">Line {error.line}:{error.column}</div>
							<div className="opacity-80">{error.message}</div>
						</div>
					))}
				</div>
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// MCP Tool - Generic wrapper for MCP tools
export interface MCPToolProps {
	toolName: string
	serverName?: string
	params: Record<string, unknown>
	result?: unknown
	error?: string
	status: 'success' | 'running' | 'error' | 'rejected'
}

export const MCPTool: React.FC<MCPToolProps> = ({
	toolName,
	serverName,
	params,
	result,
	error,
	status,
}) => {
	const isError = status === 'error' || status === 'rejected'
	const tint: ToolTint = isError ? 'red' : 'purple'

	const title = getToolTitle(
		toolName,
		isABuiltinToolName(toolName),
		status === 'rejected' ? 'rejected' : status
	)

	return (
		<ToolHeaderWrapper
			title={title}
			desc1={serverName || 'MCP Tool'}
			tint={tint}
			isError={isError}
			isRejected={status === 'rejected'}
			isOpen={status === 'running'}
		>
			<ToolChildrenWrapper>
				{/* Params */}
				<div className="mb-3">
					<div className="text-[10px] uppercase tracking-wider text-beam-fg-4 mb-1">Parameters</div>
					<CodeChildren text={JSON.stringify(params, null, 2)} />
				</div>

				{/* Result or Error */}
				{result !== undefined && (
					<div>
						<div className="text-[10px] uppercase tracking-wider text-beam-fg-4 mb-1">Result</div>
						<CodeChildren text={typeof result === 'string' ? result : JSON.stringify(result, null, 2)} />
					</div>
				)}
				{error && (
					<div className="text-red-400 text-xs">{error}</div>
				)}
			</ToolChildrenWrapper>
		</ToolHeaderWrapper>
	)
}

// Generic tool state indicator (for streaming tools)
export interface GenericToolSoFarProps {
	toolName: string
	isBuiltIn: boolean
	detail?: string
}

export const GenericToolSoFar: React.FC<GenericToolSoFarProps> = ({
	toolName,
	isBuiltIn,
	detail,
}) => {
	const title = isBuiltIn
		? titleOfBuiltinToolName[toolName as BuiltinToolName]?.proposed ?? toolName
		: toolName

	const desc1 = detail ? (
		<span className="flex items-center gap-2">
			{detail}
			<IconLoading />
		</span>
	) : (
		<span className="flex items-center gap-2">
			Calling...
			<IconLoading />
		</span>
	)

	return (
		<ToolHeaderWrapper
			title={title}
			desc1={desc1}
			isOpen={true}
		/>
	)
}

// Re-export for convenience
export { ToolStatusBadge, FileChip }
