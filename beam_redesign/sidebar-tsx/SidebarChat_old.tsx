/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, FormEvent, FormHTMLAttributes, Fragment, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { useAccessor, useAgentRun, useChatThreadsState, useChatThreadsStreamState, useSettingsState, useActiveURI, useCommandBarState, useFullChatThreadsStreamState } from '../util/services.js';
import { ScrollType } from "../../../../../../../editor/common/editorCommon.js";

import { ChatMarkdownRender, ChatMessageLocation, getApplyBoxId } from '../markdown/ChatMarkdownRender.js';
import { URI } from "../../../../../../../base/common/uri.js";
import { IDisposable } from "../../../../../../../base/common/lifecycle.js";
import { ErrorDisplay } from './ErrorDisplay.js';
import { BlockCode, TextAreaFns, BeamCustomDropdownBox, BeamInputBox2, BeamSlider, BeamSwitch, BeamDiffEditor } from '../util/inputs.js';
import { ModelDropdown, } from '../beam-settings-tsx/ModelDropdown.js';
import { PastThreadsList } from './SidebarThreadSelector.js';
import { BEAM_CTRL_L_ACTION_ID } from "../../../actionIDs.js";
import { BEAM_OPEN_SETTINGS_ACTION_ID } from "../../../beamSettingsPane.js";
import { ChatMode, displayInfoOfProviderName, FeatureName, isFeatureNameDisabled } from "../../../../../../../workbench/contrib/beam/common/beamSettingsTypes.js";
import { ICommandService } from "../../../../../../../platform/commands/common/commands.js";
import { WarningBox } from '../beam-settings-tsx/WarningBox.js';
import { getModelCapabilities, getIsReasoningEnabledState } from "../../../../common/modelCapabilities.js";
import { AlertTriangle, File, Ban, Check, ChevronRight, Dot, FileIcon, Pencil, Undo, Undo2, X, Flag, Copy as CopyIcon, Info, CirclePlus, Ellipsis, CircleEllipsis, Folder, ALargeSmall, TypeOutline, Text, Terminal, Search } from 'lucide-react';
import { AgentEvent, AgentEventType, ChatMessage, CheckpointEntry, StagingSelectionItem, TaskPlan, ToolMessage } from "../../../../common/chatThreadServiceTypes.js";
import { approvalTypeOfBuiltinToolName, BuiltinToolCallParams, BuiltinToolName, ToolName, LintErrorItem, ToolApprovalType, toolApprovalTypes } from "../../../../common/toolsServiceTypes.js";
import { CopyButton, EditToolAcceptRejectButtonsHTML, IconShell1, JumpToFileButton, JumpToTerminalButton, StatusIndicator, StatusIndicatorForApplyButton, useApplyStreamState, useEditToolStreamState } from '../markdown/ApplyBlockHoverButtons.js';
import { IsRunningType } from "../../../chatThreadService.js";
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from "../../../../common/helpers/colors.js";
import { builtinToolNames, isABuiltinToolName, MAX_FILE_CHARS_PAGE, MAX_TERMINAL_INACTIVE_TIME } from "../../../../common/prompt/prompts.js";
import { RawToolCallObj } from "../../../../common/sendLLMMessageTypes.js";
import ErrorBoundary from './ErrorBoundary.js';
import { ToolApprovalTypeSwitch } from '../beam-settings-tsx/Settings.js';

import { persistentTerminalNameOfId } from "../../../terminalToolService.js";
import { removeMCPToolNamePrefix } from "../../../../common/mcpServiceTypes.js";


type ChatBubbleMode = 'edit' | 'display'

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

const IconArrowUp = ({ size, className = '' }: { size: number, className?: string }) => {
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


const IconSquare = ({ size, className = '' }: { size: number, className?: string }) => {
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
		let intervalId;

		// Function to handle the animation
		const toggleLoadingText = () => {
			if (loadingText === '...') {
				setLoadingText('.');
			} else {
				setLoadingText(loadingText + '.');
			}
		};

		// Start the animation loop
		intervalId = setInterval(toggleLoadingText, 300);

		// Cleanup function to clear the interval when component unmounts
		return () => clearInterval(intervalId);
	}, [loadingText, setLoadingText]);

	return <div className={`${className}`}>{loadingText}</div>;

}



// SLIDER ONLY:
const ReasoningOptionSlider = ({ featureName }: { featureName: FeatureName }) => {
	const accessor = useAccessor()

	const beamSettingsService = accessor.get('IBeamSettingsService')
	const beamSettingsState = useSettingsState()

	const modelSelection = beamSettingsState.modelSelectionOfFeature[featureName]
	const overridesOfModel = beamSettingsState.overridesOfModel

	if (!modelSelection) return null

	const { modelName, providerName } = modelSelection
	const { reasoningCapabilities } = getModelCapabilities(providerName, modelName, overridesOfModel)
	const { canTurnOffReasoning, reasoningSlider: reasoningBudgetSlider } = reasoningCapabilities || {}

	const modelSelectionOptions = beamSettingsState.optionsOfModelSelection[featureName][providerName]?.[modelName]
	const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel)

	if (canTurnOffReasoning && !reasoningBudgetSlider) { // if it's just a on/off toggle without a power slider
		return <div className='flex items-center gap-x-2'>
			<span className='text-beam-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<BeamSwitch
				size='xxs'
				value={isReasoningEnabled}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && !newVal
					beamSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff })
				}}
			/>
		</div>
	}

	if (reasoningBudgetSlider?.type === 'budget_slider') { // if it's a slider
		const { min: min_, max, default: defaultVal } = reasoningBudgetSlider

		const nSteps = 8 // only used in calculating stepSize, stepSize is what actually matters
		const stepSize = Math.round((max - min_) / nSteps)

		const valueIfOff = min_ - stepSize
		const min = canTurnOffReasoning ? valueIfOff : min_
		const value = isReasoningEnabled ? beamSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningBudget ?? defaultVal
			: valueIfOff

		return <div className='flex items-center gap-x-2'>
			<span className='text-beam-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<BeamSlider
				width={50}
				size='xs'
				min={min}
				max={max}
				step={stepSize}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff
					beamSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningBudget: newVal })
				}}
			/>
			<span className='text-beam-fg-3 text-xs pointer-events-none'>{isReasoningEnabled ? `${value} tokens` : 'Thinking disabled'}</span>
		</div>
	}

	if (reasoningBudgetSlider?.type === 'effort_slider') {

		const { values, default: defaultVal } = reasoningBudgetSlider

		const min = canTurnOffReasoning ? -1 : 0
		const max = values.length - 1

		const currentEffort = beamSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningEffort ?? defaultVal
		const valueIfOff = -1
		const value = isReasoningEnabled && currentEffort ? values.indexOf(currentEffort) : valueIfOff

		const currentEffortCapitalized = currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1, Infinity)

		return <div className='flex items-center gap-x-2'>
			<span className='text-beam-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<BeamSlider
				width={30}
				size='xs'
				min={min}
				max={max}
				step={1}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff
					beamSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningEffort: values[newVal] ?? undefined })
				}}
			/>
			<span className='text-beam-fg-3 text-xs pointer-events-none'>{isReasoningEnabled ? `${currentEffortCapitalized}` : 'Thinking disabled'}</span>
		</div>
	}

	return null
}



const nameOfChatMode = {
	'normal': 'Chat',
	'gather': 'Gather',
	'agent': 'Agent',
}

const detailOfChatMode = {
	'normal': 'Normal chat',
	'gather': 'Reads files, but can\'t edit',
	'agent': 'Edits files and uses tools',
}


const ChatModeDropdown = ({ className }: { className: string }) => {
	const accessor = useAccessor()

	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()

	const options: ChatMode[] = useMemo(() => ['normal', 'gather', 'agent'], [])

	const onChangeOption = useCallback((newVal: ChatMode) => {
		beamSettingsService.setGlobalSetting('chatMode', newVal)
	}, [beamSettingsService])

	return <BeamCustomDropdownBox
		className={className}
		options={options}
		selectedOption={settingsState.globalSettings.chatMode}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(val) => nameOfChatMode[val]}
		getOptionDropdownName={(val) => nameOfChatMode[val]}
		getOptionDropdownDetail={(val) => detailOfChatMode[val]}
		getOptionsEqual={(a, b) => a === b}
	/>

}





interface BeamChatAreaProps {
	// Required
	children: React.ReactNode; // This will be the input component

	// Form controls
	onSubmit: () => void;
	onAbort: () => void;
	isStreaming: boolean;
	isDisabled?: boolean;
	divRef?: React.RefObject<HTMLDivElement | null>;

	// UI customization
	className?: string;
	showModelDropdown?: boolean;
	showSelections?: boolean;
	showProspectiveSelections?: boolean;
	loadingIcon?: React.ReactNode;

	selections?: StagingSelectionItem[]
	setSelections?: (s: StagingSelectionItem[]) => void
	// selections?: any[];
	// onSelectionsChange?: (selections: any[]) => void;

	onClickAnywhere?: () => void;
	// Optional close button
	onClose?: () => void;

	featureName: FeatureName;
}

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
                rounded-lg
                bg-beam-bg-1
				@@beam-premium-panel
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
					type='staging'
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
						<ReasoningOptionSlider featureName={featureName} />

						<div className='flex items-center flex-wrap gap-x-2 gap-y-1 text-nowrap '>
							{featureName === 'Chat' && <ChatModeDropdown className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-2 rounded py-0.5 px-1' />}
							<ModelDropdown featureName={featureName} className='text-xs text-beam-fg-3 bg-beam-bg-1 rounded' />
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">

					{isStreaming && loadingIcon}

					{isStreaming ? (
						<ButtonStop onClick={onAbort} />
					) : (
						<ButtonSubmit
							onClick={onSubmit}
							disabled={isDisabled}
						/>
					)}
				</div>

			</div>
		</div>
	);
};




type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
const DEFAULT_BUTTON_SIZE = 22;
export const ButtonSubmit = ({ className, disabled, ...props }: ButtonProps & Required<Pick<ButtonProps, 'disabled'>>) => {

	return <button
		type='button'
		className={`rounded-full flex-shrink-0 flex-grow-0 flex items-center justify-center
			${disabled ? 'bg-vscode-disabled-fg cursor-default' : 'bg-white cursor-pointer'}
			${className}
		`}
		// data-tooltip-id='beam-tooltip'
		// data-tooltip-content={'Send'}
		// data-tooltip-place='left'
		{...props}
	>
		<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="stroke-[2] p-[2px]" />
	</button>
}

export const ButtonStop = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return <button
		className={`rounded-full flex-shrink-0 flex-grow-0 cursor-pointer flex items-center justify-center
			bg-white
			${className}
		`}
		type='button'
		{...props}
	>
		<IconSquare size={DEFAULT_BUTTON_SIZE} className="stroke-[3] p-[7px]" />
	</button>
}



const scrollToBottom = (divRef: { current: HTMLElement | null }) => {
	if (divRef.current) {
		divRef.current.scrollTop = divRef.current.scrollHeight;
	}
};



const ScrollToBottomContainer = ({ children, className, style, scrollContainerRef }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, scrollContainerRef: React.MutableRefObject<HTMLDivElement | null> }) => {
	const [isAtBottom, setIsAtBottom] = useState(true); // Start at bottom

	const divRef = scrollContainerRef

	const onScroll = () => {
		const div = divRef.current;
		if (!div) return;

		const isBottom = Math.abs(
			div.scrollHeight - div.clientHeight - div.scrollTop
		) < 4;

		setIsAtBottom(isBottom);
	};

	// When children change (new messages added)
	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom(divRef);
		}
	}, [children, isAtBottom]); // Dependency on children to detect new messages

	// Initial scroll to bottom
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
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const parts = pathStr.split('/') // split on /
	// Filter out empty parts (the last element will be empty if path ends with /)
	const nonEmptyParts = parts.filter(part => part.length > 0)
	if (nonEmptyParts.length === 0) return '/' // Root directory
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + '/' // Only one folder
	// Get the last two parts
	const lastTwo = nonEmptyParts.slice(-2)
	return lastTwo.join('/') + '/'
}

export const getBasename = (pathStr: string, parts: number = 1) => {
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const allParts = pathStr.split('/') // split on /
	if (allParts.length === 0) return pathStr
	return allParts.slice(-parts).join('/')
}



// Open file utility function
export const voidOpenFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number]
) => {
	const commandService = accessor.get('ICommandService')
	const editorService = accessor.get('ICodeEditorService')

	// Get editor selection from CodeSelection range
	let editorSelection = undefined;

	// If we have a selection, create an editor selection from the range
	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER,
		};
	}

	// open the file
	commandService.executeCommand('vscode.open', uri).then(() => {

		// select the text
		setTimeout(() => {
			if (!editorSelection) return;

			const editor = editorService.getActiveCodeEditor()
			if (!editor) return;

			editor.setSelection(editorSelection)
			editor.revealRange(editorSelection, ScrollType.Immediate)

		}, 50) // needed when document was just opened and needs to initialize

	})

};


export const SelectedFiles = (
	{ type, selections, setSelections, showProspectiveSelections, messageIdx, }:
		| { type: 'past', selections: StagingSelectionItem[]; setSelections?: undefined, showProspectiveSelections?: undefined, messageIdx: number, }
		| { type: 'staging', selections: StagingSelectionItem[]; setSelections: ((newSelections: StagingSelectionItem[]) => void), showProspectiveSelections?: boolean, messageIdx?: number }
) => {

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const modelReferenceService = accessor.get('IBeamModelService')




	// state for tracking prospective files
	const { uri: currentURI } = useActiveURI()
	const [recentUris, setRecentUris] = useState<URI[]>([])
	const maxRecentUris = 10
	const maxProspectiveFiles = 3
	useEffect(() => { // handle recent files
		if (!currentURI) return
		setRecentUris(prev => {
			const withoutCurrent = prev.filter(uri => uri.fsPath !== currentURI.fsPath) // remove duplicates
			const withCurrent = [currentURI, ...withoutCurrent]
			return withCurrent.slice(0, maxRecentUris)
		})
	}, [currentURI])
	const [prospectiveSelections, setProspectiveSelections] = useState<StagingSelectionItem[]>([])


	// handle prospective files
	useEffect(() => {
		const computeRecents = async () => {
			const prospectiveURIs = recentUris
				.filter(uri => !selections.find(s => s.type === 'File' && s.uri.fsPath === uri.fsPath))
				.slice(0, maxProspectiveFiles)

			const answer: StagingSelectionItem[] = []
			for (const uri of prospectiveURIs) {
				answer.push({
					type: 'File',
					uri: uri,
					language: (await modelReferenceService.getModelSafe(uri)).model?.getLanguageId() || 'plaintext',
					state: { wasAddedAsCurrentFile: false },
				})
			}
			return answer
		}

		// add a prospective file if type === 'staging' and if the user is in a file, and if the file is not selected yet
		if (type === 'staging' && showProspectiveSelections) {
			computeRecents().then((a) => setProspectiveSelections(a))
		}
		else {
			setProspectiveSelections([])
		}
	}, [recentUris, selections, type, showProspectiveSelections])


	const allSelections = [...selections, ...prospectiveSelections]

	if (allSelections.length === 0) {
		return null
	}

	return (
		<div className='flex items-center flex-wrap text-left relative gap-x-0.5 gap-y-1 pb-0.5'>

			{allSelections.map((selection, i) => {

				const isThisSelectionProspective = i > selections.length - 1

				const thisKey = selection.type === 'CodeSelection' ? selection.type + selection.language + selection.range + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
					: selection.type === 'File' ? selection.type + selection.language + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
						: selection.type === 'Folder' ? selection.type + selection.language + selection.state + selection.uri.fsPath
							: i

				const SelectionIcon = (
					selection.type === 'File' ? File
						: selection.type === 'Folder' ? Folder
							: selection.type === 'CodeSelection' ? Text
								: (undefined as never)
				)

				return <div // container for summarybox and code
					key={thisKey}
					className={`flex flex-col space-y-[1px]`}
				>
					{/* tooltip for file path */}
					<span className="truncate overflow-hidden text-ellipsis"
						data-tooltip-id='beam-tooltip'
						data-tooltip-content={getRelative(selection.uri, accessor)}
						data-tooltip-place='top'
						data-tooltip-delay-show={3000}
					>
						{/* summarybox */}
						<div
							className={`
								flex items-center gap-1 relative
								px-1
								w-fit h-fit
								select-none
								text-xs text-nowrap
								border rounded-sm
								${isThisSelectionProspective ? 'bg-beam-bg-1 text-beam-fg-3 opacity-80' : 'bg-beam-bg-1 hover:brightness-95 text-beam-fg-1'}
								${isThisSelectionProspective
									? 'border-beam-border-2'
									: 'border-beam-border-1'
								}
								hover:border-beam-border-1
								transition-all duration-150
							`}
							onClick={() => {
								if (type !== 'staging') return; // (never)
								if (isThisSelectionProspective) { // add prospective selection to selections
									setSelections([...selections, selection])
								}
								else if (selection.type === 'File') { // open files
									voidOpenFileFn(selection.uri, accessor);

									const wasAddedAsCurrentFile = selection.state.wasAddedAsCurrentFile
									if (wasAddedAsCurrentFile) {
										// make it so the file is added permanently, not just as the current file
										const newSelection: StagingSelectionItem = { ...selection, state: { ...selection.state, wasAddedAsCurrentFile: false } }
										setSelections([
											...selections.slice(0, i),
											newSelection,
											...selections.slice(i + 1)
										])
									}
								}
								else if (selection.type === 'CodeSelection') {
									voidOpenFileFn(selection.uri, accessor, selection.range);
								}
								else if (selection.type === 'Folder') {
									// TODO!!! reveal in tree
								}
							}}
						>
							{<SelectionIcon size={10} />}

							{ // file name and range
								getBasename(selection.uri.fsPath)
								+ (selection.type === 'CodeSelection' ? ` (${selection.range[0]}-${selection.range[1]})` : '')
							}

							{selection.type === 'File' && selection.state.wasAddedAsCurrentFile && messageIdx === undefined && currentURI?.fsPath === selection.uri.fsPath ?
								<span className={`text-[8px] 'beam-opacity-60 text-beam-fg-4`}>
									{`(Current File)`}
								</span>
								: null
							}

							{type === 'staging' && !isThisSelectionProspective ? // X button
								<div // box for making it easier to click
									className='cursor-pointer z-1 self-stretch flex items-center justify-center'
									onClick={(e) => {
										e.stopPropagation(); // don't open/close selection
										if (type !== 'staging') return;
										setSelections([...selections.slice(0, i), ...selections.slice(i + 1)])
									}}
								>
									<IconX
										className='stroke-[2]'
										size={10}
									/>
								</div>
								: <></>
							}
						</div>
					</span>
				</div>

			})}


		</div>

	)
}


type ToolHeaderParams = {
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

const ToolHeaderWrapper = ({
	icon,
	title,
	desc1,
	desc1OnClick,
	desc1Info,
	desc2,
	numResults,
	hasNextPage,
	children,
	info,
	bottomChildren,
	isError,
	onClick,
	desc2OnClick,
	isOpen,
	isRejected,
	className, // applies to the main content
}: ToolHeaderParams) => {

	const [isOpen_, setIsOpen] = useState(false);
	const isExpanded = isOpen !== undefined ? isOpen : isOpen_

	const isDropdown = children !== undefined // null ALLOWS dropdown
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
					<div // container for if desc1 is clickable
						className='ml-1 flex items-center overflow-hidden'
					>
						{/* title eg "> Edited File" */}
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

						{info && <CircleEllipsis
							className='ml-2 text-beam-fg-4 opacity-60 flex-shrink-0'
							size={14}
							data-tooltip-id='beam-tooltip'
							data-tooltip-content={info}
							data-tooltip-place='top-end'
						/>}

						{isError && <AlertTriangle
							className='text-beam-warning opacity-90 flex-shrink-0'
							size={14}
							data-tooltip-id='beam-tooltip'
							data-tooltip-content={'Error running tool'}
							data-tooltip-place='top'
						/>}
						{isRejected && <Ban
							className='text-beam-fg-4 opacity-90 flex-shrink-0'
							size={14}
							data-tooltip-id='beam-tooltip'
							data-tooltip-content={'Canceled'}
							data-tooltip-place='top'
						/>}
						{desc2 && <span className="text-beam-fg-4 text-xs" onClick={desc2OnClick}>
							{desc2}
						</span>}
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
			//    bg-black bg-opacity-10 border border-beam-border-4 border-opacity-50
			>
				{children}
			</div>}
		</div>
		{bottomChildren}
	</div>);
};

const toolAccentClass = (toolName: string | undefined): string => {
	if (!toolName) return ''
	if (['read_file', 'ls_dir', 'get_dir_tree', 'read_lint_errors'].includes(toolName)) return '@@beam-tool-read'
	if (['edit_file', 'rewrite_file', 'create_file_or_folder', 'delete_file_or_folder'].includes(toolName)) return '@@beam-tool-write'
	if (['run_command', 'run_persistent_command', 'open_persistent_terminal', 'kill_persistent_terminal'].includes(toolName)) return '@@beam-tool-terminal'
	if (['search_for_files', 'search_pathnames_only', 'search_in_file'].includes(toolName)) return '@@beam-tool-search'
	return ''
}

const ToolPathChip = ({ uri, isFolder, label, accessor, range }: { uri: URI, isFolder?: boolean, label?: string, accessor: ReturnType<typeof useAccessor>, range?: [number, number] }) => {
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

const ToolActivityRow = ({
	verb,
	uri,
	isFolder,
	accessor,
	range,
	detail,
	children,
	isError,
	isRejected,
}: {
	verb: React.ReactNode;
	uri: URI;
	isFolder?: boolean;
	accessor: ReturnType<typeof useAccessor>;
	range?: [number, number];
	detail?: React.ReactNode;
	children?: React.ReactNode;
	isError?: boolean;
	isRejected?: boolean;
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

const ToolActivityListItem = ({ uri, isFolder, accessor, label }: { uri: URI, isFolder?: boolean, accessor: ReturnType<typeof useAccessor>, label?: string }) => {
	return <div className='flex min-w-0 items-center py-0.5 text-xs'>
		<span className='w-[14px] flex-shrink-0' />
		<ToolPathChip uri={uri} isFolder={isFolder} accessor={accessor} label={label} />
	</div>
}

const extensionLabel = (uri: URI) => {
	const basename = getBasename(uri.fsPath)
	const ext = basename.includes('.') ? basename.split('.').pop() : ''
	return (ext || 'file').slice(0, 4).toUpperCase()
}

const SearchResultPath = ({ uri, accessor, line, relevance }: { uri: URI, accessor: ReturnType<typeof useAccessor>, line?: number, relevance?: number }) => {
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

const SearchToolCard = ({
	query,
	scope,
	results,
	lines,
	isError,
	isRejected,
	hasNextPage,
	isSearching,
	children,
}: {
	query: string;
	scope?: React.ReactNode;
	results?: URI[];
	lines?: { uri: URI, line: number }[];
	isError?: boolean;
	isRejected?: boolean;
	hasNextPage?: boolean;
	isSearching?: boolean;
	children?: React.ReactNode;
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

const getCommandLabel = (command: string) => {
	const commands = command
		.split('|')
		.map(part => part.trim().split(/\s+/)[0])
		.filter(Boolean)
		.slice(0, 2)
	return commands.length ? commands.join(', ') : 'terminal'
}

const countLinesForChange = (value: string) => value.replace(/\r\n/g, '\n').split('\n').filter(line => line.length > 0).length

const getEditStats = (toolName: 'edit_file' | 'rewrite_file', content: string) => {
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



const EditTool = ({ toolMessage, threadId, messageIdx, content }: Parameters<ResultWrapper<'edit_file' | 'rewrite_file'>>[0] & { content: string }) => {
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

const SimplifiedToolHeader = ({
	title,
	children,
}: {
	title: string;
	children?: React.ReactNode;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDropdown = children !== undefined;
	return (
		<div>
			<div className="w-full">
				{/* header */}
				<div
					className={`select-none flex items-center min-h-[24px] ${isDropdown ? 'cursor-pointer' : ''}`}
					onClick={() => {
						if (isDropdown) { setIsOpen(v => !v); }
					}}
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
				{/* children */}
				{<div
					className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-beam-fg-4`}
				>
					{children}
				</div>}
			</div>
		</div>
	);
};




const UserMessageComponent = ({ chatMessage, messageIdx, isCheckpointGhost, currCheckpointIdx, _scrollToBottom }: { chatMessage: ChatMessage & { role: 'user' }, messageIdx: number, currCheckpointIdx: number | null | undefined, isCheckpointGhost: boolean, _scrollToBottom: (() => void) | null }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	// global state
	let isBeingEdited = false
	let stagingSelections: StagingSelectionItem[] = []
	let setIsBeingEdited = (_: boolean) => { }
	let setStagingSelections = (_: StagingSelectionItem[]) => { }

	if (messageIdx !== undefined) {
		const _state = chatThreadsService.getCurrentMessageState(messageIdx)
		isBeingEdited = _state.isBeingEdited
		stagingSelections = _state.stagingSelections
		setIsBeingEdited = (v) => chatThreadsService.setCurrentMessageState(messageIdx, { isBeingEdited: v })
		setStagingSelections = (s) => chatThreadsService.setCurrentMessageState(messageIdx, { stagingSelections: s })
	}


	// local state
	const mode: ChatBubbleMode = isBeingEdited ? 'edit' : 'display'
	const [isFocused, setIsFocused] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [isDisabled, setIsDisabled] = useState(false)
	const [textAreaRefState, setTextAreaRef] = useState<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)
	// initialize on first render, and when edit was just enabled
	const _mustInitialize = useRef(true)
	const _justEnabledEdit = useRef(false)
	useEffect(() => {
		const canInitialize = mode === 'edit' && textAreaRefState
		const shouldInitialize = _justEnabledEdit.current || _mustInitialize.current
		if (canInitialize && shouldInitialize) {
			setStagingSelections(
				(chatMessage.selections || []).map(s => { // quick hack so we dont have to do anything more
					if (s.type === 'File') return { ...s, state: { ...s.state, wasAddedAsCurrentFile: false, } }
					else return s
				})
			)

			if (textAreaFnsRef.current)
				textAreaFnsRef.current.setValue(chatMessage.displayContent || '')

			textAreaRefState.focus();

			_justEnabledEdit.current = false
			_mustInitialize.current = false
		}

	}, [chatMessage, mode, _justEnabledEdit, textAreaRefState, textAreaFnsRef.current, _justEnabledEdit.current, _mustInitialize.current])

	const onOpenEdit = () => {
		setIsBeingEdited(true)
		chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx)
		_justEnabledEdit.current = true
	}
	const onCloseEdit = () => {
		setIsFocused(false)
		setIsHovered(false)
		setIsBeingEdited(false)
		chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)

	}

	const EditSymbol = mode === 'display' ? Pencil : X


	let chatbubbleContents: React.ReactNode
	if (mode === 'display') {
		chatbubbleContents = <>
			<SelectedFiles type='past' messageIdx={messageIdx} selections={chatMessage.selections || []} />
			<span className='px-0.5'>{chatMessage.displayContent}</span>
		</>
	}
	else if (mode === 'edit') {

		const onSubmit = async () => {

			if (isDisabled) return;
			if (!textAreaRefState) return;
			if (messageIdx === undefined) return;

			// cancel any streams on this thread
			const threadId = chatThreadsService.state.currentThreadId

			await chatThreadsService.abortRunning(threadId)

			// update state
			setIsBeingEdited(false)
			chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)

			// stream the edit
			const userMessage = textAreaRefState.value;
			try {
				await chatThreadsService.editUserMessageAndStreamResponse({ userMessage, messageIdx, threadId })
			} catch (e) {
				console.error('Error while editing message:', e)
			}
			await chatThreadsService.focusCurrentChat()
			requestAnimationFrame(() => _scrollToBottom?.())
		}

		const onAbort = async () => {
			const threadId = chatThreadsService.state.currentThreadId
			await chatThreadsService.abortRunning(threadId)
		}

		const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				onCloseEdit()
			}
			if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
				onSubmit()
			}
		}

		if (!chatMessage.content) { // don't show if empty and not loading (if loading, want to show).
			return null
		}

		chatbubbleContents = <BeamChatArea
			featureName='Chat'
			onSubmit={onSubmit}
			onAbort={onAbort}
			isStreaming={false}
			isDisabled={isDisabled}
			showSelections={true}
			showProspectiveSelections={false}
			selections={stagingSelections}
			setSelections={setStagingSelections}
		>
			<BeamInputBox2
				enableAtToMention
				ref={setTextAreaRef}
				className='min-h-[81px] max-h-[500px] px-0.5'
				placeholder="Edit your message..."
				onChangeText={(text) => setIsDisabled(!text)}
				onFocus={() => {
					setIsFocused(true)
					chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
				}}
				onBlur={() => {
					setIsFocused(false)
				}}
				onKeyDown={onKeyDown}
				fnsRef={textAreaFnsRef}
				multiline={true}
			/>
		</BeamChatArea>
	}

	const isMsgAfterCheckpoint = currCheckpointIdx !== undefined && currCheckpointIdx === messageIdx - 1

	return <div
		// align chatbubble accoridng to role
		className={`
        relative ml-auto
        ${mode === 'edit' ? 'w-full max-w-full'
				: mode === 'display' ? `self-end w-fit max-w-full whitespace-pre-wrap` : '' // user words should be pre
			}

        ${isCheckpointGhost && !isMsgAfterCheckpoint ? 'opacity-50 pointer-events-none' : ''}
    `}
		onMouseEnter={() => setIsHovered(true)}
		onMouseLeave={() => setIsHovered(false)}
	>
		<div
			// style chatbubble according to role
			className={`
            text-left rounded-lg max-w-full
            ${mode === 'edit' ? ''
					: mode === 'display' ? 'px-3 py-2 flex flex-col bg-beam-bg-1 text-beam-fg-1 overflow-x-auto cursor-pointer @@beam-message-enter @@beam-user-bubble' : ''
				}
        `}
			onClick={() => { if (mode === 'display') { onOpenEdit() } }}
		>
			{chatbubbleContents}
		</div>

		{mode === 'display' && chatMessage.state.taskPlan && (
			<TaskPlanProgress taskPlan={chatMessage.state.taskPlan} />
		)}



		<div
			className="absolute -top-1 -right-1 translate-x-0 -translate-y-0 z-1"
		// data-tooltip-id='beam-tooltip'
		// data-tooltip-content='Edit message'
		// data-tooltip-place='left'
		>
			<EditSymbol
				size={18}
				className={`
                    cursor-pointer
                    p-[2px]
                    bg-beam-bg-1 border border-beam-border-1 rounded-md
                    transition-opacity duration-200 ease-in-out
                    ${isHovered || (isFocused && mode === 'edit') ? 'opacity-100' : 'opacity-0'}
                `}
				onClick={() => {
					if (mode === 'display') {
						onOpenEdit()
					} else if (mode === 'edit') {
						onCloseEdit()
					}
				}}
			/>
		</div>


	</div>

}

const SmallProseWrapper = ({ children }: { children: React.ReactNode }) => {
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

const ProseWrapper = ({ children }: { children: React.ReactNode }) => {
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
const AssistantMessageComponent = ({ chatMessage, isCheckpointGhost, isCommitted, messageIdx }: { chatMessage: ChatMessage & { role: 'assistant' }, isCheckpointGhost: boolean, messageIdx: number, isCommitted: boolean }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	const reasoningStr = chatMessage.reasoning?.trim() || null
	const hasReasoning = !!reasoningStr
	const isDoneReasoning = !!chatMessage.displayContent
	const thread = chatThreadsService.getCurrentThread()


	const chatMessageLocation: ChatMessageLocation = {
		threadId: thread.id,
		messageIdx: messageIdx,
	}

	const isEmpty = !chatMessage.displayContent && !chatMessage.reasoning
	if (isEmpty) return null

	return <>
		{/* reasoning token */}
		{hasReasoning &&
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ReasoningWrapper isDoneReasoning={isDoneReasoning} isStreaming={!isCommitted}>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={reasoningStr}
							chatMessageLocation={chatMessageLocation}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true}
						/>
					</SmallProseWrapper>
				</ReasoningWrapper>
			</div>
		}

		{/* assistant message */}
		{chatMessage.displayContent &&
			<div className={`@@beam-message-enter @@beam-assistant-bubble ${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ProseWrapper>
					<ChatMarkdownRender
						string={chatMessage.displayContent || ''}
						chatMessageLocation={chatMessageLocation}
						isApplyEnabled={true}
						isLinkDetectionEnabled={true}
					/>
				</ProseWrapper>
			</div>
		}
	</>

}

const ReasoningWrapper = ({ isDoneReasoning, isStreaming, children }: { isDoneReasoning: boolean, isStreaming: boolean, children: React.ReactNode }) => {
	const isDone = isDoneReasoning || !isStreaming
	const isWriting = !isDone
	const [isOpen, setIsOpen] = useState(true)
	useEffect(() => {
		if (isWriting) setIsOpen(true)
	}, [isWriting])
	return <div className='@@beam-reasoning-shell @@beam-tool-enter'>
		<button
			type='button'
			className='@@beam-reasoning-toggle'
			onClick={() => setIsOpen(v => !v)}
		>
			<span className={`@@beam-reasoning-tag ${isWriting ? '@@beam-reasoning-tag-active' : ''}`}>{isWriting ? 'THINKING' : 'THOUGHTS'}</span>
			<span className='truncate'>{isWriting ? 'Working through the next step' : 'Thought trail'}</span>
			{isWriting && <IconLoading className='w-3' />}
			<ChevronRight size={13} className={`ml-auto flex-shrink-0 text-beam-fg-4 transition-transform duration-100 ${isOpen ? 'rotate-90' : ''}`} />
		</button>
		{isOpen && <div className='@@beam-reasoning-block'>
			<div className='@@beam-reasoning-label'>Agent reasoning</div>
			<div className='!select-text cursor-auto'>
				{children}
			</div>
		</div>}
	</div>
}




// should either be past or "-ing" tense, not present tense. Eg. when the LLM searches for something, the user expects it to say "I searched for X" or "I am searching for X". Not "I search X".

const loadingTitleWrapper = (item: React.ReactNode): React.ReactNode => {
	return <span className='flex items-center flex-nowrap'>
		{item}
		<IconLoading className='w-3 text-sm' />
	</span>
}

const titleOfBuiltinToolName = {
	'read_file': { done: 'Read file', proposed: 'Read file', running: loadingTitleWrapper('Reading file') },
	'ls_dir': { done: 'Inspected folder', proposed: 'Inspect folder', running: loadingTitleWrapper('Inspecting folder') },
	'get_dir_tree': { done: 'Inspected folder tree', proposed: 'Inspect folder tree', running: loadingTitleWrapper('Inspecting folder tree') },
	'search_pathnames_only': { done: 'Searched by file name', proposed: 'Search by file name', running: loadingTitleWrapper('Searching by file name') },
	'search_for_files': { done: 'Searched', proposed: 'Search', running: loadingTitleWrapper('Searching') },
	'create_file_or_folder': { done: `Created`, proposed: `Create`, running: loadingTitleWrapper(`Creating`) },
	'delete_file_or_folder': { done: `Deleted`, proposed: `Delete`, running: loadingTitleWrapper(`Deleting`) },
	'edit_file': { done: `Edited file`, proposed: 'Edit file', running: loadingTitleWrapper('Editing file') },
	'rewrite_file': { done: `Wrote file`, proposed: 'Write file', running: loadingTitleWrapper('Writing file') },
	'run_command': { done: `Ran terminal`, proposed: 'Run terminal', running: loadingTitleWrapper('Running terminal') },
	'run_persistent_command': { done: `Ran terminal`, proposed: 'Run terminal', running: loadingTitleWrapper('Running terminal') },

	'open_persistent_terminal': { done: `Opened terminal`, proposed: 'Open terminal', running: loadingTitleWrapper('Opening terminal') },
	'kill_persistent_terminal': { done: `Killed terminal`, proposed: 'Kill terminal', running: loadingTitleWrapper('Killing terminal') },

	'read_lint_errors': { done: `Read lint errors`, proposed: 'Read lint errors', running: loadingTitleWrapper('Reading lint errors') },
	'search_in_file': { done: 'Searched in file', proposed: 'Search in file', running: loadingTitleWrapper('Searching in file') },
} as const satisfies Record<BuiltinToolName, { done: any, proposed: any, running: any }>


const getTitle = (toolMessage: Pick<ChatMessage & { role: 'tool' }, 'name' | 'type' | 'mcpServerName'>): React.ReactNode => {
	const t = toolMessage

	// non-built-in title
	if (!builtinToolNames.includes(t.name as BuiltinToolName)) {
		// descriptor of Running or Ran etc
		const descriptor =
			t.type === 'success' ? 'Called'
				: t.type === 'running_now' ? 'Calling'
					: t.type === 'tool_request' ? 'Call'
						: t.type === 'rejected' ? 'Call'
							: t.type === 'invalid_params' ? 'Call'
								: t.type === 'tool_error' ? 'Call'
									: 'Call'


		const title = `${descriptor} ${toolMessage.mcpServerName || 'MCP'}`
		if (t.type === 'running_now' || t.type === 'tool_request')
			return loadingTitleWrapper(title)
		return title
	}

	// built-in title
	else {
		const toolName = t.name as BuiltinToolName
		if (t.type === 'success') return titleOfBuiltinToolName[toolName].done
		if (t.type === 'running_now') return titleOfBuiltinToolName[toolName].running
		return titleOfBuiltinToolName[toolName].proposed
	}
}


const toolNameToDesc = (toolName: BuiltinToolName, _toolParams: BuiltinToolCallParams[BuiltinToolName] | undefined, accessor: ReturnType<typeof useAccessor>): {
	desc1: React.ReactNode,
	desc1Info?: string,
} => {

	if (!_toolParams) {
		return { desc1: '', };
	}

	const x = {
		'read_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'ls_dir': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['ls_dir']
			return {
				desc1: getFolderName(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'search_pathnames_only': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_pathnames_only']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		'search_for_files': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_for_files']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		'search_in_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_in_file'];
			return {
				desc1: `"${toolParams.query}"`,
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'create_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['create_file_or_folder']
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'delete_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['delete_file_or_folder']
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'rewrite_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['rewrite_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'edit_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['edit_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'run_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		'run_persistent_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_persistent_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		'open_persistent_terminal': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['open_persistent_terminal']
			return { desc1: '' }
		},
		'kill_persistent_terminal': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['kill_persistent_terminal']
			return { desc1: toolParams.persistentTerminalId }
		},
		'get_dir_tree': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['get_dir_tree']
			return {
				desc1: getFolderName(toolParams.uri.fsPath) ?? '/',
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'read_lint_errors': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_lint_errors']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		}
	}

	try {
		return x[toolName]?.() || { desc1: '' }
	}
	catch {
		return { desc1: '' }
	}
}

const ToolRequestAcceptRejectButtons = ({ toolName }: { toolName: ToolName }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')
	const metricsService = accessor.get('IMetricsService')
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const beamSettingsState = useSettingsState()

	const onAccept = useCallback(() => {
		try { // this doesn't need to be wrapped in try/catch anymore
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.approveLatestToolRequest(threadId)
			metricsService.capture('Tool Request Accepted', {})
		} catch (e) { console.error('Error while approving message in chat:', e) }
	}, [chatThreadsService, metricsService])

	const onReject = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.rejectLatestToolRequest(threadId)
		} catch (e) { console.error('Error while approving message in chat:', e) }
		metricsService.capture('Tool Request Rejected', {})
	}, [chatThreadsService, metricsService])

	const approveButton = (
		<button
			onClick={onAccept}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-background)]
                text-[var(--vscode-button-foreground)]
                hover:bg-[var(--vscode-button-hoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Approve
		</button>
	)

	const cancelButton = (
		<button
			onClick={onReject}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-secondaryBackground)]
                text-[var(--vscode-button-secondaryForeground)]
                hover:bg-[var(--vscode-button-secondaryHoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Cancel
		</button>
	)

	const approvalType = isABuiltinToolName(toolName) ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools'
	const approvalToggle = approvalType ? <div key={approvalType} className="flex items-center ml-2 gap-x-1">
		<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
	</div> : null

	return <div className="flex gap-2 mx-0.5 items-center">
		{approveButton}
		{cancelButton}
		{approvalToggle}
	</div>
}

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



const EditToolChildren = ({ uri, code, type }: { uri: URI | undefined, code: string, type: 'diff' | 'rewrite' }) => {

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


const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[] }) => {
	return <div className="text-xs text-beam-fg-4 opacity-80 border-l-2 border-beam-warning px-2 py-0.5 flex flex-col gap-0.5 overflow-x-auto whitespace-nowrap">
		{lintErrors.map((error, i) => (
			<div key={i}>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
		))}
	</div>
}

const BottomChildren = ({ children, title }: { children: React.ReactNode, title: string }) => {
	const [isOpen, setIsOpen] = useState(false);
	if (!children) return null;
	return (
		<div className="w-full px-2 mt-0.5">
			<div
				className={`flex items-center cursor-pointer select-none transition-colors duration-150 pl-0 py-0.5 rounded group`}
				onClick={() => setIsOpen(o => !o)}
				style={{ background: 'none' }}
			>
				<ChevronRight
					className={`mr-1 h-3 w-3 flex-shrink-0 transition-transform duration-100 text-beam-fg-4 group-hover:text-beam-fg-3 ${isOpen ? 'rotate-90' : ''}`}
				/>
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


const EditToolHeaderButtons = ({ applyBoxId, uri, codeStr, toolName, threadId }: { threadId: string, applyBoxId: string, uri: URI, codeStr: string, toolName: 'edit_file' | 'rewrite_file' }) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri })
	return <div className='flex items-center gap-1'>
		{/* <StatusIndicatorForApplyButton applyBoxId={applyBoxId} uri={uri} /> */}
		{/* <JumpToFileButton uri={uri} /> */}
		{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName='Copy' />}
		<EditToolAcceptRejectButtonsHTML type={toolName} codeStr={codeStr} applyBoxId={applyBoxId} uri={uri} threadId={threadId} />
	</div>
}



const InvalidTool = ({ toolName, message, mcpServerName }: { toolName: ToolName, message: string, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'invalid_params', mcpServerName })
	const desc1 = 'Invalid parameters'
	const icon = null
	const isError = true
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon }

	componentParams.children = <ToolChildrenWrapper>
		<CodeChildren className='bg-beam-bg-3'>
			{message}
		</CodeChildren>
	</ToolChildrenWrapper>
	return <ToolHeaderWrapper {...componentParams} />
}

const CanceledTool = ({ toolName, mcpServerName }: { toolName: ToolName, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'rejected', mcpServerName })
	const desc1 = ''
	const icon = null
	const isRejected = true
	const componentParams: ToolHeaderParams = { title, desc1, icon, isRejected }
	return <ToolHeaderWrapper {...componentParams} />
}

const TerminalToolCard = ({
	command,
	commandLabel,
	children,
	isOpenDefault,
	isError,
	isRejected,
	terminalName,
	footer,
}: {
	command: string;
	commandLabel: string;
	children: React.ReactNode;
	isOpenDefault?: boolean;
	isError?: boolean;
	isRejected?: boolean;
	terminalName?: string;
	footer?: React.ReactNode;
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


const CommandTool = ({ toolMessage, type, threadId }: { threadId: string } & ({
	toolMessage: Exclude<ToolMessage<'run_command'>, { type: 'invalid_params' }>
	type: 'run_command'
} | {
	toolMessage: Exclude<ToolMessage<'run_persistent_command'>, { type: 'invalid_params' }>
	type: | 'run_persistent_command'
})) => {
	const accessor = useAccessor()

	const terminalToolsService = accessor.get('ITerminalToolService')
	const toolsService = accessor.get('IToolsService')
	const streamState = useChatThreadsStreamState(threadId)

	const divRef = useRef<HTMLDivElement | null>(null)

	const isRejected = toolMessage.type === 'rejected'
	const { params } = toolMessage


	const effect = async (isDisposed: () => boolean) => {
		if (streamState?.isRunning !== 'tool') return
		if (type !== 'run_command' || toolMessage.type !== 'running_now') return;

		// wait for the interruptor so we know it's running

		await streamState?.interrupt
		if (isDisposed()) return
		const container = divRef.current;
		if (!container) return;

		const terminal = terminalToolsService.getTemporaryTerminal(toolMessage.params.terminalId);
		if (!terminal) return;
		if (isDisposed()) return

		try {
			terminal.attachToElement(container);
			terminal.setVisible(true)
		} catch {
		}

		// Listen for size changes of the container and keep the terminal layout in sync.
		const resizeObserver = new ResizeObserver((entries) => {
			const height = entries[0].borderBoxSize[0].blockSize;
			const width = entries[0].borderBoxSize[0].inlineSize;
			if (typeof terminal.layout === 'function') {
				terminal.layout({ width, height });
			}
		});

		resizeObserver.observe(container);
		return () => { terminal.detachFromElement(); resizeObserver?.disconnect(); }
	}

	useEffect(() => {
		let disposed = false
		let cleanup: (() => void) | undefined
		void effect(() => disposed).then(cleanupFn => {
			if (disposed) {
				cleanupFn?.()
				return
			}
			cleanup = cleanupFn
		})
		return () => {
			disposed = true
			cleanup?.()
		}
	}, [streamState?.interrupt, streamState?.isRunning, terminalToolsService, toolMessage, toolMessage.type, type]);

	const command = params.command
	const commandLabel = getCommandLabel(command)
	const terminalName = type === 'run_persistent_command' ? persistentTerminalNameOfId((params as BuiltinToolCallParams['run_persistent_command']).persistentTerminalId) : undefined
	let output: React.ReactNode = null
	let footer: React.ReactNode = null
	let forceOpen = false

	if (toolMessage.type === 'success') {
		const { result } = toolMessage

		let msg: string
		if (type === 'run_command') msg = toolsService.stringOfResult['run_command'](toolMessage.params, result)
		else msg = toolsService.stringOfResult['run_persistent_command'](toolMessage.params, result)

		const exitCode = type === 'run_command' ? (result as any)?.exitCode : undefined
		footer = <span className='flex items-center gap-1.5 text-xs'>
			{exitCode !== undefined && <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${exitCode === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
				{exitCode === 0 ? '✓' : '✗'} {exitCode}
			</span>}
		</span>

		output = <pre className='@@beam-terminal-output !select-text overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-5'>{msg.trim()}</pre>
	}
	else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		output = <pre className='@@beam-terminal-output !select-text overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-5'>{result}</pre>
	}
	else if (toolMessage.type === 'running_now') {
		forceOpen = true
		footer = <span className='flex items-center gap-1 text-xs text-beam-fg-4'>Command in progress<IconLoading className='w-3' /></span>
		if (type === 'run_command') {
			output = <>
				<div className='flex items-center gap-1 px-3 py-2 text-xs text-beam-fg-4'>
					<span>Waiting for terminal output</span>
					<IconLoading className='w-3' />
				</div>
				<div ref={divRef} className='relative h-[260px] overflow-hidden bg-beam-bg-1 text-sm' />
			</>
		}
		else {
			output = <div className='flex items-center gap-1 px-3 py-2 text-xs text-beam-fg-4'>
				<span>Persistent terminal command is running</span>
				<IconLoading className='w-3' />
			</div>
		}
	}
	else if (toolMessage.type === 'rejected' || toolMessage.type === 'tool_request') {
	}

	return <TerminalToolCard
		command={command}
		commandLabel={commandLabel}
		isOpenDefault={forceOpen}
		isError={toolMessage.type === 'tool_error'}
		isRejected={isRejected}
		terminalName={terminalName}
		footer={footer}
	>
		{output}
	</TerminalToolCard>
}

type WrapperProps<T extends ToolName> = { toolMessage: Exclude<ToolMessage<T>, { type: 'invalid_params' }>, messageIdx: number, threadId: string }
const MCPToolWrapper = ({ toolMessage }: WrapperProps<string>) => {
	const accessor = useAccessor()
	const mcpService = accessor.get('IMCPService')

	const title = getTitle(toolMessage)
	const desc1 = removeMCPToolNamePrefix(toolMessage.name)
	const icon = null


	if (toolMessage.type === 'running_now') return null // do not show running

	const isError = false
	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon, isRejected, }

	const paramsStr = JSON.stringify(params, null, 2)
	componentParams.desc2 = <CopyButton codeStr={paramsStr} toolTipName={`Copy inputs: ${paramsStr}`} />

	componentParams.info = !toolMessage.mcpServerName ? 'MCP tool not found' : undefined

	// Add copy inputs button in desc2


	if (toolMessage.type === 'success' || toolMessage.type === 'tool_request') {
		const { result } = toolMessage
		const resultStr = result ? mcpService.stringifyResult(result) : 'null'
		componentParams.children = <ToolChildrenWrapper>
			<SmallProseWrapper>
				<ChatMarkdownRender
					string={`\`\`\`json\n${resultStr}\n\`\`\``}
					chatMessageLocation={undefined}
					isApplyEnabled={false}
					isLinkDetectionEnabled={true}
				/>
			</SmallProseWrapper>
		</ToolChildrenWrapper>
	}
	else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>
	}

	return <ToolHeaderWrapper {...componentParams} />

}

type ResultWrapper<T extends ToolName> = (props: WrapperProps<T>) => React.ReactNode

const builtinToolNameToComponent: { [T in BuiltinToolName]: { resultWrapper: ResultWrapper<T>, } } = {
	'read_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage

			let range: [number, number] | undefined = undefined
			let lineDetail: React.ReactNode = undefined
			if (toolMessage.params.startLine !== null || toolMessage.params.endLine !== null) {
				const start = toolMessage.params.startLine === null ? `1` : `${toolMessage.params.startLine}`
				const end = toolMessage.params.endLine === null ? `` : `${toolMessage.params.endLine}`
				lineDetail = `lines ${start}-${end}`
				range = [params.startLine || 1, params.endLine || 1]
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				let detail: React.ReactNode = lineDetail
				if (result.hasNextPage && params.pageNumber === 1)  // first page
					detail = <> {lineDetail ? <>{lineDetail} · </> : null}truncated after {Math.round(MAX_FILE_CHARS_PAGE) / 1000}k</>
				else if (params.pageNumber > 1) // subsequent pages
					detail = <> {lineDetail ? <>{lineDetail} · </> : null}part {params.pageNumber}</>

				return <ToolActivityRow
					verb='Read'
					uri={params.uri}
					accessor={accessor}
					range={range}
					detail={detail}
					isRejected={isRejected}
				/>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				return <ToolActivityRow
					verb='Read'
					uri={params.uri}
					accessor={accessor}
					range={range}
					detail={lineDetail}
					isError={true}
					isRejected={isRejected}
				>
					<CodeChildren>
						{result}
					</CodeChildren>
				</ToolActivityRow>
			}

			return <ToolActivityRow verb='Read' uri={params.uri} accessor={accessor} range={range} detail={lineDetail} isRejected={isRejected} />
		},
	},
	'get_dir_tree': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				return <ToolActivityRow verb='Analyzed' uri={params.uri} isFolder={true} accessor={accessor} isRejected={isRejected}>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={`\`\`\`\n${result.str}\n\`\`\``}
							chatMessageLocation={undefined}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true}
						/>
					</SmallProseWrapper>
				</ToolActivityRow>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				return <ToolActivityRow verb='Analyzed' uri={params.uri} isFolder={true} accessor={accessor} isError={true} isRejected={isRejected}>
					<CodeChildren>
						{result}
					</CodeChildren>
				</ToolActivityRow>
			}

			return <ToolActivityRow verb='Analyzed' uri={params.uri} isFolder={true} accessor={accessor} isRejected={isRejected} />

		}
	},
	'ls_dir': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				const count = result.children?.length ?? 0
				return <ToolActivityRow
					verb='Analyzed'
					uri={params.uri}
					isFolder={true}
					accessor={accessor}
					detail={`${count}${result.hasNextPage ? '+' : ''} item${count === 1 ? '' : 's'}`}
					isRejected={isRejected}
				>
					{!result.children || result.children.length === 0 ? null : <>
						{result.children.map((child, i) => (
							<ToolActivityListItem
								key={i}
								uri={child.uri}
								isFolder={child.isDirectory}
								label={`${child.name}${child.isDirectory ? '/' : ''}`}
								accessor={accessor}
							/>
						))}
						{result.hasNextPage &&
							<div className='pl-[14px] py-0.5 text-xs text-beam-fg-4'>Results truncated ({result.itemsRemaining} remaining).</div>
						}
					</>}
				</ToolActivityRow>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				return <ToolActivityRow verb='Analyzed' uri={params.uri} isFolder={true} accessor={accessor} isError={true} isRejected={isRejected}>
					<CodeChildren>
						{result}
					</CodeChildren>
				</ToolActivityRow>
			}

			return <ToolActivityRow verb='Analyzed' uri={params.uri} isFolder={true} accessor={accessor} isRejected={isRejected} />
		}
	},
	'search_pathnames_only': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return <SearchToolCard query={params.query} scope={params.includePattern ?? undefined} isSearching={true} isRejected={isRejected} />

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				return <SearchToolCard
					query={params.query}
					scope={params.includePattern ?? undefined}
					results={result.uris}
					hasNextPage={result.hasNextPage}
					isRejected={isRejected}
				/>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				return <SearchToolCard query={params.query} scope={params.includePattern ?? undefined} isError={true} isRejected={isRejected}>
					<CodeChildren>
						{result}
					</CodeChildren>
				</SearchToolCard>
			}

			return <SearchToolCard query={params.query} scope={params.includePattern ?? undefined} isRejected={isRejected} />
		}
	},
	'search_for_files': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage
			const scope = params.searchInFolder ? getRelative(params.searchInFolder, accessor) : undefined

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isSearching={true} isRejected={isRejected} />

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				return <SearchToolCard
					query={`${params.isRegex ? 'regex ' : ''}${params.query}`}
					scope={scope}
					results={result.uris}
					hasNextPage={result.hasNextPage}
					isRejected={isRejected}
				/>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isError={true} isRejected={isRejected}>
					<CodeChildren>
						{result}
					</CodeChildren>
				</SearchToolCard>
			}
			return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isRejected={isRejected} />
		}
	},

	'search_in_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const isRejected = toolMessage.type === 'rejected'
			const { params } = toolMessage;
			const scope = getRelative(params.uri, accessor)

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isSearching={true} isRejected={isRejected} />

			if (toolMessage.type === 'success') {
				const { result } = toolMessage; // result is array of snippets
				return <SearchToolCard
					query={`${params.isRegex ? 'regex ' : ''}${params.query}`}
					scope={scope}
					lines={result.lines.map(line => ({ uri: params.uri, line }))}
					isRejected={isRejected}
				/>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isError={true} isRejected={isRejected}>
					<CodeChildren>
						{result}
					</CodeChildren>
				</SearchToolCard>
			}

			return <SearchToolCard query={`${params.isRegex ? 'regex ' : ''}${params.query}`} scope={scope} isRejected={isRejected} />;
		}
	},

	'read_lint_errors': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')

			const title = getTitle(toolMessage)

			const { uri } = toolMessage.params ?? {}
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }

			componentParams.info = getRelative(uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
				if (result.lintErrors)
					componentParams.children = <LintErrorChildren lintErrors={result.lintErrors} />
				else
					componentParams.children = `No lint errors found.`

			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				// JumpToFileButton removed in favor of FileLinkText
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},

	// ---

	'create_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null


			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }

			componentParams.info = getRelative(params.uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				if (params) { componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) } }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}
			else if (toolMessage.type === 'running_now') {
				// nothing more is needed
			}
			else if (toolMessage.type === 'tool_request') {
				// nothing more is needed
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'delete_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isFolder = toolMessage.params?.isFolder ?? false
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }

			componentParams.info = getRelative(params.uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				if (params) { componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) } }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}
			else if (toolMessage.type === 'running_now') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_request') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'rewrite_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.newContent} />
		}
	},
	'edit_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.searchReplaceBlocks} />
		}
	},

	// ---

	'run_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_command' />
		}
	},

	'run_persistent_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_persistent_command' />
		}
	},
	'open_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const terminalToolsService = accessor.get('ITerminalToolService')

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const title = getTitle(toolMessage)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }

			const relativePath = params.cwd ? getRelative(URI.file(params.cwd), accessor) : ''
			componentParams.info = relativePath ? `Running in ${relativePath}` : undefined

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				const { persistentTerminalId } = result
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId)
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
	'kill_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const terminalToolsService = accessor.get('ITerminalToolService')

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const title = getTitle(toolMessage)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests
			if (toolMessage.type === 'running_now') return null // do not show running

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }

			if (toolMessage.type === 'success') {
				const { persistentTerminalId } = params
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId)
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
};


const Checkpoint = ({ message, threadId, messageIdx, isCheckpointGhost, threadIsRunning }: { message: CheckpointEntry, threadId: string; messageIdx: number, isCheckpointGhost: boolean, threadIsRunning: boolean }) => {
	const accessor = useAccessor()
	const chatThreadService = accessor.get('IChatThreadService')
	const streamState = useFullChatThreadsStreamState()

	const isRunning = useChatThreadsStreamState(threadId)?.isRunning
	const isDisabled = useMemo(() => {
		if (isRunning) return true
		return !!Object.keys(streamState).find((threadId2) => streamState[threadId2]?.isRunning)
	}, [isRunning, streamState])

	return <div
		className={`flex items-center justify-center px-2 `}
	>
		<div
			className={`
                    text-xs
                    text-beam-fg-3
                    select-none
                    ${isCheckpointGhost ? 'opacity-50' : 'opacity-100'}
					${isDisabled ? 'cursor-default' : 'cursor-pointer'}
                `}
			style={{ position: 'relative', display: 'inline-block' }} // allow absolute icon
			onClick={() => {
				if (threadIsRunning) return
				if (isDisabled) return
				chatThreadService.jumpToCheckpointBeforeMessageIdx({
					threadId,
					messageIdx,
					jumpToUserModified: messageIdx === (chatThreadService.state.allThreads[threadId]?.messages.length ?? 0) - 1
				})
			}}
			{...isDisabled ? {
				'data-tooltip-id': 'beam-tooltip',
				'data-tooltip-content': `Disabled ${isRunning ? 'when running' : 'because another thread is running'}`,
				'data-tooltip-place': 'top',
			} : {}}
		>
			Checkpoint
		</div>
	</div>
}

const TaskPlanProgress = ({ taskPlan }: { taskPlan: TaskPlan }) => {
	const [isOpen, setIsOpen] = useState(true)

	if (!taskPlan?.steps?.length) return null

	const currentStepIndex = Math.max(taskPlan.currentStepIndex ?? 0, 0)
	const steps = taskPlan.steps.map((step, idx) => {
		const status = step.status ?? (idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'in_progress' : 'pending')
		return {
			...step,
			id: step.id || `task-step-${taskPlan.createdAt}-${idx}`,
			description: step.description || [step.action, step.target].filter(Boolean).join(': ') || `Step ${idx + 1}`,
			status,
			toolCalls: step.toolCalls ?? [],
		}
	})
	const completedSteps = steps.filter(s => s.status === 'complete').length
	const totalSteps = steps.length
	const nextStepIndex = steps.findIndex(step => step.status === 'in_progress' || step.status === 'pending' || step.status === 'failed')
	const lastCompletedIndex = Math.max(...steps.map((step, idx) => step.status === 'complete' ? idx : -1))
	const collapsedIndexes = completedSteps === 0
		? steps.map((_, idx) => idx)
		: Array.from(new Set([lastCompletedIndex, nextStepIndex].filter(idx => idx >= 0)))
	const visibleIndexes = isOpen ? steps.map((_, idx) => idx) : collapsedIndexes
	const hiddenCount = Math.max(0, steps.length - visibleIndexes.length)

	return (
		<div className='@@beam-plan-card @@beam-task-plan @@beam-message-enter mt-2 w-[min(100%,620px)] overflow-hidden rounded-md border border-beam-border-2 bg-beam-bg-2'>
			<button
				type='button'
				className='flex w-full items-center gap-1 px-1 py-1 text-left'
				onClick={() => setIsOpen(v => !v)}
			>
				<span className='truncate text-xs text-beam-fg-3'>
						{completedSteps} / {totalSteps} tasks done
				</span>
				<ChevronRight className={`size-3 shrink-0 text-beam-fg-4 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
			</button>

			<div className='px-2 pb-2'>
				<div className='@@beam-task-plan-list overflow-hidden rounded-md border border-beam-border-3 bg-beam-bg-3 px-2 py-1.5'>
					{visibleIndexes.map((safeStepIndex) => {
						const step = steps[safeStepIndex]
						const isCurrent = step.status === 'in_progress' || (safeStepIndex === currentStepIndex && step.status !== 'complete' && step.status !== 'failed')
						const isStepComplete = step.status === 'complete'
						const isFailed = step.status === 'failed'

						return (
							<div
								key={step.id || `task-step-${taskPlan.createdAt}-${safeStepIndex}`}
								className={`flex items-start gap-2 rounded px-0 py-1 text-xs ${isFailed ? 'text-red-400' :
									isCurrent ? 'font-medium text-beam-fg-1' :
										isStepComplete ? 'text-beam-fg-3' : 'text-beam-fg-4 opacity-85'
									}`}
							>
								<span className='mt-0.5 flex size-3.5 shrink-0 items-center justify-center'>
									{isStepComplete ? <span className='@@beam-plan-step-done'><Check className='size-2.5' /></span> :
										isFailed ? <X className='size-3' /> :
											isCurrent ? <span className='@@beam-plan-step-current'>{safeStepIndex + 1}</span> :
												<span className='@@beam-plan-step-pending' />}
								</span>
								<span className={isCurrent ? 'font-medium' : ''}>
									{step.description}
								</span>
							</div>
						)
					})}
					{!isOpen && hiddenCount > 0 && (
						<div className='pl-5 text-xs text-beam-fg-4'>
							{hiddenCount} more
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

const AgentEventIcon = ({ type }: { type: AgentEventType }) => {
	if (type === 'error') return <AlertTriangle className='size-3 text-beam-warning' />
	if (type === 'success' || type === 'plan_step_completed') return <Check className='size-3 text-beam-accent' />
	if (type === 'file_edit') return <Pencil className='size-3 text-[color:var(--beam-tool-write)]' />
	if (type === 'terminal') return <Terminal className='size-3 text-[color:var(--beam-tool-terminal)]' />
	if (type === 'tool_call' || type === 'tool_result') return <Dot className='size-3 text-beam-accent' />
	if (type === 'diagnostic' || type === 'fix') return <Info className='size-3 text-[color:var(--beam-tool-search)]' />
	return <Dot className='size-3 text-beam-fg-4' />
}

const formatDuration = (durationMs: number | undefined) => {
	if (durationMs === undefined) return null
	return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
}

const AgentEventRow = ({ event }: { event: AgentEvent }) => {
	const duration = formatDuration(event.durationMs)
	return <div className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs ${event.type === 'error' ? 'text-beam-warning' : 'text-beam-fg-4'}`}>
		<AgentEventIcon type={event.type} />
		<div className='min-w-0 flex-1'>
			<div className='truncate text-beam-fg-3'>{event.title}</div>
			{event.summary && <div className='truncate text-beam-fg-4'>{event.summary}</div>}
		</div>
		{duration && <span className='shrink-0 text-[10px] text-beam-fg-4'>{duration}</span>}
	</div>
}

const AgentRunTimeline = ({ threadId, userMessageIndex }: { threadId: string; userMessageIndex: number }) => {
	const run = useAgentRun(threadId, userMessageIndex)
	const [isOpen, setIsOpen] = useState(true)

	useEffect(() => {
		if (run?.status === 'running' || run?.status === 'awaiting_user') setIsOpen(true)
	}, [run?.status])

	if (!run || (run.events.length === 0 && !run.taskPlan)) return null

	const isRunning = run.status === 'running'
	const isFailed = run.status === 'failed'
	const isAwaitingUser = run.status === 'awaiting_user'
	const completedEvents = run.events.filter(event => event.type === 'tool_result' || event.type === 'file_edit' || event.type === 'success').length
	const label = isAwaitingUser
		? 'Waiting for approval'
		: isRunning
			? 'Working'
			: isFailed
				? 'Stopped'
				: `${completedEvents || run.events.length} actions completed`

	return <div className='@@beam-agent-run mt-2 w-[min(100%,520px)] overflow-hidden rounded-md border border-beam-border-2 bg-beam-bg-2'>
		<button
			type='button'
			className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left'
			onClick={() => setIsOpen(v => !v)}
		>
			<div className='flex min-w-0 items-center gap-2'>
				<ChevronRight className={`size-3 shrink-0 text-beam-fg-3 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
				{isRunning ? <span className='size-1.5 shrink-0 rounded-full bg-beam-accent @@beam-pulse-dot' /> :
					isFailed ? <AlertTriangle className='size-3 shrink-0 text-beam-warning' /> :
						<Check className='size-3 shrink-0 text-beam-accent' />}
				<span className='truncate text-sm font-medium text-beam-fg-1'>{label}</span>
			</div>
			<span className='shrink-0 rounded bg-beam-bg-1 px-1.5 py-0.5 text-xs text-beam-fg-3'>
				{run.events.length} event{run.events.length === 1 ? '' : 's'}
			</span>
		</button>
		{isOpen && <div className='border-t border-beam-border-3 px-3 py-2'>
			{run.taskPlan && <TaskPlanProgress taskPlan={run.taskPlan} />}
			<div className='mt-1 space-y-0.5'>
				{run.events.map(event => <AgentEventRow key={event.id} event={event} />)}
			</div>
		</div>}
	</div>
}

interface ChatBubbleProps {
	threadId: string;
	chatMessage: ChatMessage;
	currCheckpointIdx: number | null | undefined;
	isCommitted: boolean;
	messageIdx: number;
	chatIsRunning: IsRunningType;
	_scrollToBottom: (() => void) | null;
}

const ChatBubble = (props: ChatBubbleProps) => {
	return <ErrorBoundary>
		<_ChatBubble {...props} />
	</ErrorBoundary>
}

const _ChatBubble = ({ threadId, chatMessage, currCheckpointIdx, isCommitted, messageIdx, chatIsRunning, _scrollToBottom }: ChatBubbleProps) => {
	const role = chatMessage.role

	const isCheckpointGhost = messageIdx > (currCheckpointIdx ?? Infinity) && !chatIsRunning // whether to show as gray (if chat is running, for good measure just dont show any ghosts)

	if (role === 'user') {
		return <>
			<UserMessageComponent
				chatMessage={chatMessage}
				isCheckpointGhost={isCheckpointGhost}
				currCheckpointIdx={currCheckpointIdx}
				messageIdx={messageIdx}
				_scrollToBottom={_scrollToBottom}
			/>
			<AgentRunTimeline threadId={threadId} userMessageIndex={messageIdx} />
		</>
	}
	else if (role === 'assistant') {
		return <AssistantMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			messageIdx={messageIdx}
			isCommitted={isCommitted}
		/>
	}
	else if (role === 'tool') {

		if (chatMessage.type === 'invalid_params') {
			return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<InvalidTool toolName={chatMessage.name} message={chatMessage.content} mcpServerName={chatMessage.mcpServerName} />
			</div>
		}

		const toolName = chatMessage.name
		const isBuiltInTool = isABuiltinToolName(toolName)
		const ToolResultWrapper = isBuiltInTool ? builtinToolNameToComponent[toolName]?.resultWrapper as ResultWrapper<ToolName>
			: MCPToolWrapper as ResultWrapper<ToolName>

		if (ToolResultWrapper)
			return <>
				<div className={`@@beam-tool-enter ${toolAccentClass(toolName)} ${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<ToolResultWrapper
						toolMessage={chatMessage}
						messageIdx={messageIdx}
						threadId={threadId}
					/>
				</div>
				{chatMessage.type === 'tool_request' ?
					<div className={`${isCheckpointGhost ? 'opacity-50 pointer-events-none' : ''}`}>
						<ToolRequestAcceptRejectButtons toolName={chatMessage.name} />
					</div> : null}
			</>
		return null
	}

	else if (role === 'interrupted_streaming_tool') {
		return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
			<CanceledTool toolName={chatMessage.name} mcpServerName={chatMessage.mcpServerName} />
		</div>
	}

	else if (role === 'checkpoint') {
		return <Checkpoint
			threadId={threadId}
			message={chatMessage}
			messageIdx={messageIdx}
			isCheckpointGhost={isCheckpointGhost}
			threadIsRunning={!!chatIsRunning}
		/>
	}

}

const CommandBarInChat = () => {
	const { stateOfURI: commandBarStateOfURI, sortedURIs: sortedCommandBarURIs } = useCommandBarState()
	const numFilesChanged = sortedCommandBarURIs.length

	const accessor = useAccessor()
	const editCodeService = accessor.get('IEditCodeService')
	const commandService = accessor.get('ICommandService')
	const chatThreadsState = useChatThreadsState()
	const commandBarState = useCommandBarState()
	const chatThreadsStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)

	// (
	// 	<IconShell1
	// 		Icon={CopyIcon}
	// 		onClick={copyChatToClipboard}
	// 		data-tooltip-id='beam-tooltip'
	// 		data-tooltip-place='top'
	// 		data-tooltip-content='Copy chat JSON'
	// 	/>
	// )

	const [fileDetailsOpenedState, setFileDetailsOpenedState] = useState<'auto-opened' | 'auto-closed' | 'user-opened' | 'user-closed'>('auto-closed');
	const isFileDetailsOpened = fileDetailsOpenedState === 'auto-opened' || fileDetailsOpenedState === 'user-opened';


	useEffect(() => {
		// close the file details if there are no files
		// this converts 'user-closed' to 'auto-closed'
		if (numFilesChanged === 0) {
			setFileDetailsOpenedState('auto-closed')
		}
		// open the file details if it hasnt been closed
		if (numFilesChanged > 0 && fileDetailsOpenedState !== 'user-closed') {
			setFileDetailsOpenedState('auto-opened')
		}
	}, [fileDetailsOpenedState, setFileDetailsOpenedState, numFilesChanged])


	const isFinishedMakingThreadChanges = (
		// there are changed files
		commandBarState.sortedURIs.length !== 0
		// none of the files are streaming
		&& commandBarState.sortedURIs.every(uri => !commandBarState.stateOfURI[uri.fsPath]?.isStreaming)
	)

	// ======== status of agent ========
	// This icon answers the question "is the LLM doing work on this thread?"
	// assume it is single threaded for now
	// green = Running
	// orange = Requires action
	// dark = Done

	const threadStatus = (
		chatThreadsStreamState?.isRunning === 'awaiting_user' ? { title: 'Needs Approval', color: 'yellow', } as const
			: chatThreadsStreamState?.isRunning ? { title: 'Running', color: 'orange', } as const
				: { title: 'Done', color: 'dark', } as const
	)


	const threadStatusHTML = <StatusIndicator className='mx-1' indicatorColor={threadStatus.color} title={threadStatus.title} />


	// ======== info about changes ========
	// num files changed
	// acceptall + rejectall
	// popup info about each change (each with num changes + acceptall + rejectall of their own)

	const numFilesChangedStr = numFilesChanged === 0 ? 'No files with changes'
		: `${sortedCommandBarURIs.length} file${numFilesChanged === 1 ? '' : 's'} with changes`




	const acceptRejectAllButtons = <div
		// do this with opacity so that the height remains the same at all times
		className={`flex items-center gap-0.5
			${isFinishedMakingThreadChanges ? '' : 'opacity-0 pointer-events-none'}`
		}
	>
		<IconShell1 // RejectAllButtonWrapper
			// text="Reject All"
			// className="text-xs"
			Icon={X}
			onClick={() => {
				sortedCommandBarURIs.forEach(uri => {
					editCodeService.acceptOrRejectAllDiffAreas({
						uri,
						removeCtrlKs: true,
						behavior: "reject",
						_addToHistory: true,
					});
				});
			}}
			data-tooltip-id='beam-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Reject all'
		/>

		<IconShell1 // AcceptAllButtonWrapper
			// text="Accept All"
			// className="text-xs"
			Icon={Check}
			onClick={() => {
				sortedCommandBarURIs.forEach(uri => {
					editCodeService.acceptOrRejectAllDiffAreas({
						uri,
						removeCtrlKs: true,
						behavior: "accept",
						_addToHistory: true,
					});
				});
			}}
			data-tooltip-id='beam-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Accept all'
		/>



	</div>


	// !select-text cursor-auto
	const fileDetailsContent = <div className="px-2 gap-1 w-full overflow-y-auto">
		{sortedCommandBarURIs.map((uri, i) => {
			const basename = getBasename(uri.fsPath)

			const { sortedDiffIds, isStreaming } = commandBarStateOfURI[uri.fsPath] ?? {}
			const isFinishedMakingFileChanges = !isStreaming

			const numDiffs = sortedDiffIds?.length || 0

			const fileStatus = (isFinishedMakingFileChanges
				? { title: 'Done', color: 'dark', } as const
				: { title: 'Running', color: 'orange', } as const
			)

			const fileNameHTML = <div
				className="flex items-center gap-1.5 text-beam-fg-3 hover:brightness-125 transition-all duration-200 cursor-pointer"
				onClick={() => voidOpenFileFn(uri, accessor)}
			>
				{/* <FileIcon size={14} className="text-beam-fg-3" /> */}
				<span className="text-beam-fg-3">{basename}</span>
			</div>




			const detailsContent = <div className='flex px-4'>
				<span className="text-beam-fg-3 opacity-80">{numDiffs} diff{numDiffs !== 1 ? 's' : ''}</span>
			</div>

			const acceptRejectButtons = <div
				// do this with opacity so that the height remains the same at all times
				className={`flex items-center gap-0.5
					${isFinishedMakingFileChanges ? '' : 'opacity-0 pointer-events-none'}
				`}
			>
				{/* <JumpToFileButton
					uri={uri}
					data-tooltip-id='beam-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Go to file'
				/> */}
				<IconShell1 // RejectAllButtonWrapper
					Icon={X}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "reject", _addToHistory: true, }); }}
					data-tooltip-id='beam-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Reject file'

				/>
				<IconShell1 // AcceptAllButtonWrapper
					Icon={Check}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "accept", _addToHistory: true, }); }}
					data-tooltip-id='beam-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Accept file'
				/>

			</div>

			const fileStatusHTML = <StatusIndicator className='mx-1' indicatorColor={fileStatus.color} title={fileStatus.title} />

			return (
				// name, details
				<div key={i} className="flex justify-between items-center">
					<div className="flex items-center">
						{fileNameHTML}
						{detailsContent}
					</div>
					<div className="flex items-center gap-2">
						{acceptRejectButtons}
						{fileStatusHTML}
					</div>
				</div>
			)
		})}
	</div>

	const fileDetailsButton = (
		<button
			className={`flex items-center gap-1 rounded ${numFilesChanged === 0 ? 'cursor-pointer' : 'cursor-pointer hover:brightness-125 transition-all duration-200'}`}
			onClick={() => isFileDetailsOpened ? setFileDetailsOpenedState('user-closed') : setFileDetailsOpenedState('user-opened')}
			type='button'
			disabled={numFilesChanged === 0}
		>
			<svg
				className="transition-transform duration-200 size-3.5"
				style={{
					transform: isFileDetailsOpened ? 'rotate(0deg)' : 'rotate(180deg)',
					transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
				}}
				xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline>
			</svg>
			{numFilesChangedStr}
		</button>
	)

	return (
		<>
			{/* file details */}
			<div className='px-2'>
				<div
					className={`
						select-none
						flex w-full rounded-t-lg bg-beam-bg-3
						text-beam-fg-3 text-xs text-nowrap

						overflow-hidden transition-all duration-200 ease-in-out
						${isFileDetailsOpened ? 'max-h-24' : 'max-h-0'}
					`}
				>
					{fileDetailsContent}
				</div>
			</div>
			{/* main content */}
			<div
				className={`
					select-none
					flex w-full rounded-t-lg bg-beam-bg-3
					text-beam-fg-3 text-xs text-nowrap
					border-t border-l border-r border-zinc-300/10

					px-2 py-1
					justify-between
				`}
			>
				<div className="flex gap-2 items-center">
					{fileDetailsButton}
				</div>
				<div className="flex gap-2 items-center">
					{acceptRejectAllButtons}
					{threadStatusHTML}
				</div>
			</div>
		</>
	)
}



const EditToolSoFar = ({ toolCallSoFar, }: { toolCallSoFar: RawToolCallObj }) => {

	if (!isABuiltinToolName(toolCallSoFar.name)) return null

	const accessor = useAccessor()

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed

	const uriDone = toolCallSoFar.doneParams.includes('uri')
	const desc1 = <span className='flex items-center'>
		{uriDone ?
			getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown')
			: `Generating`}
		<IconLoading />
	</span>

	const desc1OnClick = () => { uri && voidOpenFileFn(uri, accessor) }

	// If URI has not been specified
	return <ToolHeaderWrapper
		title={title}
		desc1={desc1}
		desc1OnClick={desc1OnClick}
	>
		<EditToolChildren
			uri={uri}
			code={toolCallSoFar.rawParams.search_replace_blocks ?? toolCallSoFar.rawParams.new_content ?? ''}
			type={'rewrite'} // as it streams, show in rewrite format, don't make a diff editor
		/>
		<IconLoading />
	</ToolHeaderWrapper>

}


export const SidebarChat = () => {
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const chatThreadsService = accessor.get('IChatThreadService')

	const settingsState = useSettingsState()
	// ----- HIGHER STATE -----

	// threads state
	const chatThreadsState = useChatThreadsState()

	const currentThread = chatThreadsService.getCurrentThread()
	const previousMessages = currentThread?.messages ?? []

	const selections = currentThread.state.stagingSelections
	const setSelections = (s: StagingSelectionItem[]) => { chatThreadsService.setCurrentThreadState({ stagingSelections: s }) }

	// stream state
	const currThreadStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)
	const isRunning = currThreadStreamState?.isRunning
	const latestError = currThreadStreamState?.error
	const { displayContentSoFar, toolCallSoFar, reasoningSoFar } = currThreadStreamState?.llmInfo ?? {}

	// this is just if it's currently being generated, NOT if it's currently running
	const toolIsGenerating = toolCallSoFar && !toolCallSoFar.isDone // show loading for slow tools (right now just edit)

	// ----- SIDEBAR CHAT state (local) -----

	// state of current message
	const initVal = ''
	const [instructionsAreEmpty, setInstructionsAreEmpty] = useState(!initVal)

	const isDisabled = instructionsAreEmpty || !!isFeatureNameDisabled('Chat', settingsState)

	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const onSubmit = useCallback(async (_forceSubmit?: string) => {

		if (isDisabled && !_forceSubmit) return
		if (isRunning) return

		const threadId = chatThreadsService.state.currentThreadId

		// send message to LLM
		const userMessage = _forceSubmit || textAreaRef.current?.value || ''

		try {
			await chatThreadsService.addUserMessageAndStreamResponse({ userMessage, threadId })
		} catch (e) {
			console.error('Error while sending message in chat:', e)
		}

		setSelections([]) // clear staging
		textAreaFnsRef.current?.setValue('')
		textAreaRef.current?.focus() // focus input after submit

	}, [chatThreadsService, isDisabled, isRunning, textAreaRef, textAreaFnsRef, setSelections, settingsState])

	const onAbort = async () => {
		const threadId = currentThread.id
		await chatThreadsService.abortRunning(threadId)
	}

	const keybindingString = accessor.get('IKeybindingService').lookupKeybinding(BEAM_CTRL_L_ACTION_ID)?.getLabel()

	const threadId = currentThread.id
	const currCheckpointIdx = chatThreadsState.allThreads[threadId]?.state?.currCheckpointIdx ?? undefined  // if not exist, treat like checkpoint is last message (infinity)



	// resolve mount info
	const isResolved = chatThreadsState.allThreads[threadId]?.state.mountedInfo?.mountedIsResolvedRef.current
	useEffect(() => {
		if (isResolved) return
		chatThreadsState.allThreads[threadId]?.state.mountedInfo?._whenMountedResolver?.({
			textAreaRef: textAreaRef,
			scrollToBottom: () => scrollToBottom(scrollContainerRef),
		})

	}, [chatThreadsState, threadId, textAreaRef, scrollContainerRef, isResolved])




	const previousMessagesHTML = useMemo(() => {
		// const lastMessageIdx = previousMessages.findLastIndex(v => v.role !== 'checkpoint')
		// tool request shows up as Editing... if in progress
		return previousMessages.map((message, i) => {
			return <ChatBubble
				key={i}
				currCheckpointIdx={currCheckpointIdx}
				chatMessage={message}
				messageIdx={i}
				isCommitted={true}
				chatIsRunning={isRunning}
				threadId={threadId}
				_scrollToBottom={() => scrollToBottom(scrollContainerRef)}
			/>
		})
	}, [previousMessages, threadId, currCheckpointIdx, isRunning])

	const streamingChatIdx = previousMessagesHTML.length
	const currStreamingMessageHTML = reasoningSoFar || displayContentSoFar || isRunning ?
		<ChatBubble
			key={'curr-streaming-msg'}
			currCheckpointIdx={currCheckpointIdx}
			chatMessage={{
				role: 'assistant',
				displayContent: displayContentSoFar ?? '',
				reasoning: reasoningSoFar ?? '',
				anthropicReasoning: null,
			}}
			messageIdx={streamingChatIdx}
			isCommitted={false}
			chatIsRunning={isRunning}

			threadId={threadId}
			_scrollToBottom={null}
		/> : null


	// the tool currently being generated
	const generatingTool = toolIsGenerating ?
		toolCallSoFar.name === 'edit_file' || toolCallSoFar.name === 'rewrite_file' ? <EditToolSoFar
			key={'curr-streaming-tool'}
			toolCallSoFar={toolCallSoFar}
		/>
			: null
		: null
	const activityLabel = isRunning === 'LLM' ? 'Thinking' : isRunning === 'idle' ? 'Working through the next step' : ''

	const messagesHTML = <ScrollToBottomContainer
		key={'messages' + chatThreadsState.currentThreadId} // force rerender on all children if id changes
		scrollContainerRef={scrollContainerRef}
		className={`
			flex flex-col
			px-4 py-4 space-y-4
			w-full h-full
			overflow-x-hidden
			overflow-y-auto
			${previousMessagesHTML.length === 0 && !displayContentSoFar ? 'hidden' : ''}
		`}
	>
		{/* previous messages */}
		{previousMessagesHTML}
		{currStreamingMessageHTML}

		{/* Generating tool */}
		{generatingTool}

		{/* loading indicator */}
		{isRunning === 'LLM' || isRunning === 'idle' && !toolIsGenerating ? <div className='@@beam-activity-shimmer'>
			<span className='inline-flex items-center gap-1.5 text-xs text-beam-fg-3'>
				<span className='w-1.5 h-1.5 rounded-full bg-beam-accent @@beam-pulse-dot' />
				{activityLabel}
			</span>
		</div> : null}


		{/* error message */}
		{latestError === undefined ? null :
			<div className='px-2 my-1'>
				<ErrorDisplay
					message={latestError.message}
					fullError={latestError.fullError}
					onDismiss={() => { chatThreadsService.dismissStreamError(currentThread.id) }}
					showDismiss={true}
				/>

				<WarningBox className='text-sm my-2 mx-4' onClick={() => { commandService.executeCommand(BEAM_OPEN_SETTINGS_ACTION_ID) }} text='Open settings' />
			</div>
		}
	</ScrollToBottomContainer>


	const onChangeText = useCallback((newStr: string) => {
		setInstructionsAreEmpty(!newStr)
	}, [setInstructionsAreEmpty])
	const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			onSubmit()
		} else if (e.key === 'Escape' && isRunning) {
			onAbort()
		}
	}, [onSubmit, onAbort, isRunning])

	const inputChatArea = <BeamChatArea
		featureName='Chat'
		onSubmit={() => onSubmit()}
		onAbort={onAbort}
		isStreaming={!!isRunning}
		isDisabled={isDisabled}
		showSelections={true}
		// showProspectiveSelections={previousMessagesHTML.length === 0}
		selections={selections}
		setSelections={setSelections}
		onClickAnywhere={() => { textAreaRef.current?.focus() }}
	>
		<BeamInputBox2
			enableAtToMention
			className={`min-h-[81px] px-0.5 py-0.5`}
			placeholder={`@ to mention, ${keybindingString ? `${keybindingString} to add a selection. ` : ''}Enter instructions...`}
			onChangeText={onChangeText}
			onKeyDown={onKeyDown}
			onFocus={() => { chatThreadsService.setCurrentlyFocusedMessageIdx(undefined) }}
			ref={textAreaRef}
			fnsRef={textAreaFnsRef}
			multiline={true}
		/>

	</BeamChatArea>


	const isLandingPage = previousMessages.length === 0


	const initiallySuggestedPromptsHTML = <div className='flex flex-col gap-2 w-full text-nowrap text-beam-fg-3 select-none'>
		{[
			'Summarize my codebase',
			'How do types work in Rust?',
			'Create a .voidrules file for me'
		].map((text, index) => (
			<div
				key={index}
				className='@@beam-suggestion-chip py-1.5 px-2.5 rounded-md text-sm cursor-pointer opacity-90 hover:opacity-100'
				onClick={() => onSubmit(text)}
			>
				{text}
			</div>
		))}
	</div>



	const threadPageInput = <div key={'input' + chatThreadsState.currentThreadId}>
		<div className='px-4'>
			<CommandBarInChat />
		</div>
		<div className='px-2 pb-2'>
			{inputChatArea}
		</div>
	</div>

	const landingPageInput = <div>
		<div className='pt-8'>
			{inputChatArea}
		</div>
	</div>

	const landingPageContent = <div
		ref={sidebarRef}
		className='w-full h-full max-h-full flex flex-col overflow-auto px-4'
	>
		<ErrorBoundary>
			{landingPageInput}
		</ErrorBoundary>

		{Object.keys(chatThreadsState.allThreads).length > 1 ? // show if there are threads
			<ErrorBoundary>
				<div className='pt-8 mb-2 text-beam-fg-3 text-root select-none pointer-events-none'>Previous Threads</div>
				<PastThreadsList />
			</ErrorBoundary>
			:
			<ErrorBoundary>
				<div className='pt-8 mb-2 text-beam-fg-3 text-root select-none pointer-events-none'>Suggestions</div>
				{initiallySuggestedPromptsHTML}
			</ErrorBoundary>
		}
	</div>


	// const threadPageContent = <div>
	// 	{/* Thread content */}
	// 	<div className='flex flex-col overflow-hidden'>
	// 		<div className={`overflow-hidden ${previousMessages.length === 0 ? 'h-0 max-h-0 pb-2' : ''}`}>
	// 			<ErrorBoundary>
	// 				{messagesHTML}
	// 			</ErrorBoundary>
	// 		</div>
	// 		<ErrorBoundary>
	// 			{inputForm}
	// 		</ErrorBoundary>
	// 	</div>
	// </div>
	const threadPageContent = <div
		ref={sidebarRef}
		className='w-full h-full flex flex-col overflow-hidden'
	>

		<ErrorBoundary>
			{messagesHTML}
		</ErrorBoundary>
		<ErrorBoundary>
			{threadPageInput}
		</ErrorBoundary>
	</div>


	return (
		<Fragment key={threadId} // force rerender when change thread
		>
			{isLandingPage ?
				landingPageContent
				: threadPageContent}
		</Fragment>
	)
}
