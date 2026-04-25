/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, X } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/beamSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { OllamaSetupInstructions, OneClickSwitchButton, SettingsForProvider, ModelDump } from '../beam-settings-tsx/Settings.js';
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { isLinux } from '../../../../../../../base/common/platform.js';

const OVERRIDE_VALUE = false;

export const BeamOnboarding = () => {

  const beamSettingsState = useSettingsState();
  const isOnboardingComplete = beamSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE;

  const isDark = useIsDark();

  return (
    <div className={`beam-scope ${isDark ? "beam-dark" : ""}`}>
			<div
        className={` beam-bg-beam-bg-3 beam-fixed beam-top-0 beam-right-0 beam-bottom-0 beam-left-0 beam-width-full beam-z-[99999] beam-transition-all beam-duration-1000 ${

        isOnboardingComplete ? "beam-opacity-0 beam-pointer-events-none" : "beam-opacity-100 beam-pointer-events-auto"} `}

        style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
				<ErrorBoundary>
					<BeamOnboardingContent />
				</ErrorBoundary>
			</div>
		</div>);

};

const BeamIcon = () => {
  const accessor = useAccessor();
  const themeService = accessor.get('IThemeService');

  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // void icon style
    const updateTheme = () => {
      const theme = themeService.getColorTheme().type;
      const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK;
      if (divRef.current) {
        divRef.current.style.maxWidth = '220px';
        divRef.current.style.opacity = '50%';
        divRef.current.style.filter = isDark ? '' : 'invert(1)'; //brightness(.5)
      }
    };
    updateTheme();
    const d = themeService.onDidColorThemeChange(updateTheme);
    return () => d.dispose();
  }, []);

  return <div ref={divRef} className="beam-icon" />;
};

const FADE_DURATION_MS = 2000;

const FadeIn = ({ children, className, delayMs = 0, durationMs, ...props }: {children: React.ReactNode;delayMs?: number;durationMs?: number;className?: string;} & React.HTMLAttributes<HTMLDivElement>) => {

  const [opacity, setOpacity] = useState(0);

  const effectiveDurationMs = durationMs ?? FADE_DURATION_MS;

  useEffect(() => {

    const timeout = setTimeout(() => {
      setOpacity(1);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [setOpacity, delayMs]);


  return (
    <div className={className} style={{ opacity, transition: `opacity ${effectiveDurationMs}ms ease-in-out` }} {...props}>
			{children}
		</div>);

};

// Onboarding

// =============================================
//  New AddProvidersPage Component and helpers
// =============================================

const tabNames = ['Free', 'Paid', 'Local'] as const;

type TabName = typeof tabNames[number] | 'Cloud/Other';

// Data for cloud providers tab
const cloudProviders: ProviderName[] = ['googleVertex', 'liteLLM', 'microsoftAzure', 'awsBedrock', 'openAICompatible'];

// Data structures for provider tabs
const providerNamesOfTab: Record<TabName, ProviderName[]> = {
  Free: ['gemini', 'openRouter'],
  Local: localProviderNames,
  Paid: providerNames.filter((pn) => !(['gemini', 'openRouter', ...localProviderNames, ...cloudProviders] as string[]).includes(pn)) as ProviderName[],
  'Cloud/Other': cloudProviders
};

const descriptionOfTab: Record<TabName, string> = {
  Free: `Providers with a 100% free tier. Add as many as you'd like!`,
  Paid: `Connect directly with any provider (bring your own key).`,
  Local: `Active providers should appear automatically. Add as many as you'd like! `,
  'Cloud/Other': `Add as many as you'd like! Reach out for custom configuration requests.`
};


const featureNameMap: {display: string;featureName: FeatureName;}[] = [
{ display: 'Chat', featureName: 'Chat' },
{ display: 'Quick Edit', featureName: 'Ctrl+K' },
{ display: 'Autocomplete', featureName: 'Autocomplete' },
{ display: 'Fast Apply', featureName: 'Apply' },
{ display: 'Source Control', featureName: 'SCM' }];


const AddProvidersPage = ({ pageIndex, setPageIndex }: {pageIndex: number;setPageIndex: (index: number) => void;}) => {
  const [currentTab, setCurrentTab] = useState<TabName>('Free');
  const settingsState = useSettingsState();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear error message after 5 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (errorMessage) {
      timeoutId = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }

    // Cleanup function to clear the timeout if component unmounts or error changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [errorMessage]);

  return <div className="beam-flex beam-flex-col md:beam-flex-row beam-w-full beam-h-[80vh] beam-gap-6 beam-max-w-[900px] beam-mx-auto beam-relative">
		{/* Left Column */}
		<div className="md:beam-w-1/4 beam-w-full beam-flex beam-flex-col beam-gap-6 beam-p-6 beam-border-none beam-border-beam-border-2 beam-h-full beam-overflow-y-auto">
			{/* Tab Selector */}
			<div className="beam-flex md:beam-flex-col beam-gap-2">
				{[...tabNames, 'Cloud/Other'].map((tab) =>
        <button
          key={tab}
          className={`beam-py-2 beam-px-4 beam-rounded-md beam-text-left ${currentTab === tab ? "beam-bg-[#0e70c0]/80 beam-text-white beam-font-medium beam-shadow-sm" : "beam-bg-beam-bg-2 hover:beam-bg-beam-bg-2/80 beam-text-beam-fg-1"} beam-transition-all beam-duration-200`}



          onClick={() => {
            setCurrentTab(tab as TabName);
            setErrorMessage(null); // Reset error message when changing tabs
          }}>
          
						{tab}
					</button>
        )}
			</div>

			{/* Feature Checklist */}
			<div className="beam-flex beam-flex-col beam-gap-1 beam-mt-4 beam-text-sm beam-opacity-80">
				{featureNameMap.map(({ display, featureName }) => {
          const hasModel = settingsState.modelSelectionOfFeature[featureName] !== null;
          return (
            <div key={featureName} className="beam-flex beam-items-center beam-gap-2">
							{hasModel ?
              <Check className="beam-w-4 beam-h-4 beam-text-emerald-500" /> :

              <div className="beam-w-3 beam-h-3 beam-rounded-full beam-flex beam-items-center beam-justify-center">
									<div className="beam-w-1 beam-h-1 beam-rounded-full beam-bg-white/70"></div>
								</div>
              }
							<span>{display}</span>
						</div>);

        })}
			</div>
		</div>

		{/* Right Column */}
		<div className="beam-flex-1 beam-flex beam-flex-col beam-items-center beam-justify-start beam-p-6 beam-h-full beam-overflow-y-auto">
			<div className="beam-text-5xl beam-mb-2 beam-text-center beam-w-full">Add a Provider</div>

			<div className="beam-w-full beam-max-w-xl beam-mt-4 beam-mb-10">
				<div className="beam-text-4xl beam-font-light beam-my-4 beam-w-full">{currentTab}</div>
				<div className="beam-text-sm beam-opacity-80 beam-text-beam-fg-3 beam-my-4 beam-w-full">{descriptionOfTab[currentTab]}</div>
			</div>

			{providerNamesOfTab[currentTab].map((providerName) =>
      <div key={providerName} className="beam-w-full beam-max-w-xl beam-mb-10">
					<div className="beam-text-xl beam-mb-2">
						Add {displayInfoOfProviderName(providerName).title}
						{providerName === 'gemini' &&
          <span
            data-tooltip-id="beam-tooltip-provider-info"
            data-tooltip-content="Gemini 2.5 Pro offers 25 free messages a day, and Gemini 2.5 Flash offers 500. We recommend using models down the line as you run out of free credits."
            data-tooltip-place="right"
            className="beam-ml-1 beam-text-xs beam-align-top beam-text-blue-400">
            *</span>
          }
						{providerName === 'openRouter' &&
          <span
            data-tooltip-id="beam-tooltip-provider-info"
            data-tooltip-content="OpenRouter offers 50 free messages a day, and 1000 if you deposit $10. Only applies to models labeled ':free'."
            data-tooltip-place="right"
            className="beam-ml-1 beam-text-xs beam-align-top beam-text-blue-400">
            *</span>
          }
					</div>
					<div>
						<SettingsForProvider providerName={providerName} showProviderTitle={false} showProviderSuggestions={true} />

					</div>
					{providerName === 'ollama' && <OllamaSetupInstructions />}
				</div>
      )}

			{(currentTab === 'Local' || currentTab === 'Cloud/Other') &&
      <div className="beam-w-full beam-max-w-xl beam-mt-8 beam-bg-beam-bg-2/50 beam-rounded-lg beam-p-6 beam-border beam-border-beam-border-4">
					<div className="beam-flex beam-items-center beam-gap-2 beam-mb-4">
						<div className="beam-text-xl beam-font-medium">Models</div>
					</div>

					{currentTab === 'Local' &&
        <div className="beam-text-sm beam-opacity-80 beam-text-beam-fg-3 beam-my-4 beam-w-full">Local models should be detected automatically. You can add custom models below.</div>
        }

					{currentTab === 'Local' && <ModelDump filteredProviders={localProviderNames} />}
					{currentTab === 'Cloud/Other' && <ModelDump filteredProviders={cloudProviders} />}
				</div>
      }



			{/* Navigation buttons in right column */}
			<div className="beam-flex beam-flex-col beam-items-end beam-w-full beam-mt-auto beam-pt-8">
				{errorMessage &&
        <div className="beam-text-amber-400 beam-mb-2 beam-text-sm beam-opacity-80 beam-transition-opacity beam-duration-300">{errorMessage}</div>
        }
				<div className="beam-flex beam-items-center beam-gap-2">
					<PreviousButton onClick={() => setPageIndex(pageIndex - 1)} />
					<NextButton
            onClick={() => {
              const isDisabled = isFeatureNameDisabled('Chat', settingsState);

              if (!isDisabled) {
                setPageIndex(pageIndex + 1);
                setErrorMessage(null);
              } else {
                // Show error message
                setErrorMessage("Please set up at least one Chat model before moving on.");
              }
            }} />
          
				</div>
			</div>
		</div>
	</div>;
};
// =============================================
// 	OnboardingPage
// 		title:
// 			div
// 				"Welcome to Beam"
// 			image
// 		content:<></>
// 		title
// 		content
// 		prev/next

// 	OnboardingPage
// 		title:
// 			div
// 				"How would you like to use Beam?"
// 		content:
// 			ModelQuestionContent
// 				|
// 					div
// 						"I want to:"
// 					div
// 						"Use the smartest models"
// 						"Keep my data fully private"
// 						"Save money"
// 						"I don't know"
// 				| div
// 					| div
// 						"We recommend using "
// 						"Set API"
// 					| div
// 						""
// 					| div
//
// 		title
// 		content
// 		prev/next
//
// 	OnboardingPage
// 		title
// 		content
// 		prev/next

const NextButton = ({ onClick, ...props }: {onClick: () => void;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

  // Create a new props object without the disabled attribute
  const { disabled, ...buttonProps } = props;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onDoubleClick={onClick}
      className={`beam-px-6 beam-py-2 beam-bg-zinc-100 ${disabled ? "beam-bg-zinc-100/40 beam-cursor-not-allowed" : "hover:beam-bg-zinc-100"} beam-rounded beam-text-black beam-duration-600 beam-transition-all `}




      {...disabled && {
        'data-tooltip-id': 'beam-tooltip',
        "data-tooltip-content": 'Please enter all required fields or choose another provider', // (double-click to proceed anyway, can come back in Settings)
        "data-tooltip-place": 'top'
      }}
      {...buttonProps}>
      
			Next
		</button>);

};

const PreviousButton = ({ onClick, ...props }: {onClick: () => void;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      onClick={onClick}
      className="beam-px-6 beam-py-2 beam-rounded beam-text-beam-fg-3 beam-opacity-80 hover:beam-brightness-115 beam-duration-600 beam-transition-all"
      {...props}>
      
			Back
		</button>);

};



const OnboardingPageShell = ({ top, bottom, content, hasMaxWidth = true, className = ''





}: {top?: React.ReactNode;bottom?: React.ReactNode;content?: React.ReactNode;hasMaxWidth?: boolean;className?: string;}) => {
  return (
    <div className={`beam-h-[80vh] beam-text-lg beam-flex beam-flex-col beam-gap-4 beam-w-full beam-mx-auto ${hasMaxWidth ? "beam-max-w-[600px]" : ""} ${className}`}>
			{top && <FadeIn className="beam-w-full beam-mb-auto beam-pt-16">{top}</FadeIn>}
			{content && <FadeIn className="beam-w-full beam-my-auto">{content}</FadeIn>}
			{bottom && <div className="beam-w-full beam-pb-8">{bottom}</div>}
		</div>);

};

const OllamaDownloadOrRemoveModelButton = ({ modelName, isModelInstalled, sizeGb }: {modelName: string;isModelInstalled: boolean;sizeGb: number | false | 'not-known';}) => {
  // for now just link to the ollama download page
  return <a
    href={`https://ollama.com/library/${modelName}`}
    target="_blank"
    rel="noopener noreferrer"
    className="beam-flex beam-items-center beam-justify-center beam-text-beam-fg-2 hover:beam-text-beam-fg-1">
    
		<ExternalLink className="beam-w-3.5 beam-h-3.5" />
	</a>;

};


const YesNoText = ({ val }: {val: boolean | null;}) => {

  return <div
    className={
    val === true ? "beam-text beam-text-emerald-500" :
    val === false ? "beam-text-rose-600" : "beam-text beam-text-amber-300"}>


    
		{
    val === true ? "Yes" :
    val === false ? 'No' :
    "Yes*"
    }
	</div>;

};



const abbreviateNumber = (num: number): string => {
  if (num >= 1000000) {
    // For millions
    return Math.floor(num / 1000000) + 'M';
  } else if (num >= 1000) {
    // For thousands
    return Math.floor(num / 1000) + 'K';
  } else {
    // For numbers less than 1000
    return num.toString();
  }
};





const PrimaryActionButton = ({ children, className, ringSize, ...props }: {children: React.ReactNode;ringSize?: undefined | 'xl' | 'screen';} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {


  return (
    <button
      type='button'
      className={` beam-flex beam-items-center beam-justify-center beam-text-white dark:beam-text-black beam-bg-black/90 dark:beam-bg-white/90 ${





      ringSize === 'xl' ? ` beam-gap-2 beam-px-16 beam-py-8 beam-transition-all beam-duration-300 beam-ease-in-out ` :



      ringSize === 'screen' ? ` beam-gap-2 beam-px-16 beam-py-8 beam-transition-all beam-duration-1000 beam-ease-in-out ` :


      ringSize === undefined ? ` beam-gap-1 beam-px-4 beam-py-2 beam-transition-all beam-duration-300 beam-ease-in-out ` : ""} beam-rounded-lg beam-group ${






      className} `}

      {...props}>
      
			{children}
			<ChevronRight
        className={` beam-transition-all beam-duration-300 beam-ease-in-out beam-transform group-hover:beam-translate-x-1 group-active:beam-translate-x-1 `} />






      
		</button>);

};


type WantToUseOption = 'smart' | 'private' | 'cheap' | 'all';

const BeamOnboardingContent = () => {


  const accessor = useAccessor();
  const beamSettingsService = accessor.get('IBeamSettingsService');
  const beamMetricsService = accessor.get('IMetricsService');

  const beamSettingsState = useSettingsState();

  const [pageIndex, setPageIndex] = useState(0);


  // page 1 state
  const [wantToUseOption, setWantToUseOption] = useState<WantToUseOption>('smart');

  // Replace the single selectedProviderName with four separate states
  // page 2 state - each tab gets its own state
  const [selectedIntelligentProvider, setSelectedIntelligentProvider] = useState<ProviderName>('anthropic');
  const [selectedPrivateProvider, setSelectedPrivateProvider] = useState<ProviderName>('ollama');
  const [selectedAffordableProvider, setSelectedAffordableProvider] = useState<ProviderName>('gemini');
  const [selectedAllProvider, setSelectedAllProvider] = useState<ProviderName>('anthropic');

  // Helper function to get the current selected provider based on active tab
  const getSelectedProvider = (): ProviderName => {
    switch (wantToUseOption) {
      case 'smart':return selectedIntelligentProvider;
      case 'private':return selectedPrivateProvider;
      case 'cheap':return selectedAffordableProvider;
      case 'all':return selectedAllProvider;
    }
  };

  // Helper function to set the selected provider for the current tab
  const setSelectedProvider = (provider: ProviderName) => {
    switch (wantToUseOption) {
      case 'smart':setSelectedIntelligentProvider(provider);break;
      case 'private':setSelectedPrivateProvider(provider);break;
      case 'cheap':setSelectedAffordableProvider(provider);break;
      case 'all':setSelectedAllProvider(provider);break;
    }
  };

  const providerNamesOfWantToUseOption: { [wantToUseOption in WantToUseOption]: ProviderName[] } = {
    smart: ['anthropic', 'openAI', 'gemini', 'openRouter'],
    private: ['ollama', 'vLLM', 'openAICompatible', 'lmStudio'],
    cheap: ['gemini', 'deepseek', 'openRouter', 'ollama', 'vLLM'],
    all: providerNames
  };


  const selectedProviderName = getSelectedProvider();
  const didFillInProviderSettings = selectedProviderName && beamSettingsState.settingsOfProvider[selectedProviderName]._didFillInProviderSettings;
  const isApiKeyLongEnoughIfApiKeyExists = selectedProviderName && beamSettingsState.settingsOfProvider[selectedProviderName].apiKey ? beamSettingsState.settingsOfProvider[selectedProviderName].apiKey.length > 15 : true;
  const isAtLeastOneModel = selectedProviderName && beamSettingsState.settingsOfProvider[selectedProviderName].models.length >= 1;

  const didFillInSelectedProviderSettings = !!(didFillInProviderSettings && isApiKeyLongEnoughIfApiKeyExists && isAtLeastOneModel);

  const prevAndNextButtons = <div className="beam-max-w-[600px] beam-w-full beam-mx-auto beam-flex beam-flex-col beam-items-end">
		<div className="beam-flex beam-items-center beam-gap-2">
			<PreviousButton
        onClick={() => {setPageIndex(pageIndex - 1);}} />
      
			<NextButton
        onClick={() => {setPageIndex(pageIndex + 1);}} />
      
		</div>
	</div>;


  const lastPagePrevAndNextButtons = <div className="beam-max-w-[600px] beam-w-full beam-mx-auto beam-flex beam-flex-col beam-items-end">
		<div className="beam-flex beam-items-center beam-gap-2">
			<PreviousButton
        onClick={() => {setPageIndex(pageIndex - 1);}} />
      
			<PrimaryActionButton
        onClick={() => {
          beamSettingsService.setGlobalSetting('isOnboardingComplete', true);
          beamMetricsService.capture('Completed Onboarding', { selectedProviderName, wantToUseOption });
        }}
        ringSize={beamSettingsState.globalSettings.isOnboardingComplete ? 'screen' : undefined}>
        Enter Beam</PrimaryActionButton>
		</div>
	</div>;


  // cannot be md
  const basicDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
    smart: "Models with the best performance on benchmarks.",
    private: "Host on your computer or local network for full data privacy.",
    cheap: "Free and affordable options.",
    all: ""
  };

  // can be md
  const detailedDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
    smart: "Most intelligent and best for agent mode.",
    private: "Private-hosted so your data never leaves your computer or network. [Email us](mailto:devxsecure@gmail.com) for help setting up at your company.",
    cheap: "Use great deals like Gemini 2.5 Pro, or self-host a model with Ollama or vLLM for free.",
    all: ""
  };

  // Modified: initialize separate provider states on initial render instead of watching wantToUseOption changes
  useEffect(() => {
    if (selectedIntelligentProvider === undefined) {
      setSelectedIntelligentProvider(providerNamesOfWantToUseOption['smart'][0]);
    }
    if (selectedPrivateProvider === undefined) {
      setSelectedPrivateProvider(providerNamesOfWantToUseOption['private'][0]);
    }
    if (selectedAffordableProvider === undefined) {
      setSelectedAffordableProvider(providerNamesOfWantToUseOption['cheap'][0]);
    }
    if (selectedAllProvider === undefined) {
      setSelectedAllProvider(providerNamesOfWantToUseOption['all'][0]);
    }
  }, []);

  // reset the page to page 0 if the user redos onboarding
  useEffect(() => {
    if (!beamSettingsState.globalSettings.isOnboardingComplete) {
      setPageIndex(0);
    }
  }, [setPageIndex, beamSettingsState.globalSettings.isOnboardingComplete]);


  const contentOfIdx: {[pageIndex: number]: React.ReactNode;} = {
    0: <OnboardingPageShell
      content={
      <div className="beam-flex beam-flex-col beam-items-center beam-gap-8">
					<div className="beam-text-5xl beam-font-light beam-text-center">Welcome to Beam</div>

					{/* Slice of Beam image */}
					<div className="beam-max-w-md beam-w-full beam-h-[30vh] beam-mx-auto beam-flex beam-items-center beam-justify-center">
						{!isLinux && <BeamIcon />}
					</div>


					<FadeIn
          delayMs={1000}>
          
						<PrimaryActionButton
            onClick={() => {setPageIndex(1);}}>
            
							Get Started
						</PrimaryActionButton>
					</FadeIn>

				</div>
      } />,


    1: <OnboardingPageShell hasMaxWidth={false}
    content={
    <AddProvidersPage pageIndex={pageIndex} setPageIndex={setPageIndex} />
    } />,

    2: <OnboardingPageShell

      content={
      <div>
					<div className="beam-text-5xl beam-font-light beam-text-center">Settings and Themes</div>

					<div className="beam-mt-8 beam-text-center beam-flex beam-flex-col beam-items-center beam-gap-4 beam-w-full beam-max-w-md beam-mx-auto">
						<h4 className="beam-text-beam-fg-3 beam-mb-4">Transfer your settings from an existing editor?</h4>
						<OneClickSwitchButton className="beam-w-full beam-px-4 beam-py-2" fromEditor="VS Code" />
						<OneClickSwitchButton className="beam-w-full beam-px-4 beam-py-2" fromEditor="Cursor" />
						<OneClickSwitchButton className="beam-w-full beam-px-4 beam-py-2" fromEditor="Windsurf" />
					</div>
				</div>
      }
      bottom={lastPagePrevAndNextButtons} />

  };


  return <div key={pageIndex} className="beam-w-full beam-h-[80vh] beam-text-left beam-mx-auto beam-flex beam-flex-col beam-items-center beam-justify-center">
		<ErrorBoundary>
			{contentOfIdx[pageIndex]}
		</ErrorBoundary>
	</div>;

};