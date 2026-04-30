/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react'
import { MCPUserState, RefreshableProviderName, SettingsOfProvider } from '../../../../common/beamSettingsTypes.js'
import { DisposableStore, IDisposable } from '../../../../../../../base/common/lifecycle.js'
import { BeamSettingsState } from '../../../../common/beamSettingsService.js'
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js'
import { RefreshModelStateOfProvider } from '../../../../common/refreshModelService.js'

import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';
import { IExplorerService } from '../../../../../../../workbench/contrib/files/browser/files.js'
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { IClipboardService } from '../../../../../../../platform/clipboard/common/clipboardService.js';
import { IContextViewService, IContextMenuService } from '../../../../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { ILLMMessageService } from '../../../../common/sendLLMMessageService.js';
import { IRefreshModelService } from '../../../../common/refreshModelService.js';
import { IBeamSettingsService } from '../../../../common/beamSettingsService.js';
import { IExtensionTransferService } from '../../../extensionTransferService.js'

import { IInstantiationService, _util } from '../../../../../../../platform/instantiation/common/instantiation.js'
import type { ServiceIdentifier } from '../../../../../../../platform/instantiation/common/instantiation.js'
import { ICodeEditorService } from '../../../../../../../editor/browser/services/codeEditorService.js'
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js'
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js'
import { INotificationService } from '../../../../../../../platform/notification/common/notification.js'
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js'
import { ILanguageConfigurationService } from '../../../../../../../editor/common/languages/languageConfigurationRegistry.js'
import { ILanguageFeaturesService } from '../../../../../../../editor/common/services/languageFeatures.js'
import { ILanguageDetectionService } from '../../../../../../../workbench/services/languageDetection/common/languageDetectionWorkerService.js'
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js'
import { IEnvironmentService } from '../../../../../../../platform/environment/common/environment.js'
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js'
import { IPathService } from '../../../../../../../workbench/services/path/common/pathService.js'
import { IMetricsService } from '../../../../common/metricsService.js'
import { URI } from '../../../../../../../base/common/uri.js'
import { IChatThreadService, ThreadsState, ThreadStreamState } from '../../../chatThreadService.js'
import { ITerminalToolService } from '../../../terminalToolService.js'
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js'
import { IBeamModelService } from '../../../../common/beamModelService.js'
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js'
import { IBeamCommandBarService } from '../../../beamCommandBarService.js'
import { INativeHostService } from '../../../../../../../platform/native/common/native.js';
import { IEditCodeService } from '../../../editCodeServiceInterface.js'
import { IToolsService } from '../../../toolsServiceInterface.js'
import { IPrettifyLLMMessageService } from '../../../prettifyLLMMessageService.js'
import { IConvertToLLMMessageService } from '../../../convertToLLMMessageService.js'
import { ITerminalService } from '../../../../../../../workbench/contrib/terminal/browser/terminal.js'
import { ISearchService } from '../../../../../../../workbench/services/search/common/search.js'
import { IExtensionManagementService } from '../../../../../../../platform/extensionManagement/common/extensionManagement.js'
import { IMCPService } from '../../../../common/mcpService.js';
import { IStorageService, StorageScope } from '../../../../../../../platform/storage/common/storage.js'
import { OPT_OUT_KEY } from '../../../../common/storageKeys.js'


// normally to do this you'd use a useEffect that calls .onDidChangeState(), but useEffect mounts too late and misses initial state changes

// even if React hasn't mounted yet, the variables are always updated to the latest state.
// React listens by adding a setState function to these listeners.

let chatThreadsState: ThreadsState = { allThreads: {}, currentThreadId: '' }
const chatThreadsStateListeners: Set<(s: ThreadsState) => void> = new Set()

let chatThreadsStreamState: ThreadStreamState = {}
const chatThreadsStreamStateListeners: Set<(threadId: string) => void> = new Set()

let settingsState: BeamSettingsState = {
	settingsOfProvider: {} as any,
	modelSelectionOfFeature: {} as any,
	optionsOfModelSelection: {} as any,
	overridesOfModel: {} as any,
	globalSettings: {} as any,
	mcpUserStateOfName: {},
	_modelOptions: []
}
const settingsStateListeners: Set<(s: BeamSettingsState) => void> = new Set()

let refreshModelState: RefreshModelStateOfProvider = {}
const refreshModelStateListeners: Set<(s: RefreshModelStateOfProvider) => void> = new Set()
const refreshModelProviderListeners: Set<(p: RefreshableProviderName, s: RefreshModelStateOfProvider) => void> = new Set()

let colorThemeState: ColorScheme = ColorScheme.DARK
const colorThemeStateListeners: Set<(s: ColorScheme) => void> = new Set()

const ctrlKZoneStreamingStateListeners: Set<(diffareaid: number, s: boolean) => void> = new Set()
const commandBarURIStateListeners: Set<(uri: URI) => void> = new Set();
const activeURIListeners: Set<(uri: URI | null) => void> = new Set();

const mcpListeners: Set<() => void> = new Set()

const getServiceById = <T,>(accessor: ServicesAccessor, serviceId: string): T => {
	const id = _util.serviceIds.get(serviceId) as ServiceIdentifier<T> | undefined
	if (!id) {
		throw new Error(`[Beam React] Service '${serviceId}' is not registered. Make sure its service decorator module is imported before _registerServices runs.`)
	}
	return accessor.get(id)
}


// must call this before you can use any of the hooks below
// this should only be called ONCE! this is the only place you don't need to dispose onDidChange. If you use state.onDidChange anywhere else, make sure to dispose it!
export const _registerServices = (accessor: ServicesAccessor) => {

	const disposables: IDisposable[] = []

	_registerAccessor(accessor)

	const stateServices = {
		chatThreadsStateService: getServiceById<IChatThreadService>(accessor, 'voidChatThreadService'),
		settingsStateService: getServiceById<IBeamSettingsService>(accessor, 'BeamSettingsService'),
		refreshModelService: getServiceById<IRefreshModelService>(accessor, 'RefreshModelService'),
		themeService: getServiceById<IThemeService>(accessor, 'themeService'),
		editCodeService: getServiceById<IEditCodeService>(accessor, 'editCodeService'),
		beamCommandBarService: getServiceById<IBeamCommandBarService>(accessor, 'BeamCommandBarService'),
		modelService: getServiceById<IModelService>(accessor, 'modelService'),
		mcpService: getServiceById<IMCPService>(accessor, 'mcpConfigService'),
	}

	const { settingsStateService, chatThreadsStateService, refreshModelService, themeService, editCodeService, beamCommandBarService, modelService, mcpService } = stateServices




	chatThreadsState = chatThreadsStateService.state
	disposables.push(
		chatThreadsStateService.onDidChangeCurrentThread(() => {
			chatThreadsState = chatThreadsStateService.state
			chatThreadsStateListeners.forEach(l => l(chatThreadsState))
		})
	)

	// same service, different state
	chatThreadsStreamState = chatThreadsStateService.streamState
	disposables.push(
		chatThreadsStateService.onDidChangeStreamState(({ threadId }) => {
			chatThreadsStreamState = chatThreadsStateService.streamState
			chatThreadsStreamStateListeners.forEach(l => l(threadId))
		})
	)

	settingsState = settingsStateService.state
	disposables.push(
		settingsStateService.onDidChangeState(() => {
			settingsState = settingsStateService.state
			settingsStateListeners.forEach(l => l(settingsState))
		})
	)

	refreshModelState = refreshModelService.state
	disposables.push(
		refreshModelService.onDidChangeState((providerName) => {
			refreshModelState = refreshModelService.state
			refreshModelStateListeners.forEach(l => l(refreshModelState))
			refreshModelProviderListeners.forEach(l => l(providerName, refreshModelState)) // no state
		})
	)

	colorThemeState = themeService.getColorTheme().type
	disposables.push(
		themeService.onDidColorThemeChange(({ type }) => {
			colorThemeState = type
			colorThemeStateListeners.forEach(l => l(colorThemeState))
		})
	)

	// no state
	disposables.push(
		editCodeService.onDidChangeStreamingInCtrlKZone(({ diffareaid }) => {
			const isStreaming = editCodeService.isCtrlKZoneStreaming({ diffareaid })
			ctrlKZoneStreamingStateListeners.forEach(l => l(diffareaid, isStreaming))
		})
	)

	disposables.push(
		beamCommandBarService.onDidChangeState(({ uri }) => {
			commandBarURIStateListeners.forEach(l => l(uri));
		})
	)

	disposables.push(
		beamCommandBarService.onDidChangeActiveURI(({ uri }) => {
			activeURIListeners.forEach(l => l(uri));
		})
	)

	disposables.push(
		mcpService.onDidChangeState(() => {
			mcpListeners.forEach(l => l())
		})
	)


	return disposables
}



const getReactAccessor = (accessor: ServicesAccessor) => {
	const reactAccessor = {
		IModelService: getServiceById<IModelService>(accessor, 'modelService'),
		IClipboardService: getServiceById<IClipboardService>(accessor, 'clipboardService'),
		IContextViewService: getServiceById<IContextViewService>(accessor, 'contextViewService'),
		IContextMenuService: getServiceById<IContextMenuService>(accessor, 'contextMenuService'),
		IFileService: getServiceById<IFileService>(accessor, 'fileService'),
		IHoverService: getServiceById<IHoverService>(accessor, 'hoverService'),
		IThemeService: getServiceById<IThemeService>(accessor, 'themeService'),
		ILLMMessageService: getServiceById<ILLMMessageService>(accessor, 'llmMessageService'),
		IRefreshModelService: getServiceById<IRefreshModelService>(accessor, 'RefreshModelService'),
		IBeamSettingsService: getServiceById<IBeamSettingsService>(accessor, 'BeamSettingsService'),
		IEditCodeService: getServiceById<IEditCodeService>(accessor, 'editCodeService'),
		IChatThreadService: getServiceById<IChatThreadService>(accessor, 'voidChatThreadService'),

		IInstantiationService: getServiceById<IInstantiationService>(accessor, 'instantiationService'),
		ICodeEditorService: getServiceById<ICodeEditorService>(accessor, 'codeEditorService'),
		ICommandService: getServiceById<ICommandService>(accessor, 'commandService'),
		IContextKeyService: getServiceById<IContextKeyService>(accessor, 'contextKeyService'),
		INotificationService: getServiceById<INotificationService>(accessor, 'notificationService'),
		IAccessibilityService: getServiceById<IAccessibilityService>(accessor, 'accessibilityService'),
		ILanguageConfigurationService: getServiceById<ILanguageConfigurationService>(accessor, 'languageConfigurationService'),
		ILanguageDetectionService: getServiceById<ILanguageDetectionService>(accessor, 'ILanguageDetectionService'),
		ILanguageFeaturesService: getServiceById<ILanguageFeaturesService>(accessor, 'ILanguageFeaturesService'),
		IKeybindingService: getServiceById<IKeybindingService>(accessor, 'keybindingService'),
		ISearchService: getServiceById<ISearchService>(accessor, 'searchService'),

		IExplorerService: getServiceById<IExplorerService>(accessor, 'explorerService'),
		IEnvironmentService: getServiceById<IEnvironmentService>(accessor, 'environmentService'),
		IConfigurationService: getServiceById<IConfigurationService>(accessor, 'configurationService'),
		IPathService: getServiceById<IPathService>(accessor, 'pathService'),
		IMetricsService: getServiceById<IMetricsService>(accessor, 'metricsService'),
		ITerminalToolService: getServiceById<ITerminalToolService>(accessor, 'TerminalToolService'),
		ILanguageService: getServiceById<ILanguageService>(accessor, 'languageService'),
		IBeamModelService: getServiceById<IBeamModelService>(accessor, 'voidVoidModelService'),
		IWorkspaceContextService: getServiceById<IWorkspaceContextService>(accessor, 'contextService'),

		IBeamCommandBarService: getServiceById<IBeamCommandBarService>(accessor, 'BeamCommandBarService'),
		INativeHostService: getServiceById<INativeHostService>(accessor, 'nativeHostService'),
		IToolsService: getServiceById<IToolsService>(accessor, 'ToolsService'),
		IConvertToLLMMessageService: getServiceById<IConvertToLLMMessageService>(accessor, 'ConvertToLLMMessageService'),
		ITerminalService: getServiceById<ITerminalService>(accessor, 'terminalService'),
		IExtensionManagementService: getServiceById<IExtensionManagementService>(accessor, 'extensionManagementService'),
		IExtensionTransferService: getServiceById<IExtensionTransferService>(accessor, 'ExtensionTransferService'),
		IMCPService: getServiceById<IMCPService>(accessor, 'mcpConfigService'),

		IStorageService: getServiceById<IStorageService>(accessor, 'storageService'),

	} as const
	return reactAccessor
}

type ReactAccessor = ReturnType<typeof getReactAccessor>


let reactAccessor_: ReactAccessor | null = null
const _registerAccessor = (accessor: ServicesAccessor) => {
	const reactAccessor = getReactAccessor(accessor)
	reactAccessor_ = reactAccessor
}

// -- services --
export const useAccessor = () => {
	if (!reactAccessor_) {
		throw new Error(`⚠️ Beam useAccessor was called before _registerServices!`)
	}

	return { get: <S extends keyof ReactAccessor,>(service: S): ReactAccessor[S] => reactAccessor_![service] }
}



// -- state of services --

export const useSettingsState = () => {
	const [s, ss] = useState(settingsState)
	useEffect(() => {
		ss(settingsState)
		settingsStateListeners.add(ss)
		return () => { settingsStateListeners.delete(ss) }
	}, [ss])
	return s
}

export const useChatThreadsState = () => {
	const [s, ss] = useState(chatThreadsState)
	useEffect(() => {
		ss(chatThreadsState)
		chatThreadsStateListeners.add(ss)
		return () => { chatThreadsStateListeners.delete(ss) }
	}, [ss])
	return s
	// allow user to set state natively in react
	// const ss: React.Dispatch<React.SetStateAction<ThreadsState>> = (action)=>{
	// 	_ss(action)
	// 	if (typeof action === 'function') {
	// 		const newState = action(chatThreadsState)
	// 		chatThreadsState = newState
	// 	} else {
	// 		chatThreadsState = action
	// 	}
	// }
	// return [s, ss] as const
}




export const useChatThreadsStreamState = (threadId: string) => {
	const [s, ss] = useState<ThreadStreamState[string] | undefined>(chatThreadsStreamState ? chatThreadsStreamState[threadId] : undefined)
	useEffect(() => {
		ss(chatThreadsStreamState[threadId])
		const listener = (threadId_: string) => {
			if (threadId_ !== threadId) return
			ss(chatThreadsStreamState[threadId])
		}
		chatThreadsStreamStateListeners.add(listener)
		return () => { chatThreadsStreamStateListeners.delete(listener) }
	}, [ss, threadId])
	return s
}

export const useFullChatThreadsStreamState = () => {
	const [s, ss] = useState(chatThreadsStreamState)
	useEffect(() => {
		ss(chatThreadsStreamState)
		const listener = () => { ss(chatThreadsStreamState) }
		chatThreadsStreamStateListeners.add(listener)
		return () => { chatThreadsStreamStateListeners.delete(listener) }
	}, [ss])
	return s
}



export const useRefreshModelState = () => {
	const [s, ss] = useState(refreshModelState)
	useEffect(() => {
		ss(refreshModelState)
		refreshModelStateListeners.add(ss)
		return () => { refreshModelStateListeners.delete(ss) }
	}, [ss])
	return s
}


export const useRefreshModelListener = (listener: (providerName: RefreshableProviderName, s: RefreshModelStateOfProvider) => void) => {
	useEffect(() => {
		refreshModelProviderListeners.add(listener)
		return () => { refreshModelProviderListeners.delete(listener) }
	}, [listener, refreshModelProviderListeners])
}

export const useCtrlKZoneStreamingState = (listener: (diffareaid: number, s: boolean) => void) => {
	useEffect(() => {
		ctrlKZoneStreamingStateListeners.add(listener)
		return () => { ctrlKZoneStreamingStateListeners.delete(listener) }
	}, [listener, ctrlKZoneStreamingStateListeners])
}

export const useIsDark = () => {
	const [s, ss] = useState(colorThemeState)
	useEffect(() => {
		ss(colorThemeState)
		colorThemeStateListeners.add(ss)
		return () => { colorThemeStateListeners.delete(ss) }
	}, [ss])

	// s is the theme, return isDark instead of s
	const isDark = s === ColorScheme.DARK || s === ColorScheme.HIGH_CONTRAST_DARK
	return isDark
}

export const useCommandBarURIListener = (listener: (uri: URI) => void) => {
	useEffect(() => {
		commandBarURIStateListeners.add(listener);
		return () => { commandBarURIStateListeners.delete(listener) };
	}, [listener]);
};
export const useCommandBarState = () => {
	const accessor = useAccessor()
	const commandBarService = accessor.get('IBeamCommandBarService')
	const [s, ss] = useState({ stateOfURI: commandBarService.stateOfURI, sortedURIs: commandBarService.sortedURIs });
	const listener = useCallback(() => {
		ss({ stateOfURI: commandBarService.stateOfURI, sortedURIs: commandBarService.sortedURIs });
	}, [commandBarService])
	useCommandBarURIListener(listener)

	return s;
}



// roughly gets the active URI - this is used to get the history of recent URIs
export const useActiveURI = () => {
	const accessor = useAccessor()
	const commandBarService = accessor.get('IBeamCommandBarService')
	const [s, ss] = useState(commandBarService.activeURI)
	useEffect(() => {
		const listener = () => { ss(commandBarService.activeURI) }
		activeURIListeners.add(listener);
		return () => { activeURIListeners.delete(listener) };
	}, [])
	return { uri: s }
}




export const useMCPServiceState = () => {
	const accessor = useAccessor()
	const mcpService = accessor.get('IMCPService')
	const [s, ss] = useState(mcpService.state)
	useEffect(() => {
		const listener = () => { ss(mcpService.state) }
		mcpListeners.add(listener);
		return () => { mcpListeners.delete(listener) };
	}, []);
	return s
}



export const useIsOptedOut = () => {
	const accessor = useAccessor()
	const storageService = accessor.get('IStorageService')

	const getVal = useCallback(() => {
		return storageService.getBoolean(OPT_OUT_KEY, StorageScope.APPLICATION, false)
	}, [storageService])

	const [s, ss] = useState(getVal())

	useEffect(() => {
		const disposables = new DisposableStore();
		const d = storageService.onDidChangeValue(StorageScope.APPLICATION, OPT_OUT_KEY, disposables)(e => {
			ss(getVal())
		})
		disposables.add(d)
		return () => disposables.clear()
	}, [storageService, getVal])

	return s
}
