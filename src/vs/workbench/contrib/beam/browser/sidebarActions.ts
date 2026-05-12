/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';


import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';

import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';

import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { BEAM_VIEW_CONTAINER_ID, BEAM_VIEW_ID } from './sidebarPane.js';
import { IMetricsService } from '../common/metricsService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { BEAM_TOGGLE_SETTINGS_ACTION_ID } from './beamSettingsPane.js';
import { BEAM_APPROVE_TOOL_ACTION_ID, BEAM_CTRL_L_ACTION_ID, BEAM_NEW_CHAT_ACTION_ID, BEAM_OPEN_CHAT_ACTION_ID, BEAM_REJECT_TOOL_ACTION_ID, BEAM_SHOW_HISTORY_ACTION_ID, BEAM_STOP_CHAT_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IChatThreadService } from './chatThreadService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IBeamSettingsService } from '../common/beamSettingsService.js';
import { BeamIntelligenceMode, beamIntelligenceModes, ChatMode } from '../common/beamSettingsTypes.js';

// ---------- Register commands and keybindings ----------


export const roundRangeToLines = (range: IRange | null | undefined, options: { emptySelectionBehavior: 'null' | 'line' }) => {
	if (!range)
		return null

	// treat as no selection if selection is empty
	if (range.endColumn === range.startColumn && range.endLineNumber === range.startLineNumber) {
		if (options.emptySelectionBehavior === 'null')
			return null
		else if (options.emptySelectionBehavior === 'line')
			return { startLineNumber: range.startLineNumber, startColumn: 1, endLineNumber: range.startLineNumber, endColumn: 1 }
	}

	// IRange is 1-indexed
	const endLine = range.endColumn === 1 ? range.endLineNumber - 1 : range.endLineNumber // e.g. if the user triple clicks, it selects column=0, line=line -> column=0, line=line+1
	const newRange: IRange = {
		startLineNumber: range.startLineNumber,
		startColumn: 1,
		endLineNumber: endLine,
		endColumn: Number.MAX_SAFE_INTEGER
	}
	return newRange
}

// const getContentInRange = (model: ITextModel, range: IRange | null) => {
// 	if (!range)
// 		return null
// 	const content = model.getValueInRange(range)
// 	const trimmedContent = content
// 		.replace(/^\s*\n/g, '') // trim pure whitespace lines from start
// 		.replace(/\n\s*$/g, '') // trim pure whitespace lines from end
// 	return trimmedContent
// }



registerAction2(class extends Action2 {
	constructor() {
		super({ id: BEAM_OPEN_CHAT_ACTION_ID, title: localize2('beamOpenChatAlias', 'Beam: Open Chat'), f1: true });
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService)
		const chatThreadsService = accessor.get(IChatThreadService)
		await viewsService.openViewContainer(BEAM_VIEW_CONTAINER_ID)
		await chatThreadsService.focusCurrentChat()
	}
})

CommandsRegistry.registerCommandAlias('beam.sidebar.open', BEAM_OPEN_CHAT_ACTION_ID)
CommandsRegistry.registerCommandAlias('workbench.view.beam', BEAM_OPEN_CHAT_ACTION_ID)
CommandsRegistry.registerCommandAlias('workbench.action.beam.openChat', BEAM_OPEN_CHAT_ACTION_ID)


// cmd L
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_CTRL_L_ACTION_ID,
			f1: true,
			title: localize2('beamCmdL', 'Beam: Add Selection to Chat'),
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyCode.KeyL,
				weight: KeybindingWeight.BeamExtension
			}
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		// Get services
		const commandService = accessor.get(ICommandService)
		const viewsService = accessor.get(IViewsService)
		const metricsService = accessor.get(IMetricsService)
		const editorService = accessor.get(ICodeEditorService)
		const chatThreadService = accessor.get(IChatThreadService)

		metricsService.capture('Ctrl+L', {})

		// open panel
		const wasAlreadyOpen = viewsService.isViewContainerVisible(BEAM_VIEW_CONTAINER_ID)
		if (!wasAlreadyOpen) {
			await commandService.executeCommand(BEAM_OPEN_CHAT_ACTION_ID)
		}

		// capture selection and model after opening the chat panel
		const editor = editorService.getActiveCodeEditor()
		const model = editor?.getModel()
		if (!model) {
			await chatThreadService.focusCurrentChat()
			return
		}

		const selectionRange = roundRangeToLines(editor?.getSelection(), { emptySelectionBehavior: 'null' })

		// Add selection to chat
		// add line selection
		if (selectionRange) {
			editor?.setSelection({
				startLineNumber: selectionRange.startLineNumber,
				endLineNumber: selectionRange.endLineNumber,
				startColumn: 1,
				endColumn: Number.MAX_SAFE_INTEGER
			})
			chatThreadService.addNewStagingSelection({
				type: 'CodeSelection',
				uri: model.uri,
				language: model.getLanguageId(),
				range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
				state: { wasAddedAsCurrentFile: false },
			})
		}
		// add file
		else {
			chatThreadService.addNewStagingSelection({
				type: 'File',
				uri: model.uri,
				language: model.getLanguageId(),
				state: { wasAddedAsCurrentFile: false },
			})
		}

		await chatThreadService.focusCurrentChat()
	}
})


// New chat keybind + menu button
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_NEW_CHAT_ACTION_ID,
			title: localize2('beamNewChat', 'Beam: New Chat'),
			f1: true,
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyL,
				weight: KeybindingWeight.BeamExtension,
			},
			icon: { id: 'add' },
			menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', BEAM_VIEW_ID), }],
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {

		const commandService = accessor.get(ICommandService)
		const metricsService = accessor.get(IMetricsService)
		const chatThreadsService = accessor.get(IChatThreadService)
		const editorService = accessor.get(ICodeEditorService)
		metricsService.capture('Chat Navigation', { type: 'Start New Chat' })

		await commandService.executeCommand(BEAM_OPEN_CHAT_ACTION_ID)

		// get current selections and value to transfer
		const oldThreadId = chatThreadsService.state.currentThreadId
		const oldThread = chatThreadsService.state.allThreads[oldThreadId]

		const oldUI = await oldThread?.state.mountedInfo?.whenMounted

		const oldSelns = oldThread?.state.stagingSelections
		const oldVal = oldUI?.textAreaRef?.current?.value

		// open and focus new thread
		chatThreadsService.openNewThread()
		await chatThreadsService.focusCurrentChat()


		// set new thread values
		const newThreadId = chatThreadsService.state.currentThreadId
		const newThread = chatThreadsService.state.allThreads[newThreadId]

		const newUI = await newThread?.state.mountedInfo?.whenMounted
		chatThreadsService.setCurrentThreadState({ stagingSelections: oldSelns, })
		if (newUI?.textAreaRef?.current && oldVal) newUI.textAreaRef.current.value = oldVal


		// if has selection, add it
		const editor = editorService.getActiveCodeEditor()
		const model = editor?.getModel()
		if (!model) return
		const selectionRange = roundRangeToLines(editor?.getSelection(), { emptySelectionBehavior: 'null' })
		if (!selectionRange) return
		editor?.setSelection({ startLineNumber: selectionRange.startLineNumber, endLineNumber: selectionRange.endLineNumber, startColumn: 1, endColumn: Number.MAX_SAFE_INTEGER })
		chatThreadsService.addNewStagingSelection({
			type: 'CodeSelection',
			uri: model.uri,
			language: model.getLanguageId(),
			range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
			state: { wasAddedAsCurrentFile: false },
		})
	}
})

// History menu button
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_SHOW_HISTORY_ACTION_ID,
			title: localize2('beamShowHistory', 'Beam: Show Chat History'),
			f1: true,
			icon: { id: 'history' },
			menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', BEAM_VIEW_ID), }]
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService)
		const metricsService = accessor.get(IMetricsService)
		const chatThreadsService = accessor.get(IChatThreadService)

		metricsService.capture('Chat Navigation', { type: 'History' })
		await commandService.executeCommand(BEAM_OPEN_CHAT_ACTION_ID)
		chatThreadsService.requestHistoryToggle()

	}
})
CommandsRegistry.registerCommandAlias('beam.cmdShiftL', BEAM_NEW_CHAT_ACTION_ID)
CommandsRegistry.registerCommandAlias('beam.historyAction', BEAM_SHOW_HISTORY_ACTION_ID)


// Settings gear
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'beam.settingsAction',
			title: localize2('beamSettingsActionTitle', 'Beam: Open Settings'),
			f1: true,
			icon: { id: 'settings-gear' },
			menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', BEAM_VIEW_ID), }]
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService)
		commandService.executeCommand(BEAM_TOGGLE_SETTINGS_ACTION_ID)
	}
})

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_STOP_CHAT_ACTION_ID,
			title: localize2('beamStopChat', 'Beam: Stop Current Chat'),
			f1: true,
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const chatThreadsService = accessor.get(IChatThreadService)
		const threadId = chatThreadsService.state.currentThreadId
		if (!threadId) return
		await chatThreadsService.abortRunning(threadId)
	}
})

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_APPROVE_TOOL_ACTION_ID,
			title: localize2('beamApproveTool', 'Beam: Approve Current Tool'),
			f1: true,
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const chatThreadsService = accessor.get(IChatThreadService)
		const threadId = chatThreadsService.state.currentThreadId
		if (!threadId) return
		chatThreadsService.approveLatestToolRequest(threadId)
	}
})

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: BEAM_REJECT_TOOL_ACTION_ID,
			title: localize2('beamRejectTool', 'Beam: Reject Current Tool'),
			f1: true,
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const chatThreadsService = accessor.get(IChatThreadService)
		const threadId = chatThreadsService.state.currentThreadId
		if (!threadId) return
		chatThreadsService.rejectLatestToolRequest(threadId)
	}
})

const registerChatModeAction = (mode: ChatMode, title: string) => {
	registerAction2(class extends Action2 {
		constructor() {
			super({
				id: `beam.mode.${mode}`,
				title: localize2(`beamMode${mode}`, title),
				f1: true,
			});
		}
		async run(accessor: ServicesAccessor): Promise<void> {
			const settingsService = accessor.get(IBeamSettingsService)
			await settingsService.setGlobalSetting('chatMode', mode)
		}
	})
}

registerChatModeAction('normal', 'Beam: Set Mode to Chat')
registerChatModeAction('gather', 'Beam: Set Mode to Gather')
registerChatModeAction('agent', 'Beam: Set Mode to Agent')

const intelligenceModeTitles: Record<BeamIntelligenceMode, string> = {
	fast: 'Beam: Use Fast Intelligence',
	balanced: 'Beam: Use Balanced Intelligence',
	powerful: 'Beam: Use Powerful Intelligence',
	free: 'Beam: Use Free Intelligence',
	local: 'Beam: Use Local Intelligence',
}

for (const mode of beamIntelligenceModes) {
	registerAction2(class extends Action2 {
		constructor() {
			super({
				id: `beam.intelligence.${mode}`,
				title: localize2(`beamIntelligence${mode}`, intelligenceModeTitles[mode]),
				f1: true,
			});
		}
		async run(accessor: ServicesAccessor): Promise<void> {
			const settingsService = accessor.get(IBeamSettingsService)
			await settingsService.setGlobalSetting('intelligenceMode', mode)
		}
	})
}




// export class TabSwitchListener extends Disposable {

// 	constructor(
// 		onSwitchTab: () => void,
// 		@ICodeEditorService private readonly _editorService: ICodeEditorService,
// 	) {
// 		super()

// 		// when editor switches tabs (models)
// 		const addTabSwitchListeners = (editor: ICodeEditor) => {
// 			this._register(editor.onDidChangeModel(e => {
// 				if (e.newModelUrl?.scheme !== 'file') return
// 				onSwitchTab()
// 			}))
// 		}

// 		const initializeEditor = (editor: ICodeEditor) => {
// 			addTabSwitchListeners(editor)
// 		}

// 		// initialize current editors + any new editors
// 		for (let editor of this._editorService.listCodeEditors()) initializeEditor(editor)
// 		this._register(this._editorService.onCodeEditorAdd(editor => { initializeEditor(editor) }))
// 	}
// }
