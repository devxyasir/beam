/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useMemo, useState } from 'react';
import { IconShell1 } from '../markdown/ApplyBlockHoverButtons.js';
import { useAccessor, useChatThreadsState, useFullChatThreadsStreamState } from '../util/services.js';
import { Check, Copy, Folder, LoaderCircle, MessageCircleQuestion, Search, Trash2, X } from 'lucide-react';
import { IsRunningType, ThreadType } from "../../../chatThreadService.js";


export const PastThreadsList = ({ className = '' }: { className?: string }) => {
	const accessor = useAccessor()
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
	const [query, setQuery] = useState('')

	const threadsState = useChatThreadsState()
	const { allThreads } = threadsState
	const workspaceContextService = accessor.get('IWorkspaceContextService')
	const currentWorkspacePath = workspaceContextService.getWorkspace().folders[0]?.uri.fsPath

	const streamState = useFullChatThreadsStreamState()

	const runningThreadIds: { [threadId: string]: IsRunningType | undefined } = {}
	for (const threadId in streamState) {
		const isRunning = streamState[threadId]?.isRunning
		if (isRunning) { runningThreadIds[threadId] = isRunning }
	}

	if (!allThreads) {
		return <div key="error" className="p-1">{`Error accessing chat history.`}</div>;
	}

	const normalizedQuery = query.trim().toLowerCase()
	const displayThreads = Object.keys(allThreads ?? {})
		.map(threadId => allThreads[threadId])
		.filter((thread): thread is ThreadType => !!thread && thread.messages.length !== 0)
		.filter(thread => {
			if (!normalizedQuery) return true
			const title = getThreadTitle(thread).toLowerCase()
			const workspace = `${thread.workspaceName ?? ''} ${thread.workspacePath ?? ''}`.toLowerCase()
			return title.includes(normalizedQuery) || workspace.includes(normalizedQuery)
		})
		.sort((a, b) => {
			const aCurrent = currentWorkspacePath && a.workspacePath === currentWorkspacePath ? 1 : 0
			const bCurrent = currentWorkspacePath && b.workspacePath === currentWorkspacePath ? 1 : 0
			if (aCurrent !== bCurrent) return bCurrent - aCurrent
			return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
		})

	const currentWorkspaceThreads = displayThreads.filter(thread => currentWorkspacePath && thread.workspacePath === currentWorkspacePath)
	const otherThreads = displayThreads.filter(thread => !currentWorkspacePath || thread.workspacePath !== currentWorkspacePath)

	return (
		<div className={`@@beam-history-list flex flex-col w-full min-h-0 text-nowrap select-none relative ${className}`}>
			<div className='@@beam-history-search'>
				<Search size={13} />
				<input
					value={query}
					onChange={e => setQuery(e.currentTarget.value)}
					placeholder='Search history'
				/>
			</div>

			<div className='@@beam-history-scroll'>
				<HistorySection
					label='Current workspace'
					threads={currentWorkspaceThreads}
					hoveredIdx={hoveredIdx}
					setHoveredIdx={setHoveredIdx}
					runningThreadIds={runningThreadIds}
					startIdx={0}
				/>
				<HistorySection
					label='Other workspaces'
					threads={otherThreads}
					hoveredIdx={hoveredIdx}
					setHoveredIdx={setHoveredIdx}
					runningThreadIds={runningThreadIds}
					startIdx={currentWorkspaceThreads.length}
				/>
				{displayThreads.length === 0 && <div className='@@beam-history-empty'>No matching chats.</div>}
			</div>
		</div>
	);
};

const HistorySection = ({ label, threads, hoveredIdx, setHoveredIdx, runningThreadIds, startIdx }: {
	label: string;
	threads: ThreadType[];
	hoveredIdx: number | null;
	setHoveredIdx: (idx: number | null) => void;
	runningThreadIds: { [threadId: string]: IsRunningType | undefined };
	startIdx: number;
}) => {
	if (threads.length === 0) return null
	return <div className='@@beam-history-section'>
		<div className='@@beam-history-section-title'>{label}</div>
		{threads.map((pastThread, i) => (
			<PastThreadElement
				key={pastThread.id}
				pastThread={pastThread}
				idx={startIdx + i}
				hoveredIdx={hoveredIdx}
				setHoveredIdx={setHoveredIdx}
				isRunning={runningThreadIds[pastThread.id]}
			/>
		))}
	</div>
}





// Format date to display as today, yesterday, or date
const formatDate = (date: Date) => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (date >= today) {
		return 'Today';
	} else if (date >= yesterday) {
		return 'Yesterday';
	} else {
		return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
	}
};

// Format time to 12-hour format
const formatTime = (date: Date) => {
	return date.toLocaleString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
};

const getThreadTitle = (thread: ThreadType) => {
	if (thread.title) return thread.title
	const firstUser = thread.messages.find(message => message.role === 'user')
	if (firstUser?.role !== 'user') return 'Beam chat'
	return firstUser.displayContent
		.replace(/<[^>\n]+>[\s\S]*?<\/[^>\n]+>/g, ' ')
		.replace(/[`#>*_\[\]()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 72) || 'Beam chat'
}


const DuplicateButton = ({ threadId }: { threadId: string }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')
	return <IconShell1
		Icon={Copy}
		className='size-[11px]'
		onClick={() => { chatThreadsService.duplicateThread(threadId); }}
		data-tooltip-id='beam-tooltip'
		data-tooltip-place='top'
		data-tooltip-content='Duplicate thread'
	>
	</IconShell1>

}

const TrashButton = ({ threadId }: { threadId: string }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')


	const [isTrashPressed, setIsTrashPressed] = useState(false)

	return (isTrashPressed ?
		<div className='flex flex-nowrap text-nowrap gap-1'>
			<IconShell1
				Icon={X}
				className='size-[11px]'
				onClick={() => { setIsTrashPressed(false); }}
				data-tooltip-id='beam-tooltip'
				data-tooltip-place='top'
				data-tooltip-content='Cancel'
			/>
			<IconShell1
				Icon={Check}
				className='size-[11px]'
				onClick={() => { chatThreadsService.deleteThread(threadId); setIsTrashPressed(false); }}
				data-tooltip-id='beam-tooltip'
				data-tooltip-place='top'
				data-tooltip-content='Confirm'
			/>
		</div>
		: <IconShell1
			Icon={Trash2}
			className='size-[11px]'
			onClick={() => { setIsTrashPressed(true); }}
			data-tooltip-id='beam-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Delete thread'
		/>
	)
}

const PastThreadElement = ({ pastThread, idx, hoveredIdx, setHoveredIdx, isRunning }: {
	pastThread: ThreadType,
	idx: number,
	hoveredIdx: number | null,
	setHoveredIdx: (idx: number | null) => void,
	isRunning: IsRunningType | undefined,
}

) => {


	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	// const settingsState = useSettingsState()
	// const convertService = accessor.get('IConvertToLLMMessageService')
	// const chatMode = settingsState.globalSettings.chatMode
	// const modelSelection = settingsState.modelSelectionOfFeature?.Chat ?? null
	// const copyChatButton = <CopyButton
	// 	codeStr={async () => {
	// 		const { messages } = await convertService.prepareLLMChatMessages({
	// 			chatMessages: currentThread.messages,
	// 			chatMode,
	// 			modelSelection,
	// 		})
	// 		return JSON.stringify(messages, null, 2)
	// 	}}
	// 	toolTipName={modelSelection === null ? 'Copy As Messages Payload' : `Copy As ${displayInfoOfProviderName(modelSelection.providerName).title} Payload`}
	// />


	// const currentThread = chatThreadsService.getCurrentThread()
	// const copyChatButton2 = <CopyButton
	// 	codeStr={async () => {
	// 		return JSON.stringify(currentThread.messages, null, 2)
	// 	}}
	// 	toolTipName={`Copy As Beam Chat`}
	// />

	const title = getThreadTitle(pastThread)

	const numMessages = pastThread.messages.filter((msg) => msg.role === 'assistant' || msg.role === 'user').length;

	const detailsHTML = <span
	// data-tooltip-id='beam-tooltip'
	// data-tooltip-content={`Last modified ${formatTime(new Date(pastThread.lastModified))}`}
	// data-tooltip-place='top'
	>
		<span className='opacity-60'>{numMessages}</span>
		{` `}
		{formatDate(new Date(pastThread.lastModified))}
		{/* {` messages `} */}
	</span>

	return <div
		key={pastThread.id}
		className={`
			@@beam-history-row py-2 px-3 rounded-lg text-sm cursor-pointer opacity-85 hover:opacity-100 transition-all duration-150
		`}
		onClick={() => {
			chatThreadsService.switchToThread(pastThread.id);
		}}
		onMouseEnter={() => setHoveredIdx(idx)}
		onMouseLeave={() => setHoveredIdx(null)}
	>
		<div className="flex items-center justify-between gap-1">
			<span className="flex items-center gap-2 min-w-0 overflow-hidden">
				{/* spinner */}
				{isRunning === 'LLM' || isRunning === 'tool' || isRunning === 'idle' ? <LoaderCircle className="animate-spin bg-beam-stroke-1 flex-shrink-0 flex-grow-0" size={14} />
					:
					isRunning === 'awaiting_user' ? <MessageCircleQuestion className="bg-beam-stroke-1 flex-shrink-0 flex-grow-0" size={14} />
						:
						null}
				{/* name */}
				<span className="truncate overflow-hidden text-ellipsis"
					data-tooltip-id='beam-tooltip'
					data-tooltip-content={numMessages + ' messages'}
					data-tooltip-place='top'
				>{title}</span>

				{/* <span className='opacity-60'>{`(${numMessages})`}</span> */}
			</span>

			<div className="flex items-center gap-x-1 opacity-60">
				{idx === hoveredIdx ?
					<>
						{/* trash icon */}
						<DuplicateButton threadId={pastThread.id} />

						{/* trash icon */}
						<TrashButton threadId={pastThread.id} />
					</>
					: <>
						{detailsHTML}
					</>
				}
			</div>
		</div>
		{pastThread.workspaceName && <div className='@@beam-history-workspace'>
			<Folder size={10} />
			<span className='truncate'>{pastThread.workspaceName}</span>
		</div>}
	</div>
}
