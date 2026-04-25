/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useActiveURI, useIsDark, useSettingsState } from '../util/services.js';

import '../styles.css';
import { BEAM_CTRL_K_ACTION_ID, BEAM_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { Circle, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BeamSelectionHelperProps } from '../../../../../../contrib/beam/browser/beamSelectionHelperWidget.js';
import { BEAM_OPEN_SETTINGS_ACTION_ID } from '../../../beamSettingsPane.js';


export const BeamSelectionHelperMain = (props: BeamSelectionHelperProps) => {

  const isDark = useIsDark();

  return <div
    className={`beam-scope ${isDark ? "beam-dark" : ""}`}>
    
		<BeamSelectionHelper {...props} />
	</div>;
};



const BeamSelectionHelper = ({ rerenderKey }: BeamSelectionHelperProps) => {


  const accessor = useAccessor();
  const keybindingService = accessor.get('IKeybindingService');
  const commandService = accessor.get('ICommandService');

  const ctrlLKeybind = keybindingService.lookupKeybinding(BEAM_CTRL_L_ACTION_ID);
  const ctrlKKeybind = keybindingService.lookupKeybinding(BEAM_CTRL_K_ACTION_ID);

  const dividerHTML = <div className="beam-w-[0.5px] beam-bg-beam-border-3"></div>;

  const [reactRerenderCount, setReactRerenderKey] = useState(rerenderKey);
  const [clickState, setClickState] = useState<'init' | 'clickedOption' | 'clickedMore'>('init');

  useEffect(() => {
    const disposable = commandService.onWillExecuteCommand((e) => {
      if (e.commandId === BEAM_CTRL_L_ACTION_ID || e.commandId === BEAM_CTRL_K_ACTION_ID) {
        setClickState('clickedOption');
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [commandService, setClickState]);


  // rerender when the key changes
  if (reactRerenderCount !== rerenderKey) {
    setReactRerenderKey(rerenderKey);
    setClickState('init');
  }
  // useEffect(() => {
  // }, [rerenderKey, reactRerenderCount, setReactRerenderKey, setClickState])

  // if the user selected an option, close


  if (clickState === 'clickedOption') {
    return null;
  }

  const defaultHTML = <>
		{ctrlLKeybind &&
    <div
      className=" beam-flex beam-items-center beam-px-2 beam-py-1.5 beam-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(BEAM_CTRL_L_ACTION_ID);
        setClickState('clickedOption');
      }}>
      
				<span>Add to Chat</span>
				<span className="beam-ml-1 beam-px-1 beam-rounded beam-bg-[var(--vscode-keybindingLabel-background)] beam-text-[var(--vscode-keybindingLabel-foreground)] beam-border beam-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlLKeybind.getLabel()}
				</span>
			</div>
    }
		{ctrlLKeybind && ctrlKKeybind &&
    dividerHTML
    }
		{ctrlKKeybind &&
    <div
      className=" beam-flex beam-items-center beam-px-2 beam-py-1.5 beam-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(BEAM_CTRL_K_ACTION_ID);
        setClickState('clickedOption');
      }}>
      
				<span className="beam-ml-1">Edit Inline</span>
				<span className="beam-ml-1 beam-px-1 beam-rounded beam-bg-[var(--vscode-keybindingLabel-background)] beam-text-[var(--vscode-keybindingLabel-foreground)] beam-border beam-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlKKeybind.getLabel()}
				</span>
			</div>
    }

		{dividerHTML}

		<div
      className=" beam-flex beam-items-center beam-px-0.5 beam-cursor-pointer "



      onClick={() => {
        setClickState('clickedMore');
      }}>
      
			<MoreVertical className="beam-w-4" />
		</div>
	</>;


  const moreOptionsHTML = <>
		<div
      className=" beam-flex beam-items-center beam-px-2 beam-py-1.5 beam-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(BEAM_OPEN_SETTINGS_ACTION_ID);
        setClickState('clickedOption');
      }}>
      
			Disable Suggestions?
		</div>

		{dividerHTML}

		<div
      className=" beam-flex beam-items-center beam-px-0.5 beam-cursor-pointer "



      onClick={() => {
        setClickState('init');
      }}>
      
			<MoreVertical className="beam-w-4" />
		</div>
	</>;

  return <div className=" beam-pointer-events-auto beam-select-none beam-z-[1000] beam-rounded-sm beam-shadow-md beam-flex beam-flex-nowrap beam-text-nowrap beam-border beam-border-beam-border-3 beam-bg-beam-bg-2 beam-transition-all beam-duration-200 ">





    
		{clickState === 'init' ? defaultHTML :
    clickState === 'clickedMore' ? moreOptionsHTML :
    <></>
    }
	</div>;
};