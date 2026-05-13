/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'; // Added useRef import just in case it was missed, though likely already present
import { AgentRoutingRole, agentRoutingRoles, BeamIntelligenceMode, BeamVerificationLevel, ProviderName, SettingName, displayInfoOfSettingName, BeamStatefulModelInfo, customSettingNamesOfProvider, RefreshableProviderName, refreshableProviderNames, displayInfoOfProviderName, nonlocalProviderNames, GlobalSettingName, featureNames, displayInfoOfFeatureName, isProviderNameDisabled, FeatureName, hasDownloadButtonsOnModelsProviderNames, subTextMdOfProviderName, TerminalAutoExecutionMode, WebAutoRequestMode } from '../../../../common/beamSettingsTypes.js'
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js'
import { BeamButtonBgDarken, BeamCustomDropdownBox, BeamInputBox2, BeamSimpleInputBox, BeamSwitch } from '../util/inputs.js'
import { useAccessor, useIsDark, useIsOptedOut, useRefreshModelListener, useRefreshModelState, useSettingsState } from '../util/services.js'
import { X, RefreshCw, Loader2, Check, Asterisk, Plus, Zap, Scale, Brain, Gift, Monitor, Cloud, Route, LogIn, LogOut, UserCircle } from 'lucide-react'
import { URI } from '../../../../../../../base/common/uri.js'
import { ModelDropdown } from './ModelDropdown.js'
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js'
import { WarningBox } from './WarningBox.js'
import { os } from '../../../../common/helpers/systemInfo.js'
import { IconLoading } from '../sidebar-tsx/ChatShared.js';
import { ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js'
import Severity from '../../../../../../../base/common/severity.js'
import { getModelCapabilities, modelOverrideKeys, ModelOverrides } from '../../../../common/modelCapabilities.js';
import { TransferEditorType, TransferFilesInfo } from '../../../extensionTransferTypes.js';
import { MCPServer } from '../../../../common/mcpServiceTypes.js';
import { useMCPServiceState } from '../util/services.js';
import { OPT_OUT_KEY } from '../../../../common/storageKeys.js';
import { StorageScope, StorageTarget } from '../../../../../../../platform/storage/common/storage.js';
import { BeamCloudAccountStatus } from '../../../../common/beamCloudClient.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../../../base/common/resources.js';
import { voidOpenFileFn } from '../sidebar-tsx/ChatShared.js';
import { beamIntelligenceModeInfo, beamIntelligenceModes, chatModeInfo, getProviderUxStatus, resolveAgentRouting, resolveBeamMode } from '../util/beamIntelligence.js';
import { cancelBeamAuthListener, finishBeamAuthListener, startBeamAuthListener } from '../../../beamAuthSession.js';

type Tab =
	| 'intelligence'
	| 'models'
	| 'localProviders'
	| 'providers'
	| 'configuration'
	| 'customizations'
	| 'mcp'
	| 'general'
	| 'all';


const ButtonLeftTextRightOption = ({ text, leftButton }: { text: string, leftButton?: React.ReactNode }) => {

	return <div className='flex items-center text-beam-fg-3 px-3 py-0.5 rounded-sm overflow-hidden gap-2'>
		{leftButton ? leftButton : null}
		<span>
			{text}
		</span>
	</div>
}

// models
const RefreshModelButton = ({ providerName }: { providerName: RefreshableProviderName }) => {

	const refreshModelState = useRefreshModelState()

	const accessor = useAccessor()
	const refreshModelService = accessor.get('IRefreshModelService')
	const metricsService = accessor.get('IMetricsService')

	const [justFinished, setJustFinished] = useState<null | 'finished' | 'error'>(null)

	useRefreshModelListener(
		useCallback((providerName2, refreshModelState) => {
			if (providerName2 !== providerName) return
			const { state } = refreshModelState[providerName]
			if (!(state === 'finished' || state === 'error')) return
			// now we know we just entered 'finished' state for this providerName
			setJustFinished(state)
			const tid = setTimeout(() => { setJustFinished(null) }, 2000)
			return () => clearTimeout(tid)
		}, [providerName])
	)

	const { state } = refreshModelState[providerName]

	const { title: providerTitle } = displayInfoOfProviderName(providerName)

	return <ButtonLeftTextRightOption

		leftButton={
			<button
				className='flex items-center'
				disabled={state === 'refreshing' || justFinished !== null}
				onClick={() => {
					refreshModelService.startRefreshingModels(providerName, { enableProviderOnSuccess: false, doNotFire: false })
					metricsService.capture('Click', { providerName, action: 'Refresh Models' })
				}}
			>
				{justFinished === 'finished' ? <Check className='stroke-green-500 size-3' />
					: justFinished === 'error' ? <X className='stroke-red-500 size-3' />
						: state === 'refreshing' ? <Loader2 className='size-3 animate-spin' />
							: <RefreshCw className='size-3' />}
			</button>
		}

		text={justFinished === 'finished' ? `${providerTitle} Models are up-to-date!`
			: justFinished === 'error' ? `${providerTitle} not found!`
				: `Manually refresh ${providerTitle} models.`}
	/>
}

const RefreshableModels = () => {
	const settingsState = useSettingsState()


	const buttons = refreshableProviderNames.map(providerName => {
		if (!settingsState.settingsOfProvider[providerName]._didFillInProviderSettings) return null
		return <RefreshModelButton key={providerName} providerName={providerName} />
	})

	return <>
		{buttons}
	</>

}



export const AnimatedCheckmarkButton = ({ text, className }: { text?: string, className?: string }) => {
	const [dashOffset, setDashOffset] = useState(40);

	useEffect(() => {
		const startTime = performance.now();
		const duration = 500; // 500ms animation

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const newOffset = 40 - (progress * 40);

			setDashOffset(newOffset);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		const animationId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationId);
	}, []);

	return <div
		className={`flex items-center gap-1.5 w-fit
			${className ? className : `px-2 py-0.5 text-xs text-zinc-900 bg-zinc-100 rounded-sm`}
		`}
	>
		<svg className="size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M5 13l4 4L19 7"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					strokeDasharray: 40,
					strokeDashoffset: dashOffset
				}}
			/>
		</svg>
		{text}
	</div>
}


const AddButton = ({ disabled, text = 'Add', ...props }: { disabled?: boolean, text?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

	return <button
		disabled={disabled}
		className={`bg-[#0e70c0] px-3 py-1 text-white rounded-sm ${!disabled ? 'hover:bg-[#1177cb] cursor-pointer' : 'opacity-50 cursor-not-allowed bg-opacity-70'}`}
		{...props}
	>{text}</button>

}

// ConfirmButton prompts for a second click to confirm an action, cancels if clicking outside
const ConfirmButton = ({ children, onConfirm, className }: { children: React.ReactNode, onConfirm: () => void, className?: string }) => {
	const [confirm, setConfirm] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!confirm) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setConfirm(false);
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [confirm]);
	return (
		<div ref={ref} className={`inline-block`}>
			<BeamButtonBgDarken className={className} onClick={() => {
				if (!confirm) {
					setConfirm(true);
				} else {
					onConfirm();
					setConfirm(false);
				}
			}}>
				{confirm ? `Confirm Reset` : children}
			</BeamButtonBgDarken>
		</div>
	);
};

// ---------------- Simplified Model Settings Dialog ------------------

// keys of ModelOverrides we allow the user to override



// This new dialog replaces the verbose UI with a single JSON override box.
const SimpleModelSettingsDialog = ({
	isOpen,
	onClose,
	modelInfo,
}: {
	isOpen: boolean;
	onClose: () => void;
	modelInfo: { modelName: string; providerName: ProviderName; type: 'autodetected' | 'custom' | 'default' } | null;
}) => {
	if (!isOpen || !modelInfo) return null;

	const { modelName, providerName, type } = modelInfo;
	const accessor = useAccessor()
	const settingsState = useSettingsState()
	const mouseDownInsideModal = useRef(false); // Ref to track mousedown origin
	const settingsStateService = accessor.get('IBeamSettingsService')

	// current overrides and defaults
	const defaultModelCapabilities = getModelCapabilities(providerName, modelName, undefined);
	const currentOverrides = settingsState.overridesOfModel?.[providerName]?.[modelName] ?? undefined;
	const { recognizedModelName, isUnrecognizedModel } = defaultModelCapabilities

	// Create the placeholder with the default values for allowed keys
	const partialDefaults: Partial<ModelOverrides> = {};
	for (const k of modelOverrideKeys) { if (defaultModelCapabilities[k]) partialDefaults[k] = defaultModelCapabilities[k] as any; }
	const placeholder = JSON.stringify(partialDefaults, null, 2);

	const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => !!currentOverrides);

	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

	// reset when dialog toggles
	useEffect(() => {
		if (!isOpen) return;
		const cur = settingsState.overridesOfModel?.[providerName]?.[modelName];
		setOverrideEnabled(!!cur);
		setErrorMsg(null);
	}, [isOpen, providerName, modelName, settingsState.overridesOfModel, placeholder]);

	const onSave = async () => {
		// if disabled override, reset overrides
		if (!overrideEnabled) {
			await settingsStateService.setOverridesOfModel(providerName, modelName, undefined);
			onClose();
			return;
		}

		// enabled overrides
		// parse json
		let parsedInput: Record<string, unknown>

		if (textAreaRef.current?.value) {
			try {
				parsedInput = JSON.parse(textAreaRef.current.value);
			} catch (e) {
				setErrorMsg('Invalid JSON');
				return;
			}
		} else {
			setErrorMsg('Invalid JSON');
			return;
		}

		// only keep allowed keys
		const cleaned: Partial<ModelOverrides> = {};
		for (const k of modelOverrideKeys) {
			if (!(k in parsedInput)) continue
			const isEmpty = parsedInput[k] === '' || parsedInput[k] === null || parsedInput[k] === undefined;
			if (!isEmpty) {
				cleaned[k] = parsedInput[k] as any;
			}
		}
		await settingsStateService.setOverridesOfModel(providerName, modelName, cleaned);
		onClose();
	};

	const sourcecodeOverridesLink = `https://github.com/devxyasir/beam/blob/main/src/vs/workbench/contrib/beam/common/modelCapabilities.ts#L146-L172`

	return (
		<div // Backdrop
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]"
			onMouseDown={() => {
				mouseDownInsideModal.current = false;
			}}
			onMouseUp={() => {
				if (!mouseDownInsideModal.current) {
					onClose();
				}
				mouseDownInsideModal.current = false;
			}}
		>
			{/* MODAL */}
			<div
				className="bg-beam-bg-1 rounded-md p-4 max-w-xl w-full shadow-xl overflow-y-auto max-h-[90vh]"
				onClick={(e) => e.stopPropagation()} // Keep stopping propagation for normal clicks inside
				onMouseDown={(e) => {
					mouseDownInsideModal.current = true;
					e.stopPropagation();
				}}
			>
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-medium">
						Change Defaults for {modelName} ({displayInfoOfProviderName(providerName).title})
					</h3>
					<button
						onClick={onClose}
						className="text-beam-fg-3 hover:text-beam-fg-1"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Display model recognition status */}
				<div className="text-sm text-beam-fg-3 mb-4">
					{type === 'default' ? `${modelName} comes packaged with Beam, so you shouldn't need to change these settings.`
						: isUnrecognizedModel
							? `Model not recognized by Beam.`
							: `Beam recognizes ${modelName} ("${recognizedModelName}").`}
				</div>


				{/* override toggle */}
				<div className="flex items-center gap-2 mb-4">
					<BeamSwitch size='xs' value={overrideEnabled} onChange={setOverrideEnabled} />
					<span className="text-beam-fg-3 text-sm">Override model defaults</span>
				</div>

				{/* Informational link */}
				{overrideEnabled && <div className="text-sm text-beam-fg-3 mb-4">
					<ChatMarkdownRender string={`See the [sourcecode](${sourcecodeOverridesLink}) for a reference on how to set this JSON (advanced).`} chatMessageLocation={undefined} />
				</div>}

				<textarea
					key={overrideEnabled + ''}
					ref={textAreaRef}
					className={`w-full min-h-[200px] p-2 rounded-sm border border-beam-border-2 bg-beam-bg-2 resize-none font-mono text-sm ${!overrideEnabled ? 'text-beam-fg-3' : ''}`}
					defaultValue={overrideEnabled && currentOverrides ? JSON.stringify(currentOverrides, null, 2) : placeholder}
					placeholder={placeholder}
					readOnly={!overrideEnabled}
				/>
				{errorMsg && (
					<div className="text-red-500 mt-2 text-sm">{errorMsg}</div>
				)}


				<div className="flex justify-end gap-2 mt-4">
					<BeamButtonBgDarken onClick={onClose} className="px-3 py-1">
						Cancel
					</BeamButtonBgDarken>
					<BeamButtonBgDarken
						onClick={onSave}
						className="px-3 py-1 bg-[#0e70c0] text-white"
					>
						Save
					</BeamButtonBgDarken>
				</div>
			</div>
		</div>
	);
};




export const ModelDump = ({ filteredProviders }: { filteredProviders?: ProviderName[] }) => {
	const accessor = useAccessor()
	const settingsStateService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()

	// State to track which model's settings dialog is open
	const [openSettingsModel, setOpenSettingsModel] = useState<{
		modelName: string,
		providerName: ProviderName,
		type: 'autodetected' | 'custom' | 'default'
	} | null>(null);

	// States for add model functionality
	const [isAddModelOpen, setIsAddModelOpen] = useState(false);
	const [showCheckmark, setShowCheckmark] = useState(false);
	const [userChosenProviderName, setUserChosenProviderName] = useState<ProviderName | null>(null);
	const [modelName, setModelName] = useState<string>('');
	const [errorString, setErrorString] = useState('');

	// a dump of all the enabled providers' models
	const modelDump: (BeamStatefulModelInfo & { providerName: ProviderName, providerEnabled: boolean })[] = []

	// Use either filtered providers or all providers
	const providersToShow = filteredProviders || nonlocalProviderNames;

	for (let providerName of providersToShow) {
		const providerSettings = settingsState.settingsOfProvider[providerName]
		// if (!providerSettings.enabled) continue
		modelDump.push(...providerSettings.models.map(model => ({ ...model, providerName, providerEnabled: !!providerSettings._didFillInProviderSettings })))
	}

	// sort by hidden
	modelDump.sort((a, b) => {
		return Number(b.providerEnabled) - Number(a.providerEnabled)
	})

	// Add model handler
	const handleAddModel = () => {
		if (!userChosenProviderName) {
			setErrorString('Please select a provider.');
			return;
		}
		if (!modelName) {
			setErrorString('Please enter a model name.');
			return;
		}

		// Check if model already exists
		if (settingsState.settingsOfProvider[userChosenProviderName].models.find(m => m.modelName === modelName)) {
			setErrorString(`This model already exists.`);
			return;
		}

		settingsStateService.addModel(userChosenProviderName, modelName);
		setShowCheckmark(true);
		setTimeout(() => {
			setShowCheckmark(false);
			setIsAddModelOpen(false);
			setUserChosenProviderName(null);
			setModelName('');
		}, 1500);
		setErrorString('');
	};

	return <div className=''>
		{modelDump.map((m, i) => {
			const { isHidden, type, modelName, providerName, providerEnabled } = m

			const isNewProviderName = (i > 0 ? modelDump[i - 1] : undefined)?.providerName !== providerName

			const providerTitle = displayInfoOfProviderName(providerName).title

			const disabled = !providerEnabled
			const value = disabled ? false : !isHidden

			const tooltipName = (
				disabled ? `Add ${providerTitle} to enable`
					: value === true ? 'Show in Dropdown'
						: 'Hide from Dropdown'
			)


			const detailAboutModel = type === 'autodetected' ?
				<Asterisk size={14} className="inline-block align-text-top brightness-115 stroke-[2] text-[#0e70c0]" data-tooltip-id='beam-tooltip' data-tooltip-place='right' data-tooltip-content='Detected locally' />
				: type === 'custom' ?
					<Asterisk size={14} className="inline-block align-text-top brightness-115 stroke-[2] text-[#0e70c0]" data-tooltip-id='beam-tooltip' data-tooltip-place='right' data-tooltip-content='Custom model' />
					: undefined

			const hasOverrides = !!settingsState.overridesOfModel?.[providerName]?.[modelName]

			return <div key={`${modelName}${providerName}`}
				className={`flex items-center justify-between gap-4 hover:bg-black/10 dark:hover:bg-gray-300/10 py-1 px-3 rounded-sm overflow-hidden cursor-default truncate group
				`}
			>
				{/* left part is width:full */}
				<div className={`flex flex-grow items-center gap-4`}>
					<span className='w-full max-w-32'>{isNewProviderName ? providerTitle : ''}</span>
					<span className='w-fit max-w-[400px] truncate'>{modelName}</span>
				</div>

				{/* right part is anything that fits */}
				<div className="flex items-center gap-2 w-fit">

					{/* Advanced Settings button (gear). Hide entirely when provider/model disabled. */}
					{disabled ? null : (
						<div className="w-5 flex items-center justify-center">
							<button
								onClick={() => { setOpenSettingsModel({ modelName, providerName, type }) }}
								data-tooltip-id='beam-tooltip'
								data-tooltip-place='right'
								data-tooltip-content='Advanced Settings'
								className={`${hasOverrides ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
							>
								<Plus size={12} className="text-beam-fg-3 opacity-50" />
							</button>
						</div>
					)}

					{/* Blue star */}
					{detailAboutModel}


					{/* Switch */}
					<BeamSwitch
						value={value}
						onChange={() => { settingsStateService.toggleModelHidden(providerName, modelName); }}
						disabled={disabled}
						size='sm'

						data-tooltip-id='beam-tooltip'
						data-tooltip-place='right'
						data-tooltip-content={tooltipName}
					/>

					{/* X button */}
					<div className={`w-5 flex items-center justify-center`}>
						{type === 'default' || type === 'autodetected' ? null : <button
							onClick={() => { settingsStateService.deleteModel(providerName, modelName); }}
							data-tooltip-id='beam-tooltip'
							data-tooltip-place='right'
							data-tooltip-content='Delete'
							className={`${hasOverrides ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
						>
							<X size={12} className="text-beam-fg-3 opacity-50" />
						</button>}
					</div>
				</div>
			</div>
		})}

		{/* Add Model Section */}
		{showCheckmark ? (
			<div className="mt-4">
				<AnimatedCheckmarkButton text='Added' className="bg-[#0e70c0] text-white px-3 py-1 rounded-sm" />
			</div>
		) : isAddModelOpen ? (
			<div className="mt-4">
				<form className="flex items-center gap-2">

					{/* Provider dropdown */}
					<ErrorBoundary>
						<BeamCustomDropdownBox
							options={providersToShow}
							selectedOption={userChosenProviderName}
							onChangeOption={(pn) => setUserChosenProviderName(pn)}
							getOptionDisplayName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
							getOptionDropdownName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
							getOptionsEqual={(a, b) => a === b}
							className="max-w-32 mx-2 w-full resize-none bg-beam-bg-1 text-beam-fg-1 placeholder:text-beam-fg-3 border border-beam-border-2 focus:border-beam-border-1 py-1 px-2 rounded"
							arrowTouchesText={false}
						/>
					</ErrorBoundary>

					{/* Model name input */}
					<ErrorBoundary>
						<BeamSimpleInputBox
							value={modelName}
							compact={true}
							onChangeValue={setModelName}
							placeholder='Model Name'
							className='max-w-32'
						/>
					</ErrorBoundary>

					{/* Add button */}
					<ErrorBoundary>
						<AddButton
							type='button'
							disabled={!modelName || !userChosenProviderName}
							onClick={handleAddModel}
						/>
					</ErrorBoundary>

					{/* X button to cancel */}
					<button
						type="button"
						onClick={() => {
							setIsAddModelOpen(false);
							setErrorString('');
							setModelName('');
							setUserChosenProviderName(null);
						}}
						className='text-beam-fg-4'
					>
						<X className='size-4' />
					</button>
				</form>

				{errorString && (
					<div className='text-red-500 truncate whitespace-nowrap mt-1'>
						{errorString}
					</div>
				)}
			</div>
		) : (
			<div
				className="text-beam-fg-4 flex flex-nowrap text-nowrap items-center hover:brightness-110 cursor-pointer mt-4"
				onClick={() => setIsAddModelOpen(true)}
			>
				<div className="flex items-center gap-1">
					<Plus size={16} />
					<span>Add a model</span>
				</div>
			</div>
		)}

		{/* Model Settings Dialog */}
		<SimpleModelSettingsDialog
			isOpen={openSettingsModel !== null}
			onClose={() => setOpenSettingsModel(null)}
			modelInfo={openSettingsModel}
		/>
	</div>
}



// providers




const ProviderSetting = ({ providerName, settingName, subTextMd }: { providerName: ProviderName, settingName: SettingName, subTextMd: React.ReactNode }) => {

	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const nativeHostService = accessor.get('INativeHostService') // for opening URLs

	const { title: settingTitle, placeholder, isPasswordField } = displayInfoOfSettingName(providerName, settingName)

	const settingValue = settingsState.settingsOfProvider[providerName][settingName] as string
	if (typeof settingValue !== 'string') {
		return null
	}

	const handleChangeValue = useCallback((newVal: string) => {
		beamSettingsService.setSettingOfProvider(providerName, settingName, newVal)
	}, [beamSettingsService, providerName, settingName]);

	// ─── Special Case: Beam Cloud Sign In ────────────────────────────────────
	if (providerName === 'beamCloud' && settingName === 'beamToken') {
		const isSignedIn = !!settingValue;

		return <ErrorBoundary>
			<div className='my-2 flex flex-col gap-2'>
				<div className='flex items-center gap-3'>
					{!isSignedIn ? (
						<BeamButtonBgDarken
							className="bg-[#0e70c0] text-white px-4 py-1.5 flex items-center gap-2"
							onClick={async () => {
								const pendingAuth = startBeamAuthListener('deep_link');
								const authUrl = await beamSettingsService.getBeamCloudAuthUrl(pendingAuth.state, nativeHostService.windowId);
								nativeHostService.openExternal(authUrl);
							}}
						>
							Sign In to Beam Cloud
						</BeamButtonBgDarken>
					) : (
						<div className="flex items-center gap-2">
							<div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
							<span className="text-sm font-medium text-beam-fg-1">Signed In</span>
							<button
								className="text-xs text-beam-fg-3 hover:text-red-500 ml-4 underline underline-offset-4"
								onClick={() => {
									cancelBeamAuthListener();
									beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', '');
									beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', '');
									beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', '');
									beamSettingsService.setBeamCloudModels([]);
								}}
							>
								Sign Out
							</button>
						</div>
					)}
				</div>
				{!subTextMd ? null : <div className='py-1 px-1 opacity-70 text-sm'>
					{subTextMd}
				</div>}
			</div>
		</ErrorBoundary>
	}

	return <ErrorBoundary>
		<div className='my-1'>
			<BeamSimpleInputBox
				value={settingValue}
				onChangeValue={handleChangeValue}
				placeholder={`${settingTitle} (${placeholder})`}
				passwordBlur={isPasswordField}
				compact={true}
			/>
			{!subTextMd ? null : <div className='py-1 px-3 opacity-50 text-sm'>
				{subTextMd}
			</div>}
		</div>
	</ErrorBoundary>
}

// const OldSettingsForProvider = ({ providerName, showProviderTitle }: { providerName: ProviderName, showProviderTitle: boolean }) => {
// 	const beamSettingsState = useSettingsState()

// 	const needsModel = isProviderNameDisabled(providerName, beamSettingsState) === 'addModel'

// 	// const accessor = useAccessor()
// 	// const beamSettingsService = accessor.get('IBeamSettingsService')

// 	// const { enabled } = beamSettingsState.settingsOfProvider[providerName]
// 	const settingNames = customSettingNamesOfProvider(providerName)

// 	const { title: providerTitle } = displayInfoOfProviderName(providerName)

// 	return <div className='my-4'>

// 		<div className='flex items-center w-full gap-4'>
// 			{showProviderTitle && <h3 className='text-xl truncate'>{providerTitle}</h3>}

// 			{/* enable provider switch */}
// 			{/* <BeamSwitch
// 				value={!!enabled}
// 				onChange={
// 					useCallback(() => {
// 						const enabledRef = beamSettingsService.state.settingsOfProvider[providerName].enabled
// 						beamSettingsService.setSettingOfProvider(providerName, 'enabled', !enabledRef)
// 					}, [beamSettingsService, providerName])}
// 				size='sm+'
// 			/> */}
// 		</div>

// 		<div className='px-0'>
// 			{/* settings besides models (e.g. api key) */}
// 			{settingNames.map((settingName, i) => {
// 				return <ProviderSetting key={settingName} providerName={providerName} settingName={settingName} />
// 			})}

// 			{needsModel ?
// 				providerName === 'ollama' ?
// 					<WarningBox text={`Please install an Ollama model. We'll auto-detect it.`} />
// 					: <WarningBox text={`Please add a model for ${providerTitle} (Models section).`} />
// 				: null}
// 		</div>
// 	</div >
// }


export const SettingsForProvider = ({ providerName, showProviderTitle, showProviderSuggestions }: { providerName: ProviderName, showProviderTitle: boolean, showProviderSuggestions: boolean }) => {
	const beamSettingsState = useSettingsState()

	const needsModel = isProviderNameDisabled(providerName, beamSettingsState) === 'addModel'

	// const accessor = useAccessor()
	// const beamSettingsService = accessor.get('IBeamSettingsService')

	// const { enabled } = beamSettingsState.settingsOfProvider[providerName]
	const settingNames = customSettingNamesOfProvider(providerName)

	const { title: providerTitle } = displayInfoOfProviderName(providerName)

	return <div>

		<div className='flex items-center w-full gap-4'>
			{showProviderTitle && <h3 className='text-xl truncate'>{providerTitle}</h3>}

			{/* enable provider switch */}
			{/* <BeamSwitch
				value={!!enabled}
				onChange={
					useCallback(() => {
						const enabledRef = beamSettingsService.state.settingsOfProvider[providerName].enabled
						beamSettingsService.setSettingOfProvider(providerName, 'enabled', !enabledRef)
					}, [beamSettingsService, providerName])}
				size='sm+'
			/> */}
		</div>

		<div className='px-0'>
			{/* settings besides models (e.g. api key) */}
			{ (providerName as any === 'beamCloud' || providerName as any === 'beam-cloud') ? (
				<BeamCloudUsageSection />
			) : (
				settingNames.map((settingName, i) => {
					return <ProviderSetting
						key={settingName}
						providerName={providerName}
						settingName={settingName}
						subTextMd={i !== settingNames.length - 1 ? null
							: <ChatMarkdownRender string={subTextMdOfProviderName(providerName)} chatMessageLocation={undefined} />}
					/>
				})
			)}

			{showProviderSuggestions && needsModel ?
				providerName === 'ollama' ?
					<WarningBox className="pl-2 mb-4" text={`Please install an Ollama model. We'll auto-detect it.`} />
					: <WarningBox className="pl-2 mb-4" text={`Please add a model for ${providerTitle} (Models section).`} />
				: null}
		</div>
	</div >
}


export const BeamProviderSettings = ({ providerNames }: { providerNames: ProviderName[] }) => {
	return <>
		{providerNames.map(providerName =>
			<SettingsForProvider key={providerName} providerName={providerName} showProviderTitle={true} showProviderSuggestions={true} />
		)}
	</>
}


type TabName = 'models' | 'general'
export const AutoDetectLocalModelsToggle = () => {
	const settingName: GlobalSettingName = 'autoRefreshModels'

	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const metricsService = accessor.get('IMetricsService')

	const beamSettingsState = useSettingsState()

	// right now this is just `enabled_autoRefreshModels`
	const enabled = beamSettingsState.globalSettings[settingName]

	return <ButtonLeftTextRightOption
		leftButton={<BeamSwitch
			size='xxs'
			value={enabled}
			onChange={(newVal) => {
				beamSettingsService.setGlobalSetting(settingName, newVal)
				metricsService.capture('Click', { action: 'Autorefresh Toggle', settingName, enabled: newVal })
			}}
		/>}
		text={`Automatically detect local providers and models (${refreshableProviderNames.map(providerName => displayInfoOfProviderName(providerName).title).join(', ')}).`}
	/>


}

export const AIInstructionsBox = () => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const beamSettingsState = useSettingsState()
	return <BeamInputBox2
		className='min-h-[81px] p-3 rounded-sm'
		initValue={beamSettingsState.globalSettings.aiInstructions}
		placeholder={`Do not change my indentation or delete my comments. When writing TS or JS, do not add ;'s. Write new code using Rust if possible. `}
		multiline
		onChangeText={(newText) => {
			beamSettingsService.setGlobalSetting('aiInstructions', newText)
		}}
	/>
}

const FastApplyMethodDropdown = () => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')

	const options = useMemo(() => [true, false], [])

	const onChangeOption = useCallback((newVal: boolean) => {
		beamSettingsService.setGlobalSetting('enableFastApply', newVal)
	}, [beamSettingsService])

	return <BeamCustomDropdownBox
		className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1'
		options={options}
		selectedOption={beamSettingsService.state.globalSettings.enableFastApply}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
		getOptionDropdownName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
		getOptionDropdownDetail={(val) => val ? 'Output Search/Replace blocks' : 'Rewrite whole files'}
		getOptionsEqual={(a, b) => a === b}
	/>

}


export const OllamaSetupInstructions = ({ sayWeAutoDetect }: { sayWeAutoDetect?: boolean }) => {
	return <div className='prose-p:my-0 prose-ol:list-decimal prose-p:py-0 prose-ol:my-0 prose-ol:py-0 prose-span:my-0 prose-span:py-0 text-beam-fg-3 text-sm list-decimal select-text'>
		<div className=''><ChatMarkdownRender string={`Ollama Setup Instructions`} chatMessageLocation={undefined} /></div>
		<div className=' pl-6'><ChatMarkdownRender string={`1. Download [Ollama](https://ollama.com/download).`} chatMessageLocation={undefined} /></div>
		<div className=' pl-6'><ChatMarkdownRender string={`2. Open your terminal.`} chatMessageLocation={undefined} /></div>
		<div
			className='pl-6 flex items-center w-fit'
			data-tooltip-id='beam-tooltip-ollama-settings'
		>
			<ChatMarkdownRender string={`3. Run \`ollama pull your_model\` to install a model.`} chatMessageLocation={undefined} />
		</div>
		{sayWeAutoDetect && <div className=' pl-6'><ChatMarkdownRender string={`Beam automatically detects locally running models and enables them.`} chatMessageLocation={undefined} /></div>}
	</div>
}


const RedoOnboardingButton = ({ className }: { className?: string }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	return <div
		className={`text-beam-fg-4 flex flex-nowrap text-nowrap items-center hover:brightness-110 cursor-pointer ${className}`}
		onClick={() => { beamSettingsService.setGlobalSetting('isOnboardingComplete', false) }}
	>
		See onboarding screen?
	</div>

}







export const ToolApprovalTypeSwitch = ({ approvalType, size, desc }: { approvalType: ToolApprovalType, size: "xxs" | "xs" | "sm" | "sm+" | "md", desc: string }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const beamSettingsState = useSettingsState()
	const metricsService = accessor.get('IMetricsService')

	const onToggleAutoApprove = useCallback((approvalType: ToolApprovalType, newValue: boolean) => {
		beamSettingsService.setGlobalSetting('autoApprove', {
			...beamSettingsService.state.globalSettings.autoApprove,
			[approvalType]: newValue
		})
		metricsService.capture('Tool Auto-Accept Toggle', { enabled: newValue })
	}, [beamSettingsService, metricsService])

	return <>
		<BeamSwitch
			size={size}
			value={beamSettingsState.globalSettings.autoApprove[approvalType] ?? false}
			onChange={(newVal) => onToggleAutoApprove(approvalType, newVal)}
		/>
		<span className="text-beam-fg-3 text-xs">{desc}</span>
	</>
}



export const OneClickSwitchButton = ({ fromEditor = 'VS Code', className = '' }: { fromEditor?: TransferEditorType, className?: string }) => {
	const accessor = useAccessor()
	const extensionTransferService = accessor.get('IExtensionTransferService')

	const [transferState, setTransferState] = useState<{ type: 'done', error?: string } | { type: | 'loading' | 'justfinished' }>({ type: 'done' })



	const onClick = async () => {
		if (transferState.type !== 'done') return

		setTransferState({ type: 'loading' })

		const errAcc = await extensionTransferService.transferExtensions(os, fromEditor)

		// Even if some files were missing, consider it a success if no actual errors occurred
		const hadError = !!errAcc
		if (hadError) {
			setTransferState({ type: 'done', error: errAcc })
		}
		else {
			setTransferState({ type: 'justfinished' })
			setTimeout(() => { setTransferState({ type: 'done' }); }, 3000)
		}
	}

	return <>
		<BeamButtonBgDarken className={`max-w-48 p-4 ${className}`} disabled={transferState.type !== 'done'} onClick={onClick}>
			{transferState.type === 'done' ? `Transfer from ${fromEditor}`
				: transferState.type === 'loading' ? <span className='text-nowrap flex flex-nowrap'>Transferring<IconLoading /></span>
					: transferState.type === 'justfinished' ? <AnimatedCheckmarkButton text='Settings Transferred' className='bg-none' />
						: null
			}
		</BeamButtonBgDarken>
		{transferState.type === 'done' && transferState.error ? <WarningBox text={transferState.error} /> : null}
	</>
}

type ConfigurationRowProps = {
	title: string;
	description?: React.ReactNode;
	control: React.ReactNode;
	children?: React.ReactNode;
}

const ConfigurationRow = ({ title, description, control, children }: ConfigurationRowProps) => {
	return <div className='grid grid-cols-[1fr_auto] gap-6 items-start py-4'>
		<div className='min-w-0'>
			<div className='text-sm font-semibold text-beam-fg-1'>{title}</div>
			{description ? <div className='text-sm text-beam-fg-3 mt-1 leading-5'>{description}</div> : null}
			{children}
		</div>
		<div className='pt-1'>{control}</div>
	</div>
}

const ConfigurationSwitch = ({ settingName }: { settingName: GlobalSettingName }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	return <BeamSwitch
		size='sm'
		value={!!settingsState.globalSettings[settingName]}
		onChange={(newVal) => beamSettingsService.setGlobalSetting(settingName, newVal as any)}
	/>
}

const ConfigurationDropdown = <T extends string,>({
	options,
	value,
	onChange,
	display,
	detail,
}: {
	options: T[];
	value: T;
	onChange: (value: T) => void;
	display: (value: T) => string;
	detail: (value: T) => string;
}) => {
	return <BeamCustomDropdownBox
		className='min-w-32 text-xs text-beam-fg-1 bg-beam-bg-1 border border-beam-border-1 rounded px-2 py-1'
		options={options}
		selectedOption={value}
		onChangeOption={onChange}
		getOptionDisplayName={display}
		getOptionDropdownName={display}
		getOptionDropdownDetail={detail}
		getOptionsEqual={(a, b) => a === b}
		matchInputWidth
	/>
}

const BulletHelp = ({ items }: { items: string[] }) => {
	return <ul className='text-sm text-beam-fg-3 mt-2 pl-5 list-disc leading-5'>
		{items.map(item => <li key={item}>{item}</li>)}
	</ul>
}

const ConfigurationLinkButton = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => {
	return <button
		className='text-sm text-[#2f9bff] hover:text-[#66b7ff] transition-colors mt-3'
		onClick={onClick}
	>
		{children}
	</button>
}

type StringListSettingName = Extract<GlobalSettingName, 'terminalAllowlist' | 'terminalDenylist' | 'webAllowlist' | 'skills' | 'workflows' | 'memories'>

const ConfigurationPanel = ({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) => {
	return <div className='mt-4 rounded-md border border-beam-border-2 bg-beam-bg-1 px-4 py-3'>
		<div className='text-sm font-semibold text-beam-fg-1'>{title}</div>
		{description ? <div className='mt-1 text-sm text-beam-fg-3 leading-5'>{description}</div> : null}
		<div className='mt-3'>{children}</div>
	</div>
}

const SettingsStringListEditor = ({ settingName, placeholder }: { settingName: StringListSettingName; placeholder: string }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const items = (settingsState.globalSettings[settingName] ?? []) as string[]
	const [draft, setDraft] = useState('')

	const addItem = () => {
		const next = draft.trim()
		if (!next || items.includes(next)) return
		beamSettingsService.setGlobalSetting(settingName, [...items, next] as any)
		setDraft('')
	}

	const removeItem = (item: string) => {
		beamSettingsService.setGlobalSetting(settingName, items.filter(current => current !== item) as any)
	}

	return <div className='space-y-2'>
		<div className='flex gap-2'>
			<BeamSimpleInputBox
				className='flex-1 rounded border border-beam-border-2 bg-beam-bg-2 px-2 py-1 text-sm text-beam-fg-1'
				value={draft}
				placeholder={placeholder}
				onChangeValue={setDraft}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault()
						addItem()
					}
				}}
			/>
			<button
				className='inline-flex items-center gap-1 rounded border border-beam-border-2 bg-beam-bg-2 px-2 text-xs text-beam-fg-1 hover:bg-beam-bg-2-hover'
				onClick={addItem}
			>
				<Plus size={13} /> Add
			</button>
		</div>
		<div className='flex flex-col gap-1'>
			{items.length === 0 ? <div className='text-xs text-beam-fg-4'>No entries yet.</div> : items.map(item => (
				<div key={item} className='flex items-center gap-2 rounded border border-beam-border-3 bg-beam-bg-2 px-2 py-1'>
					<code className='min-w-0 flex-1 truncate text-xs text-[#67b7ff]'>{item}</code>
					<button className='text-beam-fg-4 hover:text-beam-fg-1' onClick={() => removeItem(item)} aria-label={`Remove ${item}`}>
						<X size={13} />
					</button>
				</div>
			))}
		</div>
	</div>
}

const BeamRulesEditor = () => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	return <BeamInputBox2
		className='min-h-[140px] rounded border border-beam-border-2 bg-beam-bg-2 p-3 text-sm'
		initValue={settingsState.globalSettings.beamRules}
		placeholder='Example: Prefer small, safe edits. Always run the relevant build after changing TypeScript.'
		multiline
		onChangeText={(newText) => beamSettingsService.setGlobalSetting('beamRules', newText)}
	/>
}

type CustomizationTab = 'rules' | 'skills' | 'workflows' | 'memories'

const listToMarkdown = (title: string, items: string[]) => {
	return [`# ${title}`, '', ...items.map((item, index) => `## ${index + 1}\n${item.trim()}`).filter(Boolean)].join('\n\n').trim() + '\n'
}

const markdownToList = (markdown: string) => {
	const withoutTitle = markdown.replace(/^# .*(\r?\n)+/, '').trim()
	if (!withoutTitle) return []
	const sections = withoutTitle.split(/\r?\n##\s+\d+\s*\r?\n|^##\s+\d+\s*\r?\n/m)
	return sections.map(section => section.replace(/^##\s+\d+\s*/, '').trim()).filter(Boolean)
}

const rulesToMarkdown = (rules: string) => `# Beam Rules\n\n${rules.trim()}\n`
const markdownToRules = (markdown: string) => markdown.replace(/^# Beam Rules\s*/i, '').trim()

const CustomizationCard = ({ title, meta, description, onRemove }: { title: string; meta?: string; description?: string; onRemove?: () => void }) => {
	return <div className='group rounded border border-beam-border-2 bg-beam-bg-1 px-3 py-2'>
		<div className='flex items-start gap-3'>
			<div className='min-w-0 flex-1'>
				<div className='truncate text-sm font-semibold text-beam-fg-1'>{title}</div>
				{description ? <div className='mt-1 text-sm text-beam-fg-3 leading-5'>{description}</div> : null}
				{meta ? <div className='mt-1 text-xs text-beam-fg-4'>{meta}</div> : null}
			</div>
			{onRemove ? <button className='text-beam-fg-4 opacity-0 transition-opacity hover:text-beam-fg-1 group-hover:opacity-100' onClick={onRemove} aria-label={`Remove ${title}`}>
				<X size={14} />
			</button> : null}
		</div>
	</div>
}

const CustomizationListPage = ({
	settingName,
	emptyText,
	placeholder,
	addLabel,
	workspaceLabel,
}: {
	settingName: Extract<StringListSettingName, 'skills' | 'workflows' | 'memories'>;
	emptyText: string;
	placeholder: string;
	addLabel: string;
	workspaceLabel?: string;
}) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const items = (settingsState.globalSettings[settingName] ?? []) as string[]
	const [draft, setDraft] = useState('')
	const [query, setQuery] = useState('')
	const filtered = items.filter(item => item.toLowerCase().includes(query.toLowerCase()))

	const addItem = () => {
		const next = draft.trim()
		if (!next) return
		beamSettingsService.setGlobalSetting(settingName, [next, ...items.filter(item => item !== next)] as any)
		setDraft('')
	}

	const removeItem = (item: string) => beamSettingsService.setGlobalSetting(settingName, items.filter(current => current !== item) as any)

	return <div>
		<div className='mb-3 flex items-center justify-between gap-3'>
			<div />
			{settingName === 'memories' ? <BeamSimpleInputBox
				value={query}
				onChangeValue={setQuery}
				placeholder='Search memories'
				className='w-48 rounded border border-beam-border-2 bg-beam-bg-1 px-2 py-1 text-sm'
			/> : null}
		</div>
		<div className='mb-4 flex gap-2'>
			<BeamSimpleInputBox
				value={draft}
				onChangeValue={setDraft}
				placeholder={placeholder}
				className='flex-1 rounded border border-beam-border-2 bg-beam-bg-1 px-2 py-1 text-sm'
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault()
						addItem()
					}
				}}
			/>
			<button className='rounded border border-beam-border-2 bg-beam-bg-2 px-3 text-sm text-beam-fg-1 hover:bg-beam-bg-2-hover' onClick={addItem}>+ {addLabel}</button>
		</div>
		<div className='space-y-0 overflow-hidden rounded border border-beam-border-2'>
			{filtered.length === 0 ? <div className='px-3 py-3 text-sm text-beam-fg-4'>{emptyText}</div> : filtered.map((item, index) => {
				const [firstLine, ...rest] = item.split(/\r?\n/)
				const [name, inlineDescription] = firstLine.includes(':') ? firstLine.split(/:(.*)/).filter(Boolean) : [firstLine, undefined]
				return <CustomizationCard
					key={`${item}-${index}`}
					title={name.trim()}
					description={(inlineDescription || rest.join(' ')).trim()}
					meta={workspaceLabel ?? 'Global'}
					onRemove={() => removeItem(item)}
				/>
			})}
		</div>
	</div>
}

const CustomizationsSection = () => {
	const accessor = useAccessor()
	const fileService = accessor.get('IFileService')
	const environmentService = accessor.get('IEnvironmentService')
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const [tab, setTab] = useState<CustomizationTab>('rules')
	const [hasLoadedFiles, setHasLoadedFiles] = useState(false)

	const beamDir = useMemo(() => joinPath(environmentService.userRoamingDataHome, 'Beam'), [environmentService])
	const files = useMemo(() => ({
		rules: joinPath(beamDir, 'rules.md'),
		skills: joinPath(beamDir, 'skills.md'),
		workflows: joinPath(beamDir, 'workflows.md'),
		memories: joinPath(beamDir, 'memories.md'),
	}), [beamDir])

	useEffect(() => {
		let disposed = false
		const loadMarkdownFiles = async () => {
			try {
				await fileService.createFolder(beamDir)
				const readIfExists = async (uri: URI) => {
					if (!await fileService.exists(uri)) return ''
					return (await fileService.readFile(uri)).value.toString()
				}
				const [rules, skills, workflows, memories] = await Promise.all([
					readIfExists(files.rules),
					readIfExists(files.skills),
					readIfExists(files.workflows),
					readIfExists(files.memories),
				])
				if (disposed) return
				if (rules) await beamSettingsService.setGlobalSetting('beamRules', markdownToRules(rules))
				if (skills) await beamSettingsService.setGlobalSetting('skills', markdownToList(skills))
				if (workflows) await beamSettingsService.setGlobalSetting('workflows', markdownToList(workflows))
				if (memories) await beamSettingsService.setGlobalSetting('memories', markdownToList(memories))
			}
			finally {
				if (!disposed) setHasLoadedFiles(true)
			}
		}
		loadMarkdownFiles()
		return () => { disposed = true }
	}, [beamSettingsService, beamDir, fileService, files.memories, files.rules, files.skills, files.workflows])

	useEffect(() => {
		if (!hasLoadedFiles) return
		const writeMarkdownFiles = async () => {
			try {
				await fileService.createFolder(beamDir)
				await Promise.all([
					fileService.writeFile(files.rules, VSBuffer.fromString(rulesToMarkdown(settingsState.globalSettings.beamRules ?? ''))),
					fileService.writeFile(files.skills, VSBuffer.fromString(listToMarkdown('Beam Skills', settingsState.globalSettings.skills ?? []))),
					fileService.writeFile(files.workflows, VSBuffer.fromString(listToMarkdown('Beam Workflows', settingsState.globalSettings.workflows ?? []))),
					fileService.writeFile(files.memories, VSBuffer.fromString(listToMarkdown('Beam Memories', settingsState.globalSettings.memories ?? []))),
				])
			}
			catch (error) {
				console.error('Failed to persist Beam customizations', error)
			}
		}
		writeMarkdownFiles()
	}, [
		beamDir,
		fileService,
		files.memories,
		files.rules,
		files.skills,
		files.workflows,
		hasLoadedFiles,
		settingsState.globalSettings.beamRules,
		settingsState.globalSettings.skills,
		settingsState.globalSettings.workflows,
		settingsState.globalSettings.memories,
	])

	const tabs: { id: CustomizationTab; label: string }[] = [
		{ id: 'rules', label: 'Rules' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'workflows', label: 'Workflows' },
		{ id: 'memories', label: 'Memories' },
	]

	return <div className='max-w-[720px]'>
		<div className='mb-4 border-b border-beam-border-2 pb-3'>
			<div className='text-2xl font-semibold text-beam-fg-1'>Customizations</div>
			<div className='mt-1 text-sm text-beam-fg-3'>Customize Beam to get a better, more personalized experience.</div>
		</div>
		<div className='mb-5 flex gap-7 border-b border-beam-border-2'>
			{tabs.map(item => <button
				key={item.id}
				className={`pb-2 text-sm font-semibold ${tab === item.id ? 'border-b-2 border-beam-fg-1 text-beam-fg-1' : 'text-beam-fg-3 hover:text-beam-fg-1'}`}
				onClick={() => setTab(item.id)}
			>{item.label}</button>)}
		</div>

		{tab === 'rules' && <div>
			<div className='mb-2 flex items-center justify-between'>
				<div className='text-base font-semibold text-beam-fg-1'>Rules</div>
				<button className='text-sm text-[#2f9bff] hover:text-[#66b7ff]' onClick={() => voidOpenFileFn(files.rules, accessor)}>Open rules.md</button>
			</div>
			<div className='mb-4 text-sm text-beam-fg-3'>Rules help guide the behavior of Beam. Global rules are automatically included in future agent context.</div>
			<BeamRulesEditor />
		</div>}

		{tab === 'skills' && <div>
			<div className='mb-2 flex items-center justify-between'>
				<div className='text-base font-semibold text-beam-fg-1'>Skills</div>
				<button className='text-sm text-[#2f9bff] hover:text-[#66b7ff]' onClick={() => voidOpenFileFn(files.skills, accessor)}>Open skills.md</button>
			</div>
			<div className='mb-4 text-sm text-beam-fg-3'>Skills are reusable behavior notes Beam can include as context while working.</div>
			<CustomizationListPage settingName='skills' emptyText='No skills saved yet.' placeholder='Type a skill note, for example: frontend polish: prefer compact Windsurf-style tool rows' addLabel='Global' />
		</div>}

		{tab === 'workflows' && <div>
			<div className='mb-2 flex items-center justify-between'>
				<div className='text-base font-semibold text-beam-fg-1'>Workflows</div>
				<button className='text-sm text-[#2f9bff] hover:text-[#66b7ff]' onClick={() => voidOpenFileFn(files.workflows, accessor)}>Open workflows.md</button>
			</div>
			<div className='mb-4 text-sm text-beam-fg-3'>Workflows are saved prompts that Beam can follow. To trigger one, type `/name` in Beam chat.</div>
			<CustomizationListPage settingName='workflows' emptyText='No workflows saved yet.' placeholder='review: Review code changes for bugs, security issues, and improvements' addLabel='Global' workspaceLabel='Global / Workspace' />
		</div>}

		{tab === 'memories' && <div>
			<div className='mb-2 flex items-center justify-between'>
				<div className='text-base font-semibold text-beam-fg-1'>Memories</div>
				<button className='text-sm text-[#2f9bff] hover:text-[#66b7ff]' onClick={() => voidOpenFileFn(files.memories, accessor)}>Open memories.md</button>
			</div>
			<div className='mb-4 text-sm text-beam-fg-3'>Memories are automatically generated by Beam to maintain context between conversations.</div>
			<CustomizationListPage settingName='memories' emptyText='No memories saved yet.' placeholder='Project uses pnpm and stores API routes in src/routes' addLabel='Memory' />
		</div>}
	</div>
}

const iconOfIntelligenceMode: Record<BeamIntelligenceMode, React.ReactNode> = {
	fast: <Zap className='size-4' />,
	balanced: <Scale className='size-4' />,
	powerful: <Brain className='size-4' />,
	free: <Gift className='size-4' />,
	local: <Monitor className='size-4' />,
}

const BeamModeCard = ({ mode }: { mode: BeamIntelligenceMode }) => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const selected = (settingsState.globalSettings.intelligenceMode ?? 'balanced') === mode
	const resolution = resolveBeamMode(settingsState, mode)
	const info = beamIntelligenceModeInfo[mode]

	return <button
		type='button'
		className={`@@beam-intelligence-card ${selected ? '@@beam-intelligence-card-selected' : ''}`}
		onClick={() => {
			beamSettingsService.setGlobalSetting('intelligenceMode', mode)
			if (resolution.selection) {
				beamSettingsService.setModelSelectionOfFeature('Chat', resolution.selection)
			}
		}}
	>
		<div className='flex items-start justify-between gap-3'>
			<div className='flex min-w-0 items-center gap-2'>
				<span className='@@beam-intelligence-card-icon'>{iconOfIntelligenceMode[mode]}</span>
				<div className='min-w-0 text-left'>
					<div className='text-sm font-semibold text-beam-fg-1'>{info.title}</div>
					<div className='mt-0.5 text-xs text-beam-fg-3'>{info.description}</div>
				</div>
			</div>
			{selected && <Check className='size-4 shrink-0 text-[#36d399]' />}
		</div>
		<div className='mt-3 flex flex-wrap gap-1.5 text-[10px] text-beam-fg-3'>
			<span className='@@beam-intelligence-chip'>{info.latency} latency</span>
			<span className='@@beam-intelligence-chip'>{info.capability}</span>
			<span className='@@beam-intelligence-chip'>{info.locality}</span>
		</div>
		{resolution.isFallback && <div className='mt-3 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-1.5 text-left text-xs text-yellow-200'>
			{resolution.fallbackReason}
		</div>}
	</button>
}

const RawModelSelectionDropdown = ({ value, onChange, className = '' }: { value: any; onChange: (value: any) => void; className?: string }) => {
	const settingsState = useSettingsState()
	const options = [{ name: 'Beam automatic', selection: null }, ...settingsState._modelOptions.map(option => ({ name: option.name, selection: option.selection }))]
	const selectedOption = options.find(option => {
		if (!option.selection && !value) return true
		return option.selection?.providerName === value?.providerName && option.selection?.modelName === value?.modelName
	}) ?? options[0]

	return <BeamCustomDropdownBox
		className={`text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1 ${className}`}
		options={options}
		selectedOption={selectedOption}
		onChangeOption={(option) => onChange(option.selection)}
		getOptionDisplayName={(option) => option.selection ? option.selection.modelName : 'Beam automatic'}
		getOptionDropdownName={(option) => option.selection ? option.selection.modelName : 'Beam automatic'}
		getOptionDropdownDetail={(option) => option.selection ? displayInfoOfProviderName(option.selection.providerName).title : 'Use Beam routing'}
		getOptionsEqual={(a, b) => a.selection?.providerName === b.selection?.providerName && a.selection?.modelName === b.selection?.modelName}
		matchInputWidth={false}
	/>
}

const ProviderStatusGrid = () => {
	const settingsState = useSettingsState()
	const refreshModelState = useRefreshModelState()
	const providers = (['beamCloud', 'ollama', 'lmStudio'] as ProviderName[])

	return <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
		{providers.map(providerName => {
			const status = getProviderUxStatus(settingsState, refreshModelState, providerName)
			return <div key={providerName} className={`@@beam-provider-card @@beam-provider-card-${status.state}`}>
				<div className='flex items-center gap-2 text-sm text-beam-fg-1'>
					<span className='@@beam-provider-status-dot' />
					<span>{status.label}</span>
				</div>
				<div className='mt-1 text-xs text-beam-fg-3'>{status.detail}</div>
			</div>
		})}
	</div>
}

const BeamIntelligenceSettingsSection = () => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const routing = resolveAgentRouting(settingsState)
	const [showAdvanced, setShowAdvanced] = useState(false)
	const verificationOptions: BeamVerificationLevel[] = ['light', 'standard', 'strict']

	const updateRouting = (role: AgentRoutingRole, selection: any) => {
		beamSettingsService.setGlobalSetting('agentModelRouting', {
			...settingsState.globalSettings.agentModelRouting,
			[role]: selection,
		})
	}

	return <div className='max-w-[760px]'>
		<div className='mb-6'>
			<h2 className='text-3xl mb-2'>Beam Intelligence</h2>
			<div className='text-sm text-beam-fg-3'>Choose how Beam routes work across cloud, free, powerful, and local models.</div>
		</div>

		<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
			{beamIntelligenceModes.map(mode => <BeamModeCard key={mode} mode={mode} />)}
		</div>

		<div className='mt-8 divide-y divide-beam-border-1'>
			<ConfigurationRow
				title='Default Interaction'
				description='Choose whether Beam starts as chat, context gatherer, or full agent.'
				control={<BeamCustomDropdownBox
					className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1'
					options={['normal', 'gather', 'agent'] as const}
					selectedOption={settingsState.globalSettings.chatMode}
					onChangeOption={(value) => beamSettingsService.setGlobalSetting('chatMode', value)}
					getOptionDisplayName={(value) => chatModeInfo[value].title}
					getOptionDropdownName={(value) => chatModeInfo[value].title}
					getOptionDropdownDetail={(value) => chatModeInfo[value].description}
					getOptionsEqual={(a, b) => a === b}
					matchInputWidth={false}
				/>}
			/>
			<ConfigurationRow
				title='Auto Fallback'
				description='When a preferred mode is unavailable, Beam quietly uses the best available model and shows a compact notice.'
				control={<ConfigurationSwitch settingName='autoFallbackEnabled' />}
			/>
			<ConfigurationRow
				title='Verification Level'
				description='Controls how strongly Agent mode verifies edits before final response.'
				control={<BeamCustomDropdownBox
					className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1'
					options={verificationOptions}
					selectedOption={settingsState.globalSettings.verificationLevel}
					onChangeOption={(value) => beamSettingsService.setGlobalSetting('verificationLevel', value)}
					getOptionDisplayName={(value) => value[0].toUpperCase() + value.slice(1)}
					getOptionDropdownName={(value) => value[0].toUpperCase() + value.slice(1)}
					getOptionDropdownDetail={(value) => value === 'light' ? 'Quick checks' : value === 'strict' ? 'More verification and retries' : 'Balanced verification'}
					getOptionsEqual={(a, b) => a === b}
					matchInputWidth={false}
				/>}
			/>
			<ConfigurationRow
				title='Vision'
				description='Allow Beam to route image-heavy requests to a vision-capable model when available.'
				control={<ConfigurationSwitch settingName='visionEnabled' />}
			/>
			<ConfigurationRow
				title='OCR'
				description='Allow Beam to use OCR-capable models for screenshots, diagrams, and scanned text when available.'
				control={<ConfigurationSwitch settingName='ocrEnabled' />}
			/>
		</div>

		<div className='mt-8'>
			<div className='mb-3 flex items-center gap-2 text-sm font-semibold text-beam-fg-1'>
				<Cloud className='size-4 text-[#60a5fa]' />
				Provider health
			</div>
			<ProviderStatusGrid />
		</div>

		<div className='mt-8 rounded-xl border border-beam-border-1 bg-beam-bg-2/40 p-4'>
			<button type='button' className='flex w-full items-center justify-between text-left' onClick={() => setShowAdvanced(value => !value)}>
				<span>
					<div className='flex items-center gap-2 text-sm font-semibold text-beam-fg-1'><Route className='size-4 text-[#60a5fa]' />Advanced routing</div>
					<div className='mt-1 text-xs text-beam-fg-3'>Inspect and optionally override planner, executor, verifier, vision, and OCR models.</div>
				</span>
				<span className='text-xs text-beam-fg-3'>{showAdvanced ? 'Hide' : 'Show'}</span>
			</button>
			{showAdvanced && <div className='mt-4 space-y-3'>
				{agentRoutingRoles.map(role => {
					const resolved = routing[role]
					return <div key={role} className='grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/5 bg-black/10 px-3 py-2'>
						<div className='text-xs font-semibold capitalize text-beam-fg-2'>{role}</div>
						<div className='min-w-0 text-xs text-beam-fg-3'>
							<span className='text-beam-fg-1'>{resolved.selection?.modelName ?? 'No model'}</span>
							{resolved.selection && <span className='ml-2 opacity-70'>{displayInfoOfProviderName(resolved.selection.providerName).title}</span>}
						</div>
						<RawModelSelectionDropdown
							value={settingsState.globalSettings.agentModelRouting?.[role] ?? null}
							onChange={(selection) => updateRouting(role, selection)}
						/>
					</div>
				})}
				<div className='pt-1 text-xs text-beam-fg-4'>Automatic routing remains the default. Overrides are advanced and only affect Beam orchestration UI/state until the matching backend task route uses them.</div>
			</div>}
		</div>
	</div>
}

const AgentConfigurationSection = () => {
	const accessor = useAccessor()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const settingsState = useSettingsState()
	const [activePanel, setActivePanel] = useState<'terminal' | 'web' | null>(null)

	const terminalOptions: TerminalAutoExecutionMode[] = ['disabled', 'allowlist', 'auto', 'turbo']
	const webOptions: WebAutoRequestMode[] = ['disabled', 'allowlist', 'turbo']

	const terminalLabel = (value: TerminalAutoExecutionMode) => {
		if (value === 'disabled') return 'Disabled'
		if (value === 'allowlist') return 'Allowlist'
		if (value === 'auto') return 'Auto'
		return 'Turbo'
	}
	const terminalDetail = (value: TerminalAutoExecutionMode) => {
		if (value === 'disabled') return 'All terminal commands require approval'
		if (value === 'allowlist') return 'Only explicitly trusted commands auto-run'
		if (value === 'auto') return 'Beam auto-runs ordinary commands and still blocks dangerous ones'
		return 'Beam auto-runs terminal commands except guarded destructive commands'
	}
	const webLabel = (value: WebAutoRequestMode) => {
		if (value === 'disabled') return 'Disabled'
		if (value === 'allowlist') return 'Allowlist'
		return 'Turbo'
	}
	const webDetail = (value: WebAutoRequestMode) => {
		if (value === 'disabled') return 'All web requests require approval'
		if (value === 'allowlist') return 'Only explicitly trusted origins auto-fetch'
		return 'All web searches are auto-approved'
	}

	const togglePanel = (panel: typeof activePanel) => setActivePanel(current => current === panel ? null : panel)

	return <div className='max-w-[720px]'>
		<h2 className='text-3xl mb-2'>Configuration</h2>
		<div className='text-sm text-beam-fg-3 mb-6'>Controls for Beam agent behavior, approvals, context, and background work.</div>

		<div className='divide-y divide-beam-border-1'>
			<ConfigurationRow
				title='Enable Beam Agent'
				description='When disabled, Beam chat will not run the agent loop or execute tools.'
				control={<ConfigurationSwitch settingName='enableAgent' />}
			/>
			<ConfigurationRow
				title='Allow Beam in Background'
				description='When enabled, Beam can keep running if you switch conversations. When disabled, switching threads stops the active run.'
				control={<ConfigurationSwitch settingName='allowAgentInBackground' />}
			/>
			<ConfigurationRow
				title='Arena Always Open Fullscreen'
				description='When enabled, arena-style sessions prefer a side-by-side editor view when that feature is available.'
				control={<ConfigurationSwitch settingName='arenaAlwaysOpenFullscreen' />}
			/>
			<ConfigurationRow
				title='Auto Execution'
				description={<>
					Controls whether terminal commands require manual approval.
					<BulletHelp items={[
						'Disabled - all terminal commands require manual approval.',
						'Allowlist - only trusted terminal commands are auto-executed.',
						'Auto - ordinary commands are auto-executed; destructive commands remain blocked.',
						'Turbo - terminal commands are auto-executed except guarded destructive commands.',
					]} />
				</>}
				control={<ConfigurationDropdown
					options={terminalOptions}
					value={settingsState.globalSettings.terminalAutoExecutionMode}
					onChange={(value) => beamSettingsService.setGlobalSetting('terminalAutoExecutionMode', value)}
					display={terminalLabel}
					detail={terminalDetail}
				/>}
			>
				<ConfigurationLinkButton onClick={() => togglePanel('terminal')}>Show Allow/Deny list</ConfigurationLinkButton>
				{activePanel === 'terminal' && <ConfigurationPanel
					title='Terminal Allow/Deny List'
					description='Allowlist entries auto-run only when Auto Execution is set to Allowlist. Denylist entries always require approval, even in Auto or Turbo.'
				>
					<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
						<div>
							<div className='mb-2 text-xs font-semibold text-beam-fg-2'>Allowlist</div>
							<SettingsStringListEditor settingName='terminalAllowlist' placeholder='npm, git status, python -m pytest, /regex/' />
						</div>
						<div>
							<div className='mb-2 text-xs font-semibold text-beam-fg-2'>Denylist</div>
							<SettingsStringListEditor settingName='terminalDenylist' placeholder='rm -rf, git reset --hard, del /s' />
						</div>
					</div>
				</ConfigurationPanel>}
			</ConfigurationRow>
			<ConfigurationRow
				title='Auto Web Requests'
				description={<>
					Controls whether web search requests require manual approval.
					<BulletHelp items={[
						'Disabled - all web requests require manual approval.',
						'Allowlist - only trusted origins are auto-fetched.',
						'Turbo - web searches are auto-approved.',
					]} />
				</>}
				control={<ConfigurationDropdown
					options={webOptions}
					value={settingsState.globalSettings.webAutoRequestMode}
					onChange={(value) => beamSettingsService.setGlobalSetting('webAutoRequestMode', value)}
					display={webLabel}
					detail={webDetail}
				/>}
			>
				<ConfigurationLinkButton onClick={() => togglePanel('web')}>Show Allowlist</ConfigurationLinkButton>
				{activePanel === 'web' && <ConfigurationPanel
					title='Web Allowlist'
					description='When Auto Web Requests is set to Allowlist, Beam auto-approves web requests whose query or URL contains one of these entries. Use domains, URL fragments, wildcards, or /regex/.'
				>
					<SettingsStringListEditor settingName='webAllowlist' placeholder='docs.python.org, github.com/owner/repo, *.example.com' />
				</ConfigurationPanel>}
			</ConfigurationRow>
			<ConfigurationRow
				title='Autocomplete'
				description='Controls editor inline completions.'
				control={<BeamSwitch
					size='sm'
					value={settingsState.globalSettings.enableAutocomplete}
					onChange={(newVal) => beamSettingsService.setGlobalSetting('enableAutocomplete', newVal)}
				/>}
			>
				<div className={`mt-2 ${!settingsState.globalSettings.enableAutocomplete ? 'hidden' : ''}`}>
					<ModelDropdown featureName={'Autocomplete'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
				</div>
			</ConfigurationRow>
			<ConfigurationRow
				title='Apply'
				description='Controls the model and method used by the Apply button.'
				control={<BeamSwitch
					size='sm'
					value={settingsState.globalSettings.syncApplyToChat}
					onChange={(newVal) => beamSettingsService.setGlobalSetting('syncApplyToChat', newVal)}
				/>}
			>
				<div className='mt-2 flex flex-wrap items-center gap-2'>
					<span className='text-xs text-beam-fg-3'>{settingsState.globalSettings.syncApplyToChat ? 'Same as Chat model' : 'Different model'}</span>
					<div className={`${settingsState.globalSettings.syncApplyToChat ? 'hidden' : ''}`}>
						<ModelDropdown featureName={'Apply'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
					</div>
					<FastApplyMethodDropdown />
				</div>
			</ConfigurationRow>
			<ConfigurationRow
				title='Tool Auto-Approvals'
				description='Fine-tune tool approval categories not covered by the terminal and web controls above.'
				control={<span className='text-xs text-beam-fg-4'>Tools</span>}
			>
				<div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
					{[...toolApprovalTypes].filter(approvalType => approvalType !== 'terminal' && approvalType !== 'web').map((approvalType) => (
						<div key={approvalType} className='flex items-center gap-x-2'>
							<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
						</div>
					))}
				</div>
			</ConfigurationRow>
			<ConfigurationRow
				title='Editor Suggestions'
				description='Show Beam inline suggestions when code is selected.'
				control={<ConfigurationSwitch settingName='showInlineSuggestions' />}
			/>
			<ConfigurationRow
				title='Commit Message Generator'
				description='Controls the model used for generated commit messages.'
				control={<BeamSwitch
					size='sm'
					value={settingsState.globalSettings.syncSCMToChat}
					onChange={(newVal) => beamSettingsService.setGlobalSetting('syncSCMToChat', newVal)}
				/>}
			>
				<div className='mt-2 flex flex-wrap items-center gap-2'>
					<span className='text-xs text-beam-fg-3'>{settingsState.globalSettings.syncSCMToChat ? 'Same as Chat model' : 'Different model'}</span>
					<div className={`${settingsState.globalSettings.syncSCMToChat ? 'hidden' : ''}`}>
						<ModelDropdown featureName={'SCM'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
					</div>
				</div>
			</ConfigurationRow>
			<ConfigurationRow
				title='Auto-Continue'
				description='Controls whether Beam can keep working past the normal agent turn limit. When off, Beam stops earlier and asks you to continue.'
				control={<ConfigurationSwitch settingName='autoContinue' />}
			/>
			<ConfigurationRow
				title='Auto-Generate Memories'
				description='When enabled, Beam records compact memories after successful agent runs and injects saved memories into future requests.'
				control={<ConfigurationSwitch settingName='autoGenerateMemories' />}
			/>
			<ConfigurationRow
				title='Auto-Open Edited Files'
				description='Open files in the background when Beam creates or edits them.'
				control={<ConfigurationSwitch settingName='autoOpenEditedFiles' />}
			/>
			<ConfigurationRow
				title='Beam Auto-Fix Lints'
				description='When enabled, Beam includes lint diagnostics after edits so the agent can repair issues it created.'
				control={<ConfigurationSwitch settingName='includeToolLintErrors' />}
			/>
			<ConfigurationRow
				title='Disable Fast Context Agent'
				description='Disable the fast context pass that adds relevant editor and workspace context before an agent request.'
				control={<ConfigurationSwitch settingName='disableFastContextAgent' />}
			/>
			<ConfigurationRow
				title='Enable Beam Web Tools'
				description='When enabled, Beam can perform web searches on the open internet. Reading explicitly selected local files is unaffected.'
				control={<ConfigurationSwitch settingName='enableWebTools' />}
			/>
			<ConfigurationRow
				title='Explain and Fix in Current Conversation'
				description='Send explain-and-fix requests to the current conversation.'
				control={<ConfigurationSwitch settingName='explainFixInCurrentConversation' />}
			/>
			<ConfigurationRow
				title='Gitignore Access'
				description='Allow Beam to view and edit files such as .gitignore when you reference them.'
				control={<ConfigurationSwitch settingName='gitignoreAccess' />}
			/>
			<ConfigurationRow
				title='Read Claude Code Config'
				description='When enabled, Beam includes loaded CLAUDE.md or .claude/CLAUDE.md instructions in agent requests.'
				control={<ConfigurationSwitch settingName='readClaudeCodeConfig' />}
			/>
			<ConfigurationRow
				title='Beam Preview'
				description='Allow Beam to open local browser previews for development servers it starts when preview support is available.'
				control={<ConfigurationSwitch settingName='browserPreview' />}
			/>
			<ConfigurationRow
				title='Beam Completion Notifications'
				description='Show notifications when Beam finishes while running in the background.'
				control={<ConfigurationSwitch settingName='completionNotifications' />}
			/>
		</div>

	</div>
}


// full settings

// MCP Server component
const MCPServerComponent = ({ name, server }: { name: string, server: MCPServer }) => {
	const accessor = useAccessor();
	const mcpService = accessor.get('IMCPService');

	const beamSettings = useSettingsState()
	const isOn = beamSettings.mcpUserStateOfName[name]?.isOn

	const removeUniquePrefix = (name: string) => name.split('_').slice(1).join('_')

	return (
		<div className="border border-beam-border-2 bg-beam-bg-1 py-3 px-4 rounded-sm my-2">
			<div className="flex items-center justify-between">
				{/* Left side - status and name */}
				<div className="flex items-center gap-2">
					{/* Status indicator */}
					<div className={`w-2 h-2 rounded-full
						${server.status === 'success' ? 'bg-green-500'
							: server.status === 'error' ? 'bg-red-500'
								: server.status === 'loading' ? 'bg-yellow-500'
									: server.status === 'offline' ? 'bg-beam-fg-3'
										: ''}
					`}></div>

					{/* Server name */}
					<div className="text-sm font-medium text-beam-fg-1">{name}</div>
				</div>

				{/* Right side - power toggle switch */}
				<BeamSwitch
					value={isOn ?? false}
					size='xs'
					disabled={server.status === 'error'}
					onChange={() => mcpService.toggleServerIsOn(name, !isOn)}
				/>
			</div>

			{/* Tools section */}
			{isOn && (
				<div className="mt-3">
					<div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
						{(server.tools ?? []).length > 0 ? (
							(server.tools ?? []).map((tool: { name: string; description?: string }) => (
								<span
									key={tool.name}
									className="px-2 py-0.5 bg-beam-bg-2 text-beam-fg-3 rounded-sm text-xs"

									data-tooltip-id='beam-tooltip'
									data-tooltip-content={tool.description || ''}
									data-tooltip-class-name='beam-max-w-[300px]'
								>
									{removeUniquePrefix(tool.name)}
								</span>
							))
						) : (
							<span className="text-xs text-beam-fg-3">No tools available</span>
						)}
					</div>
				</div>
			)}

			{/* Command badge */}
			{isOn && server.command && (
				<div className="mt-3">
					<div className="text-xs text-beam-fg-3 mb-1">Command:</div>
					<div className="px-2 py-1 bg-beam-bg-2 text-xs font-mono overflow-x-auto whitespace-nowrap text-beam-fg-2 rounded-sm">
						{server.command}
					</div>
				</div>
			)}

			{/* Error message if present */}
			{server.error && (
				<div className="mt-3">
					<WarningBox text={server.error} />
				</div>
			)}
		</div>
	);
};

const BeamCloudUsageSection = () => {
	const settingsState = useSettingsState();
	const [account, setAccount] = useState<BeamCloudAccountStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [authenticating, setAuthenticating] = useState(false);
	const [showManualAuth, setShowManualAuth] = useState(false);
	const [manualToken, setManualToken] = useState('');
	const [manualAuthState, setManualAuthState] = useState('');
	const [manualError, setManualError] = useState('');
	const [manualLoading, setManualLoading] = useState(false);
	const authNotificationRef = useRef<{ close: () => void; progress: { infinite: () => void } } | null>(null);

	const accessor = useAccessor();
	const beamSettingsService = accessor.get('IBeamSettingsService');
	const nativeHostService = accessor.get('INativeHostService');
	const notificationService = accessor.get('INotificationService');

	const beamToken = settingsState.settingsOfProvider.beamCloud.beamToken;
	const beamRefreshToken = settingsState.settingsOfProvider.beamCloud.beamRefreshToken;
	const beamTokenExpiresAt = settingsState.settingsOfProvider.beamCloud.beamTokenExpiresAt;
	const isDevelopmentToken = beamToken === 'dev-token';

	const refreshUsage = useCallback(async () => {
		if (!beamToken || isDevelopmentToken) {
			setAccount(null);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			let activeToken = beamToken;
			if (beamRefreshToken && beamTokenExpiresAt) {
				const expiresInMs = new Date(beamTokenExpiresAt).getTime() - Date.now();
				if (!Number.isFinite(expiresInMs) || expiresInMs <= 60_000) {
					const refreshed = await beamSettingsService.refreshBeamCloudAuth(beamRefreshToken);
					activeToken = refreshed.accessToken;
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', refreshed.accessToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', refreshed.refreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', refreshed.expiresAt);
				}
			}

			const accountData = await beamSettingsService.getBeamCloudAccountStatus(activeToken);
			setAccount(accountData);

			const modelsData = await beamSettingsService.getBeamCloudModels(activeToken);
			if (modelsData) {
				beamSettingsService.setBeamCloudModels(modelsData);
			}
			if (!accountData) {
				setError('Failed to fetch usage data. Check if backend is running on localhost:3001');
			}
		} catch (err) {
			if (beamRefreshToken) {
				try {
					const refreshed = await beamSettingsService.refreshBeamCloudAuth(beamRefreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', refreshed.accessToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', refreshed.refreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', refreshed.expiresAt);
					const accountData = await beamSettingsService.getBeamCloudAccountStatus(refreshed.accessToken);
					setAccount(accountData);
					const modelsData = await beamSettingsService.getBeamCloudModels(refreshed.accessToken);
					if (modelsData) {
						beamSettingsService.setBeamCloudModels(modelsData);
					}
				} catch (refreshErr) {
					setError(refreshErr instanceof Error ? refreshErr.message : 'Unknown error');
					console.error('Beam Cloud connection error:', refreshErr);
				}
			} else {
				setError(err instanceof Error ? err.message : 'Unknown error');
				console.error('Beam Cloud connection error:', err);
			}
		}
		setLoading(false);
	}, [beamSettingsService, beamRefreshToken, beamToken, beamTokenExpiresAt, isDevelopmentToken]);

	useEffect(() => {
		if (beamToken) {
			refreshUsage();
		}
	}, [refreshUsage, beamToken]);

	useEffect(() => {
		if (beamToken && !isDevelopmentToken && authenticating) {
			authNotificationRef.current?.close();
			authNotificationRef.current = null;
			setAuthenticating(false);
			setShowManualAuth(false);
			setManualError('');
			setManualToken('');
			setManualAuthState('');
		}
	}, [authenticating, beamToken, isDevelopmentToken]);

	const cancelAuth = useCallback(() => {
		cancelBeamAuthListener();
		authNotificationRef.current?.close();
		authNotificationRef.current = null;
		setAuthenticating(false);
		setShowManualAuth(true);
		setManualAuthState('');
		setManualError('Browser login was cancelled. You can continue with a one-time auth token.');
	}, []);

	const startManualAuthTokenFlow = useCallback(async () => {
		const pendingAuth = startBeamAuthListener('manual_token');
		setManualAuthState(pendingAuth.state);
		setManualToken('');
		setManualError('Complete login in your browser, then paste the 25-character token here.');
		try {
			const manualAuthUrl = await beamSettingsService.getBeamCloudManualAuthUrl(pendingAuth.state);
			nativeHostService.openExternal(manualAuthUrl);
		} catch (err) {
			setManualError(err instanceof Error ? err.message : 'Could not start manual auth token login.');
		}
	}, [beamSettingsService, nativeHostService]);

	const submitManualToken = useCallback(async () => {
		const authToken = manualToken.trim();
		if (!manualAuthState) {
			setManualError('Start auth-token login first so Beam can match the token to this window.');
			return;
		}
		if (!/^[A-Za-z0-9]{25}$/.test(authToken)) {
			setManualError('Enter the 25-character auth token from the browser success page.');
			return;
		}

		setManualLoading(true);
		setManualError('');
		try {
			const redeemed = await beamSettingsService.redeemBeamCloudIdeAuthToken(authToken, manualAuthState);
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', redeemed.accessToken);
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', redeemed.refreshToken);
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', redeemed.expiresAt);
			const modelsData = await beamSettingsService.getBeamCloudModels(redeemed.accessToken);
			if (modelsData) {
				beamSettingsService.setBeamCloudModels(modelsData);
			}
			setManualToken('');
			setManualAuthState('');
			setShowManualAuth(false);
			setManualError('');
			setAuthenticating(false);
			finishBeamAuthListener();
			notificationService.info('Successfully signed in to Beam Cloud!');
		} catch (err) {
			setManualError(err instanceof Error ? err.message : 'Auth token could not be redeemed.');
		} finally {
			setManualLoading(false);
		}
	}, [beamSettingsService, manualAuthState, manualToken, notificationService]);

	const handleLogin = async () => {
		if (isDevelopmentToken) {
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', '');
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', '');
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', '');
			beamSettingsService.setBeamCloudModels([]);
		}
		const pendingAuth = startBeamAuthListener('deep_link');
		const authUrl = await beamSettingsService.getBeamCloudAuthUrl(pendingAuth.state, nativeHostService.windowId);
		authNotificationRef.current?.close();
		const notification = notificationService.prompt(Severity.Info, 'Waiting for Beam authentication', [
			{
				label: 'Cancel',
				run: cancelAuth,
			},
		], {
			source: 'Beam',
			sticky: true,
		});
		notification.progress.infinite();
		authNotificationRef.current = notification;
		setAuthenticating(true);
		setShowManualAuth(false);
		setManualError('');
		setManualToken('');
		setManualAuthState('');
		nativeHostService.openExternal(authUrl);
	};

	const handleSignOut = async () => {
		if (beamToken) {
			await beamSettingsService.logoutBeamCloud(beamToken, beamRefreshToken ?? '');
		}
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', '');
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', '');
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', '');
		beamSettingsService.setBeamCloudModels([]);
		authNotificationRef.current?.close();
		authNotificationRef.current = null;
		setAuthenticating(false);
		cancelBeamAuthListener();
		setShowManualAuth(false);
		setManualError('');
		setManualToken('');
		setManualAuthState('');
		setAccount(null);
	};

	if (!beamToken || isDevelopmentToken || !account) {
		return (
			<div className="@@beam-account-card">
				<div className="@@beam-account-card-header">
					<div className="@@beam-account-avatar @@beam-account-avatar-empty">
						<UserCircle className="size-5" />
					</div>
					<div className="min-w-0">
						<h4 className="@@beam-account-title">Beam Account</h4>
						<p className="@@beam-account-subtitle">
							{isDevelopmentToken ? 'Development account is local only. Log in to connect Beam Cloud.' : 'Sign in to sync your plan and cloud usage.'}
						</p>
					</div>
				</div>
				{error && <p className="text-red-500 text-sm mb-2">{error}</p>}
				<BeamButtonBgDarken
					onClick={handleLogin}
					disabled={loading || authenticating}
					className="@@beam-account-primary"
				>
					<LogIn className="size-3.5" />
					{authenticating ? 'Waiting for Beam authentication...' : loading ? 'Checking account...' : 'Log in to Beam'}
				</BeamButtonBgDarken>
				{authenticating ? (
					<BeamButtonBgDarken
						onClick={cancelAuth}
						className="@@beam-account-secondary"
					>
						Cancel browser login
					</BeamButtonBgDarken>
				) : null}
				{showManualAuth ? (
					<div className="@@beam-account-manual-card @@beam-account-manual-card-static">
						<p>{manualError || (manualAuthState ? 'Paste the 25-character token from the browser page.' : 'Use auth token instead if browser login did not return to Beam.')}</p>
						{!manualAuthState ? (
							<button type="button" onClick={startManualAuthTokenFlow}>
								Use auth token instead
							</button>
						) : (
							<>
								<input
									value={manualToken}
									maxLength={25}
									spellCheck={false}
									placeholder="aZ92LmQp7XbT4nY8VcR1KzD03"
									onChange={(event) => setManualToken(event.target.value.replace(/[^A-Za-z0-9]/g, ''))}
								/>
								<button type="button" onClick={submitManualToken} disabled={manualLoading}>
									{manualLoading ? 'Connecting...' : 'Connect manually'}
								</button>
							</>
						)}
					</div>
				) : null}
			</div>
		);
	}

	const usage = account.usage;
	const percent = Math.min(100, Math.round((usage.usedTokens / usage.tokenQuota) * 100));
	const resetDate = new Date(usage.resetDate);
	const quotaLabel = `${usage.usedTokens.toLocaleString()} / ${usage.tokenQuota.toLocaleString()} tokens`;

	return (
		<div className="@@beam-account-card">
			<div className="@@beam-account-card-header">
				<div className="@@beam-account-avatar">
					{account.user.avatarUrl ? <img src={account.user.avatarUrl} alt="" /> : <UserCircle className="size-5" />}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 mb-1">
						<h4 className="@@beam-account-title">Beam Account</h4>
						<span className="@@beam-account-plan">{usage.tier}</span>
					</div>
					<div className="@@beam-account-subtitle truncate">{account.user.email}</div>
				</div>
				<button
					onClick={refreshUsage}
					className={`@@beam-account-icon-button ${loading ? 'animate-spin' : ''}`}
				>
					<RefreshCw className="size-4" />
				</button>
			</div>

			<div className="space-y-4">
				<div className="flex justify-between text-sm">
					<span className="text-beam-fg-2">Monthly quota usage</span>
					<span className="font-mono text-beam-fg-1">{percent}%</span>
				</div>

				<div className="@@beam-account-meter">
					<div
						className={`@@beam-account-meter-fill ${percent > 90 ? 'danger' : percent > 70 ? 'warning' : ''}`}
						style={{ width: `${percent}%` }}
					/>
				</div>

				<div className="@@beam-account-usage-box">
					<div>
						<span>Used</span>
						<strong>{quotaLabel}</strong>
					</div>
					<div>
						<span>Remaining</span>
						<strong>{usage.tokensRemaining.toLocaleString()} tokens</strong>
					</div>
					<div>
						<span>Reset</span>
						<strong>{Number.isNaN(resetDate.getTime()) ? 'Soon' : resetDate.toLocaleDateString()}</strong>
					</div>
				</div>

				<div className="flex justify-between items-center pt-2">
					<div className="text-xs text-beam-fg-3">Cloud limits are enforced by the Beam server.</div>
					<div className="flex gap-2">
						<BeamButtonBgDarken
							onClick={handleSignOut}
							className="text-xs px-3 py-1 opacity-70 hover:opacity-100"
						>
							<LogOut className="size-3" />
							Sign Out
						</BeamButtonBgDarken>
						<BeamButtonBgDarken
							onClick={handleLogin}
							className="text-xs px-3 py-1"
						>
							Change Account
						</BeamButtonBgDarken>
					</div>
				</div>
			</div>
		</div>
	);
};

// Main component that renders the list of servers
const MCPServersList = () => {
	const mcpServiceState = useMCPServiceState()

	let content: React.ReactNode
	if (mcpServiceState.error) {
		content = <div className="text-beam-fg-3 text-sm mt-2">
			{mcpServiceState.error}
		</div>
	}
	else {
		const entries = Object.entries(mcpServiceState.mcpServerOfName)
		if (entries.length === 0) {
			content = <div className="text-beam-fg-3 text-sm mt-2">
				No servers found
			</div>
		}
		else {
			content = entries.map(([name, server]) => (
				<MCPServerComponent key={name} name={name} server={server} />
			))
		}
	}

	return <div className="my-2">{content}</div>
};

export const Settings = () => {
	const isDark = useIsDark()
	// ─── sidebar nav ──────────────────────────
	const [selectedSection, setSelectedSection] =
		useState<Tab>('intelligence');

	const navItems: { tab: Tab; label: string }[] = [
		{ tab: 'intelligence', label: 'Beam Intelligence' },
		{ tab: 'providers', label: 'Beam Cloud' },
		{ tab: 'models', label: 'Advanced Models' },
		{ tab: 'configuration', label: 'Configuration' },
		{ tab: 'customizations', label: 'Customizations' },
		{ tab: 'general', label: 'General' },
		{ tab: 'mcp', label: 'MCP' },
		{ tab: 'all', label: 'All Settings' },
	];
	const shouldShowTab = (tab: Tab) => selectedSection === 'all' || selectedSection === tab;
	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const environmentService = accessor.get('IEnvironmentService')
	const nativeHostService = accessor.get('INativeHostService')
	const settingsState = useSettingsState()
	const beamSettingsService = accessor.get('IBeamSettingsService')
	const chatThreadsService = accessor.get('IChatThreadService')
	const notificationService = accessor.get('INotificationService')
	const mcpService = accessor.get('IMCPService')
	const storageService = accessor.get('IStorageService')
	const metricsService = accessor.get('IMetricsService')
	const isOptedOut = useIsOptedOut()

	const onDownload = (t: 'Chats' | 'Settings') => {
		let dataStr: string
		let downloadName: string
		if (t === 'Chats') {
			// Export chat threads
			dataStr = JSON.stringify(chatThreadsService.state, null, 2)
			downloadName = 'beam-chats.json'
		}
		else if (t === 'Settings') {
			// Export user settings
			dataStr = JSON.stringify(beamSettingsService.state, null, 2)
			downloadName = 'beam-settings.json'
		}
		else {
			dataStr = ''
			downloadName = ''
		}

		const blob = new Blob([dataStr], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = downloadName
		a.click()
		URL.revokeObjectURL(url)
	}


	// Add file input refs
	const fileInputSettingsRef = useRef<HTMLInputElement>(null)
	const fileInputChatsRef = useRef<HTMLInputElement>(null)

	const [s, ss] = useState(0)

	const handleUpload = (t: 'Chats' | 'Settings') => (e: React.ChangeEvent<HTMLInputElement>,) => {
		const files = e.target.files
		if (!files) return;
		const file = files[0]
		if (!file) return

		const reader = new FileReader();
		reader.onload = () => {
			try {
				const json = JSON.parse(reader.result as string);

				if (t === 'Chats') {
					chatThreadsService.dangerousSetState(json as any)
				}
				else if (t === 'Settings') {
					beamSettingsService.dangerousSetState(json as any)
				}

				notificationService.info(`${t} imported successfully!`)
			} catch (err) {
				notificationService.notify({ message: `Failed to import ${t}`, source: err + '', severity: Severity.Error, })
			}
		};
		reader.readAsText(file);
		e.target.value = '';

		ss(s => s + 1)
	}


	return (
		<div className={`@@beam-scope ${isDark ? 'dark' : ''}`} style={{ height: '100%', width: '100%', overflow: 'auto' }}>
			<div className="flex flex-col md:flex-row w-full gap-6 max-w-[900px] mx-auto mb-32" style={{ minHeight: '80vh' }}>
				{/* ──────────────  SIDEBAR  ────────────── */}

				<aside className="md:w-1/4 w-full p-6 shrink-0">
					{/* vertical tab list */}
					<div className="flex flex-col gap-2 mt-12">
						{navItems.map(({ tab, label }) => (
							<button
								key={tab}
								onClick={() => {
									if (tab === 'all') {
										setSelectedSection('all');
										window.scrollTo({ top: 0, behavior: 'smooth' });
									} else {
										setSelectedSection(tab);
									}
								}}
								className={`
          py-2 px-4 rounded-md text-left transition-all duration-200
          ${selectedSection === tab
										? 'bg-[#0e70c0]/80 text-white font-medium shadow-sm'
										: 'bg-beam-bg-2 hover:bg-beam-bg-2/80 text-beam-fg-1'}
        `}
							>
								{label}
							</button>
						))}
					</div>
				</aside>

				{/* ───────────── MAIN PANE ───────────── */}
				<main className="flex-1 p-6 select-none">



					<div className='max-w-3xl'>

						<h1 className='text-2xl w-full'>{`Beam's Settings`}</h1>

						<div className='w-full h-[1px] my-2' />

						{/* Models section (formerly FeaturesTab) */}
						<ErrorBoundary>
							<RedoOnboardingButton />
						</ErrorBoundary>

						<div className='w-full h-[1px] my-4' />

						{/* All sections in flex container with gap-12 */}
						<div className='flex flex-col gap-12'>
							{/* Beam Intelligence section */}
							<div className={shouldShowTab('intelligence') ? `` : 'hidden'}>
								<ErrorBoundary>
									<BeamIntelligenceSettingsSection />
								</ErrorBoundary>
							</div>

							{/* Models section (formerly FeaturesTab) */}
							<div className={shouldShowTab('models') ? `` : 'hidden'}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Advanced Models</h2>
									<h3 className='text-beam-fg-3 mb-6'>Raw model visibility for advanced users. Most people should use Beam Intelligence instead.</h3>
									<ModelDump filteredProviders={nonlocalProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Beam Cloud section (formerly Main Providers) */}
							<div className={shouldShowTab('providers') ? `` : 'hidden'}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Beam Cloud</h2>
									<h3 className={`text-beam-fg-3 mb-6`}>{`Access premium models through our managed infrastructure. No individual API keys required.`}</h3>

									<BeamCloudUsageSection />

									<div className='mt-8 pt-8 border-t border-beam-border-1 opacity-50'>
										<div className='text-xs text-beam-fg-3 mb-2 uppercase tracking-wider'>Advanced</div>
										<BeamProviderSettings providerNames={nonlocalProviderNames} />
									</div>
								</ErrorBoundary>
							</div>

							{/* Configuration section */}
							<div className={shouldShowTab('configuration') ? `` : 'hidden'}>
								<ErrorBoundary>
									<AgentConfigurationSection />
								</ErrorBoundary>
							</div>

							{/* Customizations section */}
							<div className={shouldShowTab('customizations') ? `` : 'hidden'}>
								<ErrorBoundary>
									<CustomizationsSection />
								</ErrorBoundary>
							</div>

							{/* Feature Options section */}
							<div className='hidden'>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Feature Options</h2>

									<div className='flex flex-col gap-y-8 my-4'>
										<ErrorBoundary>
											{/* FIM */}
											<div>
												<h4 className={`text-base`}>{displayInfoOfFeatureName('Autocomplete')}</h4>
												<div className='text-sm text-beam-fg-3 mt-1'>
													<span>
														Experimental.{' '}
													</span>
													<span
														className='hover:brightness-110'
														data-tooltip-id='beam-tooltip'
														data-tooltip-content='We recommend using the largest qwen2.5-coder model you can with Ollama (try qwen2.5-coder:3b).'
														data-tooltip-class-name='beam-max-w-[20px]'
													>
														Only works with FIM models.*
													</span>
												</div>

												<div className='my-2'>
													{/* Enable Switch */}
													<ErrorBoundary>
														<div className='flex items-center gap-x-2 my-2'>
															<BeamSwitch
																size='xs'
																value={settingsState.globalSettings.enableAutocomplete}
																onChange={(newVal) => beamSettingsService.setGlobalSetting('enableAutocomplete', newVal)}
															/>
															<span className='text-beam-fg-3 text-xs pointer-events-none'>{settingsState.globalSettings.enableAutocomplete ? 'Enabled' : 'Disabled'}</span>
														</div>
													</ErrorBoundary>

													{/* Model Dropdown */}
													<ErrorBoundary>
														<div className={`my-2 ${!settingsState.globalSettings.enableAutocomplete ? 'hidden' : ''}`}>
															<ModelDropdown featureName={'Autocomplete'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
														</div>
													</ErrorBoundary>

												</div>

											</div>
										</ErrorBoundary>

										{/* Apply */}
										<ErrorBoundary>

											<div className='w-full'>
												<h4 className={`text-base`}>{displayInfoOfFeatureName('Apply')}</h4>
												<div className='text-sm text-beam-fg-3 mt-1'>Settings that control the behavior of the Apply button.</div>

												<div className='my-2'>
													{/* Sync to Chat Switch */}
													<div className='flex items-center gap-x-2 my-2'>
														<BeamSwitch
															size='xs'
															value={settingsState.globalSettings.syncApplyToChat}
															onChange={(newVal) => beamSettingsService.setGlobalSetting('syncApplyToChat', newVal)}
														/>
														<span className='text-beam-fg-3 text-xs pointer-events-none'>{settingsState.globalSettings.syncApplyToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`my-2 ${settingsState.globalSettings.syncApplyToChat ? 'hidden' : ''}`}>
														<ModelDropdown featureName={'Apply'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
													</div>
												</div>


												<div className='my-2'>
													{/* Fast Apply Method Dropdown */}
													<div className='flex items-center gap-x-2 my-2'>
														<FastApplyMethodDropdown />
													</div>
												</div>

											</div>
										</ErrorBoundary>




										{/* Tools Section */}
										<div>
											<h4 className={`text-base`}>Tools</h4>
											<div className='text-sm text-beam-fg-3 mt-1'>{`Tools are functions that LLMs can call. Some tools require user approval.`}</div>

											<div className='my-2'>
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													{[...toolApprovalTypes].map((approvalType) => {
														return <div key={approvalType} className="flex items-center gap-x-2 my-2">
															<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
														</div>
													})}

												</ErrorBoundary>

												{/* Tool Lint Errors Switch */}
												<ErrorBoundary>

													<div className='flex items-center gap-x-2 my-2'>
														<BeamSwitch
															size='xs'
															value={settingsState.globalSettings.includeToolLintErrors}
															onChange={(newVal) => beamSettingsService.setGlobalSetting('includeToolLintErrors', newVal)}
														/>
														<span className='text-beam-fg-3 text-xs pointer-events-none'>{settingsState.globalSettings.includeToolLintErrors ? 'Fix lint errors' : `Fix lint errors`}</span>
													</div>
												</ErrorBoundary>

												{/* Auto Accept LLM Changes Switch */}
												<ErrorBoundary>
													<div className='flex items-center gap-x-2 my-2'>
														<BeamSwitch
															size='xs'
															value={settingsState.globalSettings.autoAcceptLLMChanges}
															onChange={(newVal) => beamSettingsService.setGlobalSetting('autoAcceptLLMChanges', newVal)}
														/>
														<span className='text-beam-fg-3 text-xs pointer-events-none'>Auto-accept LLM changes</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>



										<div className='w-full'>
											<h4 className={`text-base`}>Editor</h4>
											<div className='text-sm text-beam-fg-3 mt-1'>{`Settings that control the visibility of Beam suggestions in the code editor.`}</div>

											<div className='my-2'>
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													<div className='flex items-center gap-x-2 my-2'>
														<BeamSwitch
															size='xs'
															value={settingsState.globalSettings.showInlineSuggestions}
															onChange={(newVal) => beamSettingsService.setGlobalSetting('showInlineSuggestions', newVal)}
														/>
														<span className='text-beam-fg-3 text-xs pointer-events-none'>{settingsState.globalSettings.showInlineSuggestions ? 'Show suggestions on select' : 'Show suggestions on select'}</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										{/* SCM */}
										<ErrorBoundary>

											<div className='w-full'>
												<h4 className={`text-base`}>{displayInfoOfFeatureName('SCM')}</h4>
												<div className='text-sm text-beam-fg-3 mt-1'>Settings that control the behavior of the commit message generator.</div>

												<div className='my-2'>
													{/* Sync to Chat Switch */}
													<div className='flex items-center gap-x-2 my-2'>
														<BeamSwitch
															size='xs'
															value={settingsState.globalSettings.syncSCMToChat}
															onChange={(newVal) => beamSettingsService.setGlobalSetting('syncSCMToChat', newVal)}
														/>
														<span className='text-beam-fg-3 text-xs pointer-events-none'>{settingsState.globalSettings.syncSCMToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`my-2 ${settingsState.globalSettings.syncSCMToChat ? 'hidden' : ''}`}>
														<ModelDropdown featureName={'SCM'} className='text-xs text-beam-fg-3 bg-beam-bg-1 border border-beam-border-1 rounded p-0.5 px-1' />
													</div>
												</div>

											</div>
										</ErrorBoundary>
									</div>
								</ErrorBoundary>
							</div>

							{/* General section */}
							<div className={`${shouldShowTab('general') ? `` : 'hidden'} flex flex-col gap-12`}>
								{/* One-Click Switch section */}
								<div>
									<ErrorBoundary>
										<h2 className='text-3xl mb-2'>One-Click Switch</h2>
										<h4 className='text-beam-fg-3 mb-4'>{`Transfer your editor settings into Beam.`}</h4>

										<div className='flex flex-col gap-2'>
											<OneClickSwitchButton className='w-48' fromEditor="VS Code" />
											<OneClickSwitchButton className='w-48' fromEditor="Cursor" />
											<OneClickSwitchButton className='w-48' fromEditor="Windsurf" />
										</div>
									</ErrorBoundary>
								</div>

								{/* Import/Export section */}
								<div>
									<h2 className='text-3xl mb-2'>Import/Export</h2>
									<h4 className='text-beam-fg-3 mb-4'>{`Transfer Beam's settings and chats in and out of Beam.`}</h4>
									<div className='flex flex-col gap-8'>
										{/* Settings Subcategory */}
										<div className='flex flex-col gap-2 max-w-48 w-full'>
											<input key={2 * s} ref={fileInputSettingsRef} type='file' accept='.json' className='hidden' onChange={handleUpload('Settings')} />
											<BeamButtonBgDarken className='px-4 py-1 w-full' onClick={() => { fileInputSettingsRef.current?.click() }}>
												Import Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className='px-4 py-1 w-full' onClick={() => onDownload('Settings')}>
												Export Settings
											</BeamButtonBgDarken>
											<ConfirmButton className='px-4 py-1 w-full' onConfirm={() => { beamSettingsService.resetState(); }}>
												Reset Settings
											</ConfirmButton>
										</div>

										{/* Chats Subcategory */}
										<div className='flex flex-col gap-2 max-w-48 w-full'>
											<input key={2 * s + 1} ref={fileInputChatsRef} type='file' accept='.json' className='hidden' onChange={handleUpload('Chats')} />
											<BeamButtonBgDarken className='px-4 py-1 w-full' onClick={() => { fileInputChatsRef.current?.click() }}>
												Import Chats
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className='px-4 py-1 w-full' onClick={() => onDownload('Chats')}>
												Export Chats
											</BeamButtonBgDarken>
											<ConfirmButton className='px-4 py-1 w-full' onConfirm={() => { chatThreadsService.resetState(); }}>
												Reset Chats
											</ConfirmButton>
										</div>
									</div>
								</div>



								{/* Built-in Settings section */}
								<div>
									<h2 className={`text-3xl mb-2`}>Built-in Settings</h2>
									<h4 className={`text-beam-fg-3 mb-4`}>{`IDE settings, keyboard settings, and theme customization.`}</h4>

									<ErrorBoundary>
										<div className='flex flex-col gap-2 justify-center max-w-48 w-full'>
											<BeamButtonBgDarken className='px-4 py-1' onClick={() => { commandService.executeCommand('workbench.action.openSettings') }}>
												General Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className='px-4 py-1' onClick={() => { commandService.executeCommand('workbench.action.openGlobalKeybindings') }}>
												Keyboard Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className='px-4 py-1' onClick={() => { commandService.executeCommand('workbench.action.selectTheme') }}>
												Theme Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className='px-4 py-1' onClick={() => { nativeHostService.showItemInFolder(environmentService.logsHome.fsPath) }}>
												Open Logs
											</BeamButtonBgDarken>
										</div>
									</ErrorBoundary>
								</div>


								{/* Metrics section */}
								<div className='max-w-[600px]'>
									<h2 className={`text-3xl mb-2`}>Metrics</h2>
									<h4 className={`text-beam-fg-3 mb-4`}>Very basic anonymous usage tracking helps us keep Beam running smoothly. You may opt out below. Regardless of this setting, Beam never sees your code, messages, or API keys.</h4>

									<div className='my-2'>
										{/* Disable All Metrics Switch */}
										<ErrorBoundary>
											<div className='flex items-center gap-x-2 my-2'>
												<BeamSwitch
													size='xs'
													value={isOptedOut}
													onChange={(newVal) => {
														storageService.store(OPT_OUT_KEY, newVal, StorageScope.APPLICATION, StorageTarget.MACHINE)
														metricsService.capture(`Set metrics opt-out to ${newVal}`, {}) // this only fires if it's enabled, so it's fine to have here
													}}
												/>
												<span className='text-beam-fg-3 text-xs pointer-events-none'>{'Opt-out (requires restart)'}</span>
											</div>
										</ErrorBoundary>
									</div>
								</div>

								{/* AI Instructions section */}
								<div className='max-w-[600px]'>
									<h2 className={`text-3xl mb-2`}>AI Instructions</h2>
									<h4 className={`text-beam-fg-3 mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
System instructions to include with all AI requests.
Alternatively, place a \`.beamrules\` file in the root of your workspace.
								`} chatMessageLocation={undefined} />
									</h4>
									<ErrorBoundary>
										<AIInstructionsBox />
									</ErrorBoundary>
									{/* --- Disable System Message Toggle --- */}
									<div className='my-4'>
										<ErrorBoundary>
											<div className='flex items-center gap-x-2'>
												<BeamSwitch
													size='xs'
													value={!!settingsState.globalSettings.disableSystemMessage}
													onChange={(newValue) => {
														beamSettingsService.setGlobalSetting('disableSystemMessage', newValue);
													}}
												/>
												<span className='text-beam-fg-3 text-xs pointer-events-none'>
													{'Disable system message'}
												</span>
											</div>
										</ErrorBoundary>
										<div className='text-beam-fg-3 text-xs mt-1'>
											{`When disabled, Beam will not include anything in the system message except for content you specified above.`}
										</div>
									</div>
								</div>

							</div>



							{/* MCP section */}
							<div className={shouldShowTab('mcp') ? `` : 'hidden'}>
								<ErrorBoundary>
									<h2 className='text-3xl mb-2'>MCP</h2>
									<h4 className={`text-beam-fg-3 mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
Use Model Context Protocol to provide Agent mode with more tools.
							`} chatMessageLocation={undefined} />
									</h4>
									<div className='my-2'>
										<BeamButtonBgDarken className='px-4 py-1 w-full max-w-48' onClick={async () => { await mcpService.revealMCPConfigFile() }}>
											Add MCP Server
										</BeamButtonBgDarken>
									</div>

									<ErrorBoundary>
										<MCPServersList />
									</ErrorBoundary>
								</ErrorBoundary>
							</div>





						</div>

					</div>
				</main>
			</div>
		</div>
	);
}
