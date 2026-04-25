/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'; // Added useRef import just in case it was missed, though likely already present
import { ProviderName, SettingName, displayInfoOfSettingName, providerNames, BeamStatefulModelInfo, customSettingNamesOfProvider, RefreshableProviderName, refreshableProviderNames, displayInfoOfProviderName, nonlocalProviderNames, localProviderNames, GlobalSettingName, featureNames, displayInfoOfFeatureName, isProviderNameDisabled, FeatureName, hasDownloadButtonsOnModelsProviderNames, subTextMdOfProviderName } from '../../../../common/beamSettingsTypes.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { BeamButtonBgDarken, BeamCustomDropdownBox, BeamInputBox2, BeamSimpleInputBox, BeamSwitch } from '../util/inputs.js';
import { useAccessor, useIsDark, useIsOptedOut, useRefreshModelListener, useRefreshModelState, useSettingsState } from '../util/services.js';
import { X, RefreshCw, Loader2, Check, Asterisk, Plus } from 'lucide-react';
import { URI } from '../../../../../../../base/common/uri.js';
import { ModelDropdown } from './ModelDropdown.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { WarningBox } from './WarningBox.js';
import { os } from '../../../../common/helpers/systemInfo.js';
import { IconLoading } from '../sidebar-tsx/SidebarChat.js';
import { ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js';
import Severity from '../../../../../../../base/common/severity.js';
import { getModelCapabilities, modelOverrideKeys, ModelOverrides } from '../../../../common/modelCapabilities.js';
import { TransferEditorType, TransferFilesInfo } from '../../../extensionTransferTypes.js';
import { MCPServer } from '../../../../common/mcpServiceTypes.js';
import { useMCPServiceState } from '../util/services.js';
import { OPT_OUT_KEY } from '../../../../common/storageKeys.js';
import { StorageScope, StorageTarget } from '../../../../../../../platform/storage/common/storage.js';

type Tab =
'models' |
'localProviders' |
'providers' |
'featureOptions' |
'mcp' |
'general' |
'all';


const ButtonLeftTextRightOption = ({ text, leftButton }: {text: string;leftButton?: React.ReactNode;}) => {

  return <div className="beam-flex beam-items-center beam-text-beam-fg-3 beam-px-3 beam-py-0.5 beam-rounded-sm beam-overflow-hidden beam-gap-2">
		{leftButton ? leftButton : null}
		<span>
			{text}
		</span>
	</div>;
};

// models
const RefreshModelButton = ({ providerName }: {providerName: RefreshableProviderName;}) => {

  const refreshModelState = useRefreshModelState();

  const accessor = useAccessor();
  const refreshModelService = accessor.get('IRefreshModelService');
  const metricsService = accessor.get('IMetricsService');

  const [justFinished, setJustFinished] = useState<null | 'finished' | 'error'>(null);

  useRefreshModelListener(
    useCallback((providerName2, refreshModelState) => {
      if (providerName2 !== providerName) return;
      const { state } = refreshModelState[providerName];
      if (!(state === 'finished' || state === 'error')) return;
      // now we know we just entered 'finished' state for this providerName
      setJustFinished(state);
      const tid = setTimeout(() => {setJustFinished(null);}, 2000);
      return () => clearTimeout(tid);
    }, [providerName])
  );

  const { state } = refreshModelState[providerName];

  const { title: providerTitle } = displayInfoOfProviderName(providerName);

  return <ButtonLeftTextRightOption

    leftButton={
    <button
      className="beam-flex beam-items-center"
      disabled={state === 'refreshing' || justFinished !== null}
      onClick={() => {
        refreshModelService.startRefreshingModels(providerName, { enableProviderOnSuccess: false, doNotFire: false });
        metricsService.capture('Click', { providerName, action: 'Refresh Models' });
      }}>
      
				{justFinished === 'finished' ? <Check className="beam-stroke-green-500 beam-size-3" /> :
      justFinished === 'error' ? <X className="beam-stroke-red-500 beam-size-3" /> :
      state === 'refreshing' ? <Loader2 className="beam-size-3 beam-animate-spin" /> :
      <RefreshCw className="beam-size-3" />}
			</button>
    }

    text={justFinished === 'finished' ? `${providerTitle} Models are up-to-date!` :
    justFinished === 'error' ? `${providerTitle} not found!` :
    `Manually refresh ${providerTitle} models.`} />;

};

const RefreshableModels = () => {
  const settingsState = useSettingsState();


  const buttons = refreshableProviderNames.map((providerName) => {
    if (!settingsState.settingsOfProvider[providerName]._didFillInProviderSettings) return null;
    return <RefreshModelButton key={providerName} providerName={providerName} />;
  });

  return <>
		{buttons}
	</>;

};



export const AnimatedCheckmarkButton = ({ text, className }: {text?: string;className?: string;}) => {
  const [dashOffset, setDashOffset] = useState(40);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 500; // 500ms animation

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newOffset = 40 - progress * 40;

      setDashOffset(newOffset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <div
    className={`beam-flex beam-items-center beam-gap-1.5 beam-w-fit ${
    className ? className : `beam-px-2 beam-py-0.5 beam-text-xs beam-text-zinc-900 beam-bg-zinc-100 beam-rounded-sm`} `}>

    
		<svg className="beam-size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: dashOffset
        }} />
      
		</svg>
		{text}
	</div>;
};


const AddButton = ({ disabled, text = 'Add', ...props }: {disabled?: boolean;text?: React.ReactNode;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

  return <button
    disabled={disabled}
    className={`beam-bg-[#0e70c0] beam-px-3 beam-py-1 beam-text-white beam-rounded-sm ${!disabled ? "hover:beam-bg-[#1177cb] beam-cursor-pointer" : "beam-opacity-50 beam-cursor-not-allowed beam-bg-opacity-70"}`}
    {...props}>
    {text}</button>;

};

// ConfirmButton prompts for a second click to confirm an action, cancels if clicking outside
const ConfirmButton = ({ children, onConfirm, className }: {children: React.ReactNode;onConfirm: () => void;className?: string;}) => {
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
    <div ref={ref} className={`beam-inline-block`}>
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
		</div>);

};

// ---------------- Simplified Model Settings Dialog ------------------

// keys of ModelOverrides we allow the user to override



// This new dialog replaces the verbose UI with a single JSON override box.
const SimpleModelSettingsDialog = ({
  isOpen,
  onClose,
  modelInfo




}: {isOpen: boolean;onClose: () => void;modelInfo: {modelName: string;providerName: ProviderName;type: 'autodetected' | 'custom' | 'default';} | null;}) => {
  if (!isOpen || !modelInfo) return null;

  const { modelName, providerName, type } = modelInfo;
  const accessor = useAccessor();
  const settingsState = useSettingsState();
  const mouseDownInsideModal = useRef(false); // Ref to track mousedown origin
  const settingsStateService = accessor.get('IBeamSettingsService');

  // current overrides and defaults
  const defaultModelCapabilities = getModelCapabilities(providerName, modelName, undefined);
  const currentOverrides = settingsState.overridesOfModel?.[providerName]?.[modelName] ?? undefined;
  const { recognizedModelName, isUnrecognizedModel } = defaultModelCapabilities;

  // Create the placeholder with the default values for allowed keys
  const partialDefaults: Partial<ModelOverrides> = {};
  for (const k of modelOverrideKeys) {if (defaultModelCapabilities[k]) partialDefaults[k] = defaultModelCapabilities[k] as any;}
  const placeholder = JSON.stringify(partialDefaults, null, 2);

  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => !!currentOverrides);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

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
    let parsedInput: Record<string, unknown>;

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
      if (!(k in parsedInput)) continue;
      const isEmpty = parsedInput[k] === '' || parsedInput[k] === null || parsedInput[k] === undefined;
      if (!isEmpty) {
        cleaned[k] = parsedInput[k] as any;
      }
    }
    await settingsStateService.setOverridesOfModel(providerName, modelName, cleaned);
    onClose();
  };

  const sourcecodeOverridesLink = `https://github.com/devxyasir/beam/blob/main/src/vs/workbench/contrib/beam/common/modelCapabilities.ts#L146-L172`;

  return (
    <div // Backdrop
    className="beam-fixed beam-inset-0 beam-bg-black/50 beam-flex beam-items-center beam-justify-center beam-z-[9999999]"
    onMouseDown={() => {
      mouseDownInsideModal.current = false;
    }}
    onMouseUp={() => {
      if (!mouseDownInsideModal.current) {
        onClose();
      }
      mouseDownInsideModal.current = false;
    }}>
      
			{/* MODAL */}
			<div
        className="beam-bg-beam-bg-1 beam-rounded-md beam-p-4 beam-max-w-xl beam-w-full beam-shadow-xl beam-overflow-y-auto beam-max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Keep stopping propagation for normal clicks inside
        onMouseDown={(e) => {
          mouseDownInsideModal.current = true;
          e.stopPropagation();
        }}>
        
				<div className="beam-flex beam-justify-between beam-items-center beam-mb-4">
					<h3 className="beam-text-lg beam-font-medium">
						Change Defaults for {modelName} ({displayInfoOfProviderName(providerName).title})
					</h3>
					<button
            onClick={onClose}
            className="beam-text-beam-fg-3 hover:beam-text-beam-fg-1">
            
						<X className="beam-size-5" />
					</button>
				</div>

				{/* Display model recognition status */}
				<div className="beam-text-sm beam-text-beam-fg-3 beam-mb-4">
					{type === 'default' ? `${modelName} comes packaged with Beam, so you shouldn't need to change these settings.` :
          isUnrecognizedModel ?
          `Model not recognized by Beam.` :
          `Beam recognizes ${modelName} ("${recognizedModelName}").`}
				</div>


				{/* override toggle */}
				<div className="beam-flex beam-items-center beam-gap-2 beam-mb-4">
					<BeamSwitch size='xs' value={overrideEnabled} onChange={setOverrideEnabled} />
					<span className="beam-text-beam-fg-3 beam-text-sm">Override model defaults</span>
				</div>

				{/* Informational link */}
				{overrideEnabled && <div className="beam-text-sm beam-text-beam-fg-3 beam-mb-4">
					<ChatMarkdownRender string={`See the [sourcecode](${sourcecodeOverridesLink}) for a reference on how to set this JSON (advanced).`} chatMessageLocation={undefined} />
				</div>}

				<textarea
          key={overrideEnabled + ''}
          ref={textAreaRef}
          className={`beam-w-full beam-min-h-[200px] beam-p-2 beam-rounded-sm beam-border beam-border-beam-border-2 beam-bg-beam-bg-2 beam-resize-none beam-font-mono beam-text-sm ${!overrideEnabled ? "beam-text-beam-fg-3" : ""}`}
          defaultValue={overrideEnabled && currentOverrides ? JSON.stringify(currentOverrides, null, 2) : placeholder}
          placeholder={placeholder}
          readOnly={!overrideEnabled} />
        
				{errorMsg &&
        <div className="beam-text-red-500 beam-mt-2 beam-text-sm">{errorMsg}</div>
        }


				<div className="beam-flex beam-justify-end beam-gap-2 beam-mt-4">
					<BeamButtonBgDarken onClick={onClose} className="beam-px-3 beam-py-1">
						Cancel
					</BeamButtonBgDarken>
					<BeamButtonBgDarken
            onClick={onSave}
            className="beam-px-3 beam-py-1 beam-bg-[#0e70c0] beam-text-white">
            
						Save
					</BeamButtonBgDarken>
				</div>
			</div>
		</div>);

};




export const ModelDump = ({ filteredProviders }: {filteredProviders?: ProviderName[];}) => {
  const accessor = useAccessor();
  const settingsStateService = accessor.get('IBeamSettingsService');
  const settingsState = useSettingsState();

  // State to track which model's settings dialog is open
  const [openSettingsModel, setOpenSettingsModel] = useState<{
    modelName: string;
    providerName: ProviderName;
    type: 'autodetected' | 'custom' | 'default';
  } | null>(null);

  // States for add model functionality
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [userChosenProviderName, setUserChosenProviderName] = useState<ProviderName | null>(null);
  const [modelName, setModelName] = useState<string>('');
  const [errorString, setErrorString] = useState('');

  // a dump of all the enabled providers' models
  const modelDump: (BeamStatefulModelInfo & {providerName: ProviderName;providerEnabled: boolean;})[] = [];

  // Use either filtered providers or all providers
  const providersToShow = filteredProviders || providerNames;

  for (let providerName of providersToShow) {
    const providerSettings = settingsState.settingsOfProvider[providerName];
    // if (!providerSettings.enabled) continue
    modelDump.push(...providerSettings.models.map((model) => ({ ...model, providerName, providerEnabled: !!providerSettings._didFillInProviderSettings })));
  }

  // sort by hidden
  modelDump.sort((a, b) => {
    return Number(b.providerEnabled) - Number(a.providerEnabled);
  });

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
    if (settingsState.settingsOfProvider[userChosenProviderName].models.find((m) => m.modelName === modelName)) {
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

  return <div className="">
		{modelDump.map((m, i) => {
      const { isHidden, type, modelName, providerName, providerEnabled } = m;

      const isNewProviderName = (i > 0 ? modelDump[i - 1] : undefined)?.providerName !== providerName;

      const providerTitle = displayInfoOfProviderName(providerName).title;

      const disabled = !providerEnabled;
      const value = disabled ? false : !isHidden;

      const tooltipName =
      disabled ? `Add ${providerTitle} to enable` :
      value === true ? 'Show in Dropdown' :
      'Hide from Dropdown';



      const detailAboutModel = type === 'autodetected' ?
      <Asterisk size={14} className="beam-inline-block beam-align-text-top beam-brightness-115 beam-stroke-[2] beam-text-[#0e70c0]" data-tooltip-id='beam-tooltip' data-tooltip-place='right' data-tooltip-content='Detected locally' /> :
      type === 'custom' ?
      <Asterisk size={14} className="beam-inline-block beam-align-text-top beam-brightness-115 beam-stroke-[2] beam-text-[#0e70c0]" data-tooltip-id='beam-tooltip' data-tooltip-place='right' data-tooltip-content='Custom model' /> :
      undefined;

      const hasOverrides = !!settingsState.overridesOfModel?.[providerName]?.[modelName];

      return <div key={`${modelName}${providerName}`}
      className={`beam-flex beam-items-center beam-justify-between beam-gap-4 hover:beam-bg-black/10 dark:hover:beam-bg-gray-300/10 beam-py-1 beam-px-3 beam-rounded-sm beam-overflow-hidden beam-cursor-default beam-truncate beam-group `}>

        
				{/* left part is width:full */}
				<div className={`beam-flex beam-flex-grow beam-items-center beam-gap-4`}>
					<span className="beam-w-full beam-max-w-32">{isNewProviderName ? providerTitle : ''}</span>
					<span className="beam-w-fit beam-max-w-[400px] beam-truncate">{modelName}</span>
				</div>

				{/* right part is anything that fits */}
				<div className="beam-flex beam-items-center beam-gap-2 beam-w-fit">

					{/* Advanced Settings button (gear). Hide entirely when provider/model disabled. */}
					{disabled ? null :
          <div className="beam-w-5 beam-flex beam-items-center beam-justify-center">
							<button
              onClick={() => {setOpenSettingsModel({ modelName, providerName, type });}}
              data-tooltip-id='beam-tooltip'
              data-tooltip-place='right'
              data-tooltip-content='Advanced Settings'
              className={`${hasOverrides ? "" : "beam-opacity-0 group-hover:beam-opacity-100"} beam-transition-opacity`}>
              
								<Plus size={12} className="beam-text-beam-fg-3 beam-opacity-50" />
							</button>
						</div>
          }

					{/* Blue star */}
					{detailAboutModel}


					{/* Switch */}
					<BeamSwitch
            value={value}
            onChange={() => {settingsStateService.toggleModelHidden(providerName, modelName);}}
            disabled={disabled}
            size='sm'

            data-tooltip-id='beam-tooltip'
            data-tooltip-place='right'
            data-tooltip-content={tooltipName} />
          

					{/* X button */}
					<div className={`beam-w-5 beam-flex beam-items-center beam-justify-center`}>
						{type === 'default' || type === 'autodetected' ? null : <button
              onClick={() => {settingsStateService.deleteModel(providerName, modelName);}}
              data-tooltip-id='beam-tooltip'
              data-tooltip-place='right'
              data-tooltip-content='Delete'
              className={`${hasOverrides ? "" : "beam-opacity-0 group-hover:beam-opacity-100"} beam-transition-opacity`}>
              
							<X size={12} className="beam-text-beam-fg-3 beam-opacity-50" />
						</button>}
					</div>
				</div>
			</div>;
    })}

		{/* Add Model Section */}
		{showCheckmark ?
    <div className="beam-mt-4">
				<AnimatedCheckmarkButton text='Added' className="beam-bg-[#0e70c0] beam-text-white beam-px-3 beam-py-1 beam-rounded-sm" />
			</div> :
    isAddModelOpen ?
    <div className="beam-mt-4">
				<form className="beam-flex beam-items-center beam-gap-2">

					{/* Provider dropdown */}
					<ErrorBoundary>
						<BeamCustomDropdownBox
            options={providersToShow}
            selectedOption={userChosenProviderName}
            onChangeOption={(pn) => setUserChosenProviderName(pn)}
            getOptionDisplayName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
            getOptionDropdownName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
            getOptionsEqual={(a, b) => a === b}
            className="beam-max-w-32 beam-mx-2 beam-w-full beam-resize-none beam-bg-beam-bg-1 beam-text-beam-fg-1 placeholder:beam-text-beam-fg-3 beam-border beam-border-beam-border-2 focus:beam-border-beam-border-1 beam-py-1 beam-px-2 beam-rounded"
            arrowTouchesText={false} />
          
					</ErrorBoundary>

					{/* Model name input */}
					<ErrorBoundary>
						<BeamSimpleInputBox
            value={modelName}
            compact={true}
            onChangeValue={setModelName}
            placeholder='Model Name'
            className="beam-max-w-32" />
          
					</ErrorBoundary>

					{/* Add button */}
					<ErrorBoundary>
						<AddButton
            type='button'
            disabled={!modelName || !userChosenProviderName}
            onClick={handleAddModel} />
          
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
          className="beam-text-beam-fg-4">
          
						<X className="beam-size-4" />
					</button>
				</form>

				{errorString &&
      <div className="beam-text-red-500 beam-truncate beam-whitespace-nowrap beam-mt-1">
						{errorString}
					</div>
      }
			</div> :

    <div
      className="beam-text-beam-fg-4 beam-flex beam-flex-nowrap beam-text-nowrap beam-items-center hover:beam-brightness-110 beam-cursor-pointer beam-mt-4"
      onClick={() => setIsAddModelOpen(true)}>
      
				<div className="beam-flex beam-items-center beam-gap-1">
					<Plus size={16} />
					<span>Add a model</span>
				</div>
			</div>
    }

		{/* Model Settings Dialog */}
		<SimpleModelSettingsDialog
      isOpen={openSettingsModel !== null}
      onClose={() => setOpenSettingsModel(null)}
      modelInfo={openSettingsModel} />
    
	</div>;
};



// providers

const ProviderSetting = ({ providerName, settingName, subTextMd }: {providerName: ProviderName;settingName: SettingName;subTextMd: React.ReactNode;}) => {

  const { title: settingTitle, placeholder, isPasswordField } = displayInfoOfSettingName(providerName, settingName);

  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const settingsState = useSettingsState();

  const settingValue = settingsState.settingsOfProvider[providerName][settingName] as string; // this should always be a string in this component
  if (typeof settingValue !== 'string') {
    console.log('Error: Provider setting had a non-string value.');
    return;
  }

  // Create a stable callback reference using useCallback with proper dependencies
  const handleChangeValue = useCallback((newVal: string) => {
    beamSettingsService.setSettingOfProvider(providerName, settingName, newVal);
  }, [beamSettingsService, providerName, settingName]);

  return <ErrorBoundary>
		<div className="beam-my-1">
			<BeamSimpleInputBox
        value={settingValue}
        onChangeValue={handleChangeValue}
        placeholder={`${settingTitle} (${placeholder})`}
        passwordBlur={isPasswordField}
        compact={true} />
      
			{!subTextMd ? null : <div className="beam-py-1 beam-px-3 beam-opacity-50 beam-text-sm">
				{subTextMd}
			</div>}
		</div>
	</ErrorBoundary>;
};

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


export const SettingsForProvider = ({ providerName, showProviderTitle, showProviderSuggestions }: {providerName: ProviderName;showProviderTitle: boolean;showProviderSuggestions: boolean;}) => {
  const beamSettingsState = useSettingsState();

  const needsModel = isProviderNameDisabled(providerName, beamSettingsState) === 'addModel';

  // const accessor = useAccessor()
  // const beamSettingsService = accessor.get('IBeamSettingsService')

  // const { enabled } = beamSettingsState.settingsOfProvider[providerName]
  const settingNames = customSettingNamesOfProvider(providerName);

  const { title: providerTitle } = displayInfoOfProviderName(providerName);

  return <div>

		<div className="beam-flex beam-items-center beam-w-full beam-gap-4">
			{showProviderTitle && <h3 className="beam-text-xl beam-truncate">{providerTitle}</h3>}

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

		<div className="beam-px-0">
			{/* settings besides models (e.g. api key) */}
			{settingNames.map((settingName, i) => {

        return <ProviderSetting
          key={settingName}
          providerName={providerName}
          settingName={settingName}
          subTextMd={i !== settingNames.length - 1 ? null :
          <ChatMarkdownRender string={subTextMdOfProviderName(providerName)} chatMessageLocation={undefined} />} />;

      })}

			{showProviderSuggestions && needsModel ?
      providerName === 'ollama' ?
      <WarningBox className="beam-pl-2 beam-mb-4" text={`Please install an Ollama model. We'll auto-detect it.`} /> :
      <WarningBox className="beam-pl-2 beam-mb-4" text={`Please add a model for ${providerTitle} (Models section).`} /> :
      null}
		</div>
	</div>;
};


export const BeamProviderSettings = ({ providerNames }: {providerNames: ProviderName[];}) => {
  return <>
		{providerNames.map((providerName) =>
    <SettingsForProvider key={providerName} providerName={providerName} showProviderTitle={true} showProviderSuggestions={true} />
    )}
	</>;
};


type TabName = 'models' | 'general';
export const AutoDetectLocalModelsToggle = () => {
  const settingName: GlobalSettingName = 'autoRefreshModels';

  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const metricsService = accessor.get('IMetricsService');

  const beamSettingsState = useSettingsState();

  // right now this is just `enabled_autoRefreshModels`
  const enabled = beamSettingsState.globalSettings[settingName];

  return <ButtonLeftTextRightOption
    leftButton={<BeamSwitch
      size='xxs'
      value={enabled}
      onChange={(newVal) => {
        beamSettingsService.setGlobalSetting(settingName, newVal);
        metricsService.capture('Click', { action: 'Autorefresh Toggle', settingName, enabled: newVal });
      }} />
    }
    text={`Automatically detect local providers and models (${refreshableProviderNames.map((providerName) => displayInfoOfProviderName(providerName).title).join(', ')}).`} />;



};

export const AIInstructionsBox = () => {
  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const beamSettingsState = useSettingsState();
  return <BeamInputBox2
    className="beam-min-h-[81px] beam-p-3 beam-rounded-sm"
    initValue={beamSettingsState.globalSettings.aiInstructions}
    placeholder={`Do not change my indentation or delete my comments. When writing TS or JS, do not add ;'s. Write new code using Rust if possible. `}
    multiline
    onChangeText={(newText) => {
      beamSettingsService.setGlobalSetting('aiInstructions', newText);
    }} />;

};

const FastApplyMethodDropdown = () => {
  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');

  const options = useMemo(() => [true, false], []);

  const onChangeOption = useCallback((newVal: boolean) => {
    beamSettingsService.setGlobalSetting('enableFastApply', newVal);
  }, [beamSettingsService]);

  return <BeamCustomDropdownBox
    className="beam-text-xs beam-text-beam-fg-3 beam-bg-beam-bg-1 beam-border beam-border-beam-border-1 beam-rounded beam-p-0.5 beam-px-1"
    options={options}
    selectedOption={beamSettingsService.state.globalSettings.enableFastApply}
    onChangeOption={onChangeOption}
    getOptionDisplayName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
    getOptionDropdownName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
    getOptionDropdownDetail={(val) => val ? 'Output Search/Replace blocks' : 'Rewrite whole files'}
    getOptionsEqual={(a, b) => a === b} />;


};


export const OllamaSetupInstructions = ({ sayWeAutoDetect }: {sayWeAutoDetect?: boolean;}) => {
  return <div className="prose-p:beam-my-0 prose-ol:beam-list-decimal prose-p:beam-py-0 prose-ol:beam-my-0 prose-ol:beam-py-0 prose-span:beam-my-0 prose-span:beam-py-0 beam-text-beam-fg-3 beam-text-sm beam-list-decimal beam-select-text">
		<div className=""><ChatMarkdownRender string={`Ollama Setup Instructions`} chatMessageLocation={undefined} /></div>
		<div className=" beam-pl-6"><ChatMarkdownRender string={`1. Download [Ollama](https://ollama.com/download).`} chatMessageLocation={undefined} /></div>
		<div className=" beam-pl-6"><ChatMarkdownRender string={`2. Open your terminal.`} chatMessageLocation={undefined} /></div>
		<div
      className="beam-pl-6 beam-flex beam-items-center beam-w-fit"
      data-tooltip-id='beam-tooltip-ollama-settings'>
      
			<ChatMarkdownRender string={`3. Run \`ollama pull your_model\` to install a model.`} chatMessageLocation={undefined} />
		</div>
		{sayWeAutoDetect && <div className=" beam-pl-6"><ChatMarkdownRender string={`Beam automatically detects locally running models and enables them.`} chatMessageLocation={undefined} /></div>}
	</div>;
};


const RedoOnboardingButton = ({ className }: {className?: string;}) => {
  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  return <div
    className={`beam-text-beam-fg-4 beam-flex beam-flex-nowrap beam-text-nowrap beam-items-center hover:beam-brightness-110 beam-cursor-pointer ${className}`}
    onClick={() => {beamSettingsService.setGlobalSetting('isOnboardingComplete', false);}}>
    
		See onboarding screen?
	</div>;

};







export const ToolApprovalTypeSwitch = ({ approvalType, size, desc }: {approvalType: ToolApprovalType;size: "xxs" | "xs" | "sm" | "sm+" | "md";desc: string;}) => {
  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const beamSettingsState = useSettingsState();
  const metricsService = accessor.get('IMetricsService');

  const onToggleAutoApprove = useCallback((approvalType: ToolApprovalType, newValue: boolean) => {
    beamSettingsService.setGlobalSetting('autoApprove', {
      ...beamSettingsService.state.globalSettings.autoApprove,
      [approvalType]: newValue
    });
    metricsService.capture('Tool Auto-Accept Toggle', { enabled: newValue });
  }, [beamSettingsService, metricsService]);

  return <>
		<BeamSwitch
      size={size}
      value={beamSettingsState.globalSettings.autoApprove[approvalType] ?? false}
      onChange={(newVal) => onToggleAutoApprove(approvalType, newVal)} />
    
		<span className="beam-text-beam-fg-3 beam-text-xs">{desc}</span>
	</>;
};



export const OneClickSwitchButton = ({ fromEditor = 'VS Code', className = '' }: {fromEditor?: TransferEditorType;className?: string;}) => {
  const accessor = useAccessor();
  const extensionTransferService = accessor.get('IExtensionTransferService');

  const [transferState, setTransferState] = useState<{type: 'done';error?: string;} | {type: 'loading' | 'justfinished';}>({ type: 'done' });



  const onClick = async () => {
    if (transferState.type !== 'done') return;

    setTransferState({ type: 'loading' });

    const errAcc = await extensionTransferService.transferExtensions(os, fromEditor);

    // Even if some files were missing, consider it a success if no actual errors occurred
    const hadError = !!errAcc;
    if (hadError) {
      setTransferState({ type: 'done', error: errAcc });
    } else
    {
      setTransferState({ type: 'justfinished' });
      setTimeout(() => {setTransferState({ type: 'done' });}, 3000);
    }
  };

  return <>
		<BeamButtonBgDarken className={`beam-max-w-48 beam-p-4 ${className}`} disabled={transferState.type !== 'done'} onClick={onClick}>
			{transferState.type === 'done' ? `Transfer from ${fromEditor}` :
      transferState.type === 'loading' ? <span className="beam-text-nowrap beam-flex beam-flex-nowrap">Transferring<IconLoading /></span> :
      transferState.type === 'justfinished' ? <AnimatedCheckmarkButton text='Settings Transferred' className="beam-bg-none" /> :
      null
      }
		</BeamButtonBgDarken>
		{transferState.type === 'done' && transferState.error ? <WarningBox text={transferState.error} /> : null}
	</>;
};


// full settings

// MCP Server component
const MCPServerComponent = ({ name, server }: {name: string;server: MCPServer;}) => {
  const accessor = useAccessor();
  const mcpService = accessor.get('IMCPService');

  const beamSettings = useSettingsState();
  const isOn = beamSettings.mcpUserStateOfName[name]?.isOn;

  const removeUniquePrefix = (name: string) => name.split('_').slice(1).join('_');

  return (
    <div className="beam-border beam-border-beam-border-2 beam-bg-beam-bg-1 beam-py-3 beam-px-4 beam-rounded-sm beam-my-2">
			<div className="beam-flex beam-items-center beam-justify-between">
				{/* Left side - status and name */}
				<div className="beam-flex beam-items-center beam-gap-2">
					{/* Status indicator */}
					<div className={`beam-w-2 beam-h-2 beam-rounded-full ${
          server.status === 'success' ? "beam-bg-green-500" :
          server.status === 'error' ? "beam-bg-red-500" :
          server.status === 'loading' ? "beam-bg-yellow-500" :
          server.status === 'offline' ? "beam-bg-beam-fg-3" : ""} `}>

          </div>

					{/* Server name */}
					<div className="beam-text-sm beam-font-medium beam-text-beam-fg-1">{name}</div>
				</div>

				{/* Right side - power toggle switch */}
				<BeamSwitch
          value={isOn ?? false}
          size='xs'
          disabled={server.status === 'error'}
          onChange={() => mcpService.toggleServerIsOn(name, !isOn)} />
        
			</div>

			{/* Tools section */}
			{isOn &&
      <div className="beam-mt-3">
					<div className="beam-flex beam-flex-wrap beam-gap-2 beam-max-h-32 beam-overflow-y-auto">
						{(server.tools ?? []).length > 0 ?
          (server.tools ?? []).map((tool: {name: string;description?: string;}) =>
          <span
            key={tool.name}
            className="beam-px-2 beam-py-0.5 beam-bg-beam-bg-2 beam-text-beam-fg-3 beam-rounded-sm beam-text-xs"

            data-tooltip-id='beam-tooltip'
            data-tooltip-content={tool.description || ''}
            data-tooltip-class-name='beam-max-w-[300px]'>
            
									{removeUniquePrefix(tool.name)}
								</span>
          ) :

          <span className="beam-text-xs beam-text-beam-fg-3">No tools available</span>
          }
					</div>
				</div>
      }

			{/* Command badge */}
			{isOn && server.command &&
      <div className="beam-mt-3">
					<div className="beam-text-xs beam-text-beam-fg-3 beam-mb-1">Command:</div>
					<div className="beam-px-2 beam-py-1 beam-bg-beam-bg-2 beam-text-xs beam-font-mono beam-overflow-x-auto beam-whitespace-nowrap beam-text-beam-fg-2 beam-rounded-sm">
						{server.command}
					</div>
				</div>
      }

			{/* Error message if present */}
			{server.error &&
      <div className="beam-mt-3">
					<WarningBox text={server.error} />
				</div>
      }
		</div>);

};

// Main component that renders the list of servers
const MCPServersList = () => {
  const mcpServiceState = useMCPServiceState();

  let content: React.ReactNode;
  if (mcpServiceState.error) {
    content = <div className="beam-text-beam-fg-3 beam-text-sm beam-mt-2">
			{mcpServiceState.error}
		</div>;
  } else
  {
    const entries = Object.entries(mcpServiceState.mcpServerOfName);
    if (entries.length === 0) {
      content = <div className="beam-text-beam-fg-3 beam-text-sm beam-mt-2">
				No servers found
			</div>;
    } else
    {
      content = entries.map(([name, server]) =>
      <MCPServerComponent key={name} name={name} server={server} />
      );
    }
  }

  return <div className="beam-my-2">{content}</div>;
};

export const Settings = () => {
  const isDark = useIsDark();
  // ─── sidebar nav ──────────────────────────
  const [selectedSection, setSelectedSection] =
  useState<Tab>('models');

  const navItems: {tab: Tab;label: string;}[] = [
  { tab: 'models', label: 'Models' },
  { tab: 'localProviders', label: 'Local Providers' },
  { tab: 'providers', label: 'Main Providers' },
  { tab: 'featureOptions', label: 'Feature Options' },
  { tab: 'general', label: 'General' },
  { tab: 'mcp', label: 'MCP' },
  { tab: 'all', label: 'All Settings' }];

  const shouldShowTab = (tab: Tab) => selectedSection === 'all' || selectedSection === tab;
  const accessor = useAccessor();
  const commandService = accessor.get('ICommandService');
  const environmentService = accessor.get('IEnvironmentService');
  const nativeHostService = accessor.get('INativeHostService');
  const settingsState = useSettingsState();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const chatThreadsService = accessor.get('IChatThreadService');
  const notificationService = accessor.get('INotificationService');
  const mcpService = accessor.get('IMCPService');
  const storageService = accessor.get('IStorageService');
  const metricsService = accessor.get('IMetricsService');
  const isOptedOut = useIsOptedOut();

  const onDownload = (t: 'Chats' | 'Settings') => {
    let dataStr: string;
    let downloadName: string;
    if (t === 'Chats') {
      // Export chat threads
      dataStr = JSON.stringify(chatThreadsService.state, null, 2);
      downloadName = 'beam-chats.json';
    } else
    if (t === 'Settings') {
      // Export user settings
      dataStr = JSON.stringify(beamSettingsService.state, null, 2);
      downloadName = 'beam-settings.json';
    } else
    {
      dataStr = '';
      downloadName = '';
    }

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Add file input refs
  const fileInputSettingsRef = useRef<HTMLInputElement>(null);
  const fileInputChatsRef = useRef<HTMLInputElement>(null);

  const [s, ss] = useState(0);

  const handleUpload = (t: 'Chats' | 'Settings') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);

        if (t === 'Chats') {
          chatThreadsService.dangerousSetState(json as any);
        } else
        if (t === 'Settings') {
          beamSettingsService.dangerousSetState(json as any);
        }

        notificationService.info(`${t} imported successfully!`);
      } catch (err) {
        notificationService.notify({ message: `Failed to import ${t}`, source: err + '', severity: Severity.Error });
      }
    };
    reader.readAsText(file);
    e.target.value = '';

    ss((s) => s + 1);
  };


  return (
    <div className={`beam-scope ${isDark ? "beam-dark" : ""}`} style={{ height: '100%', width: '100%', overflow: 'auto' }}>
			<div className="beam-flex beam-flex-col md:beam-flex-row beam-w-full beam-gap-6 beam-max-w-[900px] beam-mx-auto beam-mb-32" style={{ minHeight: '80vh' }}>
				{/* ──────────────  SIDEBAR  ────────────── */}

				<aside className="md:beam-w-1/4 beam-w-full beam-p-6 beam-shrink-0">
					{/* vertical tab list */}
					<div className="beam-flex beam-flex-col beam-gap-2 beam-mt-12">
						{navItems.map(({ tab, label }) =>
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
              className={` beam-py-2 beam-px-4 beam-rounded-md beam-text-left beam-transition-all beam-duration-200 ${

              selectedSection === tab ? "beam-bg-[#0e70c0]/80 beam-text-white beam-font-medium beam-shadow-sm" : "beam-bg-beam-bg-2 hover:beam-bg-beam-bg-2/80 beam-text-beam-fg-1"} `}>



              
								{label}
							</button>
            )}
					</div>
				</aside>

				{/* ───────────── MAIN PANE ───────────── */}
				<main className="beam-flex-1 beam-p-6 beam-select-none">



					<div className="beam-max-w-3xl">

						<h1 className="beam-text-2xl beam-w-full">{`Beam's Settings`}</h1>

						<div className="beam-w-full beam-h-[1px] beam-my-2" />

						{/* Models section (formerly FeaturesTab) */}
						<ErrorBoundary>
							<RedoOnboardingButton />
						</ErrorBoundary>

						<div className="beam-w-full beam-h-[1px] beam-my-4" />

						{/* All sections in flex container with gap-12 */}
						<div className="beam-flex beam-flex-col beam-gap-12">
							{/* Models section (formerly FeaturesTab) */}
							<div className={shouldShowTab('models') ? `` : "beam-hidden"}>
								<ErrorBoundary>
									<h2 className={`beam-text-3xl beam-mb-2`}>Models</h2>
									<ModelDump />
									<div className="beam-w-full beam-h-[1px] beam-my-4" />
									<AutoDetectLocalModelsToggle />
									<RefreshableModels />
								</ErrorBoundary>
							</div>

							{/* Local Providers section */}
							<div className={shouldShowTab('localProviders') ? `` : "beam-hidden"}>
								<ErrorBoundary>
									<h2 className={`beam-text-3xl beam-mb-2`}>Local Providers</h2>
									<h3 className={`beam-text-beam-fg-3 beam-mb-2`}>{`Beam can access any model that you host locally. We automatically detect your local models by default.`}</h3>

									<div className="beam-opacity-80 beam-mb-4">
										<OllamaSetupInstructions sayWeAutoDetect={true} />
									</div>

									<BeamProviderSettings providerNames={localProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Main Providers section */}
							<div className={shouldShowTab('providers') ? `` : "beam-hidden"}>
								<ErrorBoundary>
									<h2 className={`beam-text-3xl beam-mb-2`}>Main Providers</h2>
									<h3 className={`beam-text-beam-fg-3 beam-mb-2`}>{`Beam can access models from Anthropic, OpenAI, OpenRouter, and more.`}</h3>

									<BeamProviderSettings providerNames={nonlocalProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Feature Options section */}
							<div className={shouldShowTab('featureOptions') ? `` : "beam-hidden"}>
								<ErrorBoundary>
									<h2 className={`beam-text-3xl beam-mb-2`}>Feature Options</h2>

									<div className="beam-flex beam-flex-col beam-gap-y-8 beam-my-4">
										<ErrorBoundary>
											{/* FIM */}
											<div>
												<h4 className={`beam-text-base`}>{displayInfoOfFeatureName('Autocomplete')}</h4>
												<div className="beam-text-sm beam-text-beam-fg-3 beam-mt-1">
													<span>
														Experimental.{' '}
													</span>
													<span
                            className="hover:beam-brightness-110"
                            data-tooltip-id='beam-tooltip'
                            data-tooltip-content='We recommend using the largest qwen2.5-coder model you can with Ollama (try qwen2.5-coder:3b).'
                            data-tooltip-class-name='beam-max-w-[20px]'>
                            
														Only works with FIM models.*
													</span>
												</div>

												<div className="beam-my-2">
													{/* Enable Switch */}
													<ErrorBoundary>
														<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
															<BeamSwitch
                                size='xs'
                                value={settingsState.globalSettings.enableAutocomplete}
                                onChange={(newVal) => beamSettingsService.setGlobalSetting('enableAutocomplete', newVal)} />
                              
															<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{settingsState.globalSettings.enableAutocomplete ? 'Enabled' : 'Disabled'}</span>
														</div>
													</ErrorBoundary>

													{/* Model Dropdown */}
													<ErrorBoundary>
														<div className={`beam-my-2 ${!settingsState.globalSettings.enableAutocomplete ? "beam-hidden" : ""}`}>
															<ModelDropdown featureName={'Autocomplete'} className="beam-text-xs beam-text-beam-fg-3 beam-bg-beam-bg-1 beam-border beam-border-beam-border-1 beam-rounded beam-p-0.5 beam-px-1" />
														</div>
													</ErrorBoundary>

												</div>

											</div>
										</ErrorBoundary>

										{/* Apply */}
										<ErrorBoundary>

											<div className="beam-w-full">
												<h4 className={`beam-text-base`}>{displayInfoOfFeatureName('Apply')}</h4>
												<div className="beam-text-sm beam-text-beam-fg-3 beam-mt-1">Settings that control the behavior of the Apply button.</div>

												<div className="beam-my-2">
													{/* Sync to Chat Switch */}
													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<BeamSwitch
                              size='xs'
                              value={settingsState.globalSettings.syncApplyToChat}
                              onChange={(newVal) => beamSettingsService.setGlobalSetting('syncApplyToChat', newVal)} />
                            
														<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{settingsState.globalSettings.syncApplyToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`beam-my-2 ${settingsState.globalSettings.syncApplyToChat ? "beam-hidden" : ""}`}>
														<ModelDropdown featureName={'Apply'} className="beam-text-xs beam-text-beam-fg-3 beam-bg-beam-bg-1 beam-border beam-border-beam-border-1 beam-rounded beam-p-0.5 beam-px-1" />
													</div>
												</div>


												<div className="beam-my-2">
													{/* Fast Apply Method Dropdown */}
													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<FastApplyMethodDropdown />
													</div>
												</div>

											</div>
										</ErrorBoundary>




										{/* Tools Section */}
										<div>
											<h4 className={`beam-text-base`}>Tools</h4>
											<div className="beam-text-sm beam-text-beam-fg-3 beam-mt-1">{`Tools are functions that LLMs can call. Some tools require user approval.`}</div>

											<div className="beam-my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													{[...toolApprovalTypes].map((approvalType) => {
                            return <div key={approvalType} className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
															<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
														</div>;
                          })}

												</ErrorBoundary>

												{/* Tool Lint Errors Switch */}
												<ErrorBoundary>

													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<BeamSwitch
                              size='xs'
                              value={settingsState.globalSettings.includeToolLintErrors}
                              onChange={(newVal) => beamSettingsService.setGlobalSetting('includeToolLintErrors', newVal)} />
                            
														<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{settingsState.globalSettings.includeToolLintErrors ? 'Fix lint errors' : `Fix lint errors`}</span>
													</div>
												</ErrorBoundary>

												{/* Auto Accept LLM Changes Switch */}
												<ErrorBoundary>
													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<BeamSwitch
                              size='xs'
                              value={settingsState.globalSettings.autoAcceptLLMChanges}
                              onChange={(newVal) => beamSettingsService.setGlobalSetting('autoAcceptLLMChanges', newVal)} />
                            
														<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">Auto-accept LLM changes</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>



										<div className="beam-w-full">
											<h4 className={`beam-text-base`}>Editor</h4>
											<div className="beam-text-sm beam-text-beam-fg-3 beam-mt-1">{`Settings that control the visibility of Beam suggestions in the code editor.`}</div>

											<div className="beam-my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<BeamSwitch
                              size='xs'
                              value={settingsState.globalSettings.showInlineSuggestions}
                              onChange={(newVal) => beamSettingsService.setGlobalSetting('showInlineSuggestions', newVal)} />
                            
														<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{settingsState.globalSettings.showInlineSuggestions ? 'Show suggestions on select' : 'Show suggestions on select'}</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										{/* SCM */}
										<ErrorBoundary>

											<div className="beam-w-full">
												<h4 className={`beam-text-base`}>{displayInfoOfFeatureName('SCM')}</h4>
												<div className="beam-text-sm beam-text-beam-fg-3 beam-mt-1">Settings that control the behavior of the commit message generator.</div>

												<div className="beam-my-2">
													{/* Sync to Chat Switch */}
													<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
														<BeamSwitch
                              size='xs'
                              value={settingsState.globalSettings.syncSCMToChat}
                              onChange={(newVal) => beamSettingsService.setGlobalSetting('syncSCMToChat', newVal)} />
                            
														<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{settingsState.globalSettings.syncSCMToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													{/* Model Dropdown */}
													<div className={`beam-my-2 ${settingsState.globalSettings.syncSCMToChat ? "beam-hidden" : ""}`}>
														<ModelDropdown featureName={'SCM'} className="beam-text-xs beam-text-beam-fg-3 beam-bg-beam-bg-1 beam-border beam-border-beam-border-1 beam-rounded beam-p-0.5 beam-px-1" />
													</div>
												</div>

											</div>
										</ErrorBoundary>
									</div>
								</ErrorBoundary>
							</div>

							{/* General section */}
							<div className={`${shouldShowTab('general') ? `` : "beam-hidden"} beam-flex beam-flex-col beam-gap-12`}>
								{/* One-Click Switch section */}
								<div>
									<ErrorBoundary>
										<h2 className="beam-text-3xl beam-mb-2">One-Click Switch</h2>
										<h4 className="beam-text-beam-fg-3 beam-mb-4">{`Transfer your editor settings into Beam.`}</h4>

										<div className="beam-flex beam-flex-col beam-gap-2">
											<OneClickSwitchButton className="beam-w-48" fromEditor="VS Code" />
											<OneClickSwitchButton className="beam-w-48" fromEditor="Cursor" />
											<OneClickSwitchButton className="beam-w-48" fromEditor="Windsurf" />
										</div>
									</ErrorBoundary>
								</div>

								{/* Import/Export section */}
								<div>
									<h2 className="beam-text-3xl beam-mb-2">Import/Export</h2>
									<h4 className="beam-text-beam-fg-3 beam-mb-4">{`Transfer Beam's settings and chats in and out of Beam.`}</h4>
									<div className="beam-flex beam-flex-col beam-gap-8">
										{/* Settings Subcategory */}
										<div className="beam-flex beam-flex-col beam-gap-2 beam-max-w-48 beam-w-full">
											<input key={2 * s} ref={fileInputSettingsRef} type='file' accept='.json' className="beam-hidden" onChange={handleUpload('Settings')} />
											<BeamButtonBgDarken className="beam-px-4 beam-py-1 beam-w-full" onClick={() => {fileInputSettingsRef.current?.click();}}>
												Import Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className="beam-px-4 beam-py-1 beam-w-full" onClick={() => onDownload('Settings')}>
												Export Settings
											</BeamButtonBgDarken>
											<ConfirmButton className="beam-px-4 beam-py-1 beam-w-full" onConfirm={() => {beamSettingsService.resetState();}}>
												Reset Settings
											</ConfirmButton>
										</div>

										{/* Chats Subcategory */}
										<div className="beam-flex beam-flex-col beam-gap-2 beam-max-w-48 beam-w-full">
											<input key={2 * s + 1} ref={fileInputChatsRef} type='file' accept='.json' className="beam-hidden" onChange={handleUpload('Chats')} />
											<BeamButtonBgDarken className="beam-px-4 beam-py-1 beam-w-full" onClick={() => {fileInputChatsRef.current?.click();}}>
												Import Chats
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className="beam-px-4 beam-py-1 beam-w-full" onClick={() => onDownload('Chats')}>
												Export Chats
											</BeamButtonBgDarken>
											<ConfirmButton className="beam-px-4 beam-py-1 beam-w-full" onConfirm={() => {chatThreadsService.resetState();}}>
												Reset Chats
											</ConfirmButton>
										</div>
									</div>
								</div>



								{/* Built-in Settings section */}
								<div>
									<h2 className={`beam-text-3xl beam-mb-2`}>Built-in Settings</h2>
									<h4 className={`beam-text-beam-fg-3 beam-mb-4`}>{`IDE settings, keyboard settings, and theme customization.`}</h4>

									<ErrorBoundary>
										<div className="beam-flex beam-flex-col beam-gap-2 beam-justify-center beam-max-w-48 beam-w-full">
											<BeamButtonBgDarken className="beam-px-4 beam-py-1" onClick={() => {commandService.executeCommand('workbench.action.openSettings');}}>
												General Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className="beam-px-4 beam-py-1" onClick={() => {commandService.executeCommand('workbench.action.openGlobalKeybindings');}}>
												Keyboard Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className="beam-px-4 beam-py-1" onClick={() => {commandService.executeCommand('workbench.action.selectTheme');}}>
												Theme Settings
											</BeamButtonBgDarken>
											<BeamButtonBgDarken className="beam-px-4 beam-py-1" onClick={() => {nativeHostService.showItemInFolder(environmentService.logsHome.fsPath);}}>
												Open Logs
											</BeamButtonBgDarken>
										</div>
									</ErrorBoundary>
								</div>


								{/* Metrics section */}
								<div className="beam-max-w-[600px]">
									<h2 className={`beam-text-3xl beam-mb-2`}>Metrics</h2>
									<h4 className={`beam-text-beam-fg-3 beam-mb-4`}>Very basic anonymous usage tracking helps us keep Beam running smoothly. You may opt out below. Regardless of this setting, Beam never sees your code, messages, or API keys.</h4>

									<div className="beam-my-2">
										{/* Disable All Metrics Switch */}
										<ErrorBoundary>
											<div className="beam-flex beam-items-center beam-gap-x-2 beam-my-2">
												<BeamSwitch
                          size='xs'
                          value={isOptedOut}
                          onChange={(newVal) => {
                            storageService.store(OPT_OUT_KEY, newVal, StorageScope.APPLICATION, StorageTarget.MACHINE);
                            metricsService.capture(`Set metrics opt-out to ${newVal}`, {}); // this only fires if it's enabled, so it's fine to have here
                          }} />
                        
												<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">{'Opt-out (requires restart)'}</span>
											</div>
										</ErrorBoundary>
									</div>
								</div>

								{/* AI Instructions section */}
								<div className="beam-max-w-[600px]">
									<h2 className={`beam-text-3xl beam-mb-2`}>AI Instructions</h2>
									<h4 className={`beam-text-beam-fg-3 beam-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
System instructions to include with all AI requests.
Alternatively, place a \`.beamrules\` file in the root of your workspace.
								`} chatMessageLocation={undefined} />
									</h4>
									<ErrorBoundary>
										<AIInstructionsBox />
									</ErrorBoundary>
									{/* --- Disable System Message Toggle --- */}
									<div className="beam-my-4">
										<ErrorBoundary>
											<div className="beam-flex beam-items-center beam-gap-x-2">
												<BeamSwitch
                          size='xs'
                          value={!!settingsState.globalSettings.disableSystemMessage}
                          onChange={(newValue) => {
                            beamSettingsService.setGlobalSetting('disableSystemMessage', newValue);
                          }} />
                        
												<span className="beam-text-beam-fg-3 beam-text-xs beam-pointer-events-none">
													{'Disable system message'}
												</span>
											</div>
										</ErrorBoundary>
										<div className="beam-text-beam-fg-3 beam-text-xs beam-mt-1">
											{`When disabled, Beam will not include anything in the system message except for content you specified above.`}
										</div>
									</div>
								</div>

							</div>



							{/* MCP section */}
							<div className={shouldShowTab('mcp') ? `` : "beam-hidden"}>
								<ErrorBoundary>
									<h2 className="beam-text-3xl beam-mb-2">MCP</h2>
									<h4 className={`beam-text-beam-fg-3 beam-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
Use Model Context Protocol to provide Agent mode with more tools.
							`} chatMessageLocation={undefined} />
									</h4>
									<div className="beam-my-2">
										<BeamButtonBgDarken className="beam-px-4 beam-py-1 beam-w-full beam-max-w-48" onClick={async () => {await mcpService.revealMCPConfigFile();}}>
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
		</div>);

};