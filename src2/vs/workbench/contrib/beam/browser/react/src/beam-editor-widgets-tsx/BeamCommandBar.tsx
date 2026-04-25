/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useCommandBarState, useIsDark } from '../util/services.js';

import '../styles.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from '../../../../common/helpers/colors.js';
import { BeamCommandBarProps } from '../../../beamCommandBarService.js';
import { Check, EllipsisVertical, Menu, MoveDown, MoveLeft, MoveRight, MoveUp, X } from 'lucide-react';
import {
  BEAM_GOTO_NEXT_DIFF_ACTION_ID,
  BEAM_GOTO_PREV_DIFF_ACTION_ID,
  BEAM_GOTO_NEXT_URI_ACTION_ID,
  BEAM_GOTO_PREV_URI_ACTION_ID,
  BEAM_ACCEPT_FILE_ACTION_ID,
  BEAM_REJECT_FILE_ACTION_ID,
  BEAM_ACCEPT_ALL_DIFFS_ACTION_ID,
  BEAM_REJECT_ALL_DIFFS_ACTION_ID } from
'../../../actionIDs.js';

export const BeamCommandBarMain = ({ uri, editor }: BeamCommandBarProps) => {
  const isDark = useIsDark();

  return <div
    className={`beam-scope ${isDark ? "beam-dark" : ""}`}>
    
		<BeamCommandBar uri={uri} editor={editor} />
	</div>;
};



export const AcceptAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` beam-px-2 beam-py-0.5 beam-flex beam-items-center beam-gap-1 beam-text-white beam-text-[11px] beam-text-nowrap beam-h-full beam-rounded-none beam-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>
  
		{text ? <span>{text}</span> : <Check size={16} />}
	</button>;


export const RejectAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` beam-px-2 beam-py-0.5 beam-flex beam-items-center beam-gap-1 beam-text-white beam-text-[11px] beam-text-nowrap beam-h-full beam-rounded-none beam-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>
  
		{text ? <span>{text}</span> : <X size={16} />}
	</button>;




export const BeamCommandBar = ({ uri, editor }: BeamCommandBarProps) => {
  const accessor = useAccessor();
  const editCodeService = accessor.get('IEditCodeService');
  const editorService = accessor.get('ICodeEditorService');
  const metricsService = accessor.get('IMetricsService');
  const commandService = accessor.get('ICommandService');
  const commandBarService = accessor.get('IBeamCommandBarService');
  const beamModelService = accessor.get('IBeamModelService');
  const keybindingService = accessor.get('IKeybindingService');
  const { stateOfURI: commandBarState, sortedURIs: sortedCommandBarURIs } = useCommandBarState();
  const [showAcceptRejectAllButtons, setShowAcceptRejectAllButtons] = useState(false);

  // latestUriIdx is used to remember place in leftRight
  const _latestValidUriIdxRef = useRef<number | null>(null);

  // i is the current index of the URI in sortedCommandBarURIs
  const i_ = sortedCommandBarURIs.findIndex((e) => e.fsPath === uri?.fsPath);
  const currFileIdx = i_ === -1 ? null : i_;
  useEffect(() => {
    if (currFileIdx !== null) _latestValidUriIdxRef.current = currFileIdx;
  }, [currFileIdx]);

  const uriIdxInStepper = currFileIdx !== null ? currFileIdx // use currFileIdx if it exists, else use latestNotNullUriIdxRef
  : _latestValidUriIdxRef.current === null ? null :
  _latestValidUriIdxRef.current < sortedCommandBarURIs.length ? _latestValidUriIdxRef.current :
  null;

  // when change URI, scroll to the proper spot
  useEffect(() => {
    setTimeout(() => {
      // check undefined
      if (!uri) return;
      const s = commandBarService.stateOfURI[uri.fsPath];
      if (!s) return;
      const { diffIdx } = s;
      commandBarService.goToDiffIdx(diffIdx ?? 0);
    }, 50);
  }, [uri, commandBarService]);

  if (uri?.scheme !== 'file') return null; // don't show in editors that we made, they must be files

  // Using service methods directly

  const currDiffIdx = uri ? commandBarState[uri.fsPath]?.diffIdx ?? null : null;
  const sortedDiffIds = uri ? commandBarState[uri.fsPath]?.sortedDiffIds ?? [] : [];
  const sortedDiffZoneIds = uri ? commandBarState[uri.fsPath]?.sortedDiffZoneIds ?? [] : [];

  const isADiffInThisFile = sortedDiffIds.length !== 0;
  const isADiffZoneInThisFile = sortedDiffZoneIds.length !== 0;
  const isADiffZoneInAnyFile = sortedCommandBarURIs.length !== 0;

  const streamState = uri ? commandBarService.getStreamState(uri) : null;
  const showAcceptRejectAll = streamState === 'idle-has-changes';

  const nextDiffIdx = commandBarService.getNextDiffIdx(1);
  const prevDiffIdx = commandBarService.getNextDiffIdx(-1);
  const nextURIIdx = commandBarService.getNextUriIdx(1);
  const prevURIIdx = commandBarService.getNextUriIdx(-1);

  const upDownDisabled = prevDiffIdx === null || nextDiffIdx === null;
  const leftRightDisabled = prevURIIdx === null || nextURIIdx === null;

  // accept/reject if current URI has changes
  const onAcceptFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'accept', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Accept File', {});
  };
  const onRejectFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'reject', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Reject File', {});
  };

  const onAcceptAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'accept' });
    metricsService.capture('Accept All', {});
    setShowAcceptRejectAllButtons(false);
  };

  const onRejectAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'reject' });
    metricsService.capture('Reject All', {});
    setShowAcceptRejectAllButtons(false);
  };



  const _upKeybinding = keybindingService.lookupKeybinding(BEAM_GOTO_PREV_DIFF_ACTION_ID);
  const _downKeybinding = keybindingService.lookupKeybinding(BEAM_GOTO_NEXT_DIFF_ACTION_ID);
  const _leftKeybinding = keybindingService.lookupKeybinding(BEAM_GOTO_PREV_URI_ACTION_ID);
  const _rightKeybinding = keybindingService.lookupKeybinding(BEAM_GOTO_NEXT_URI_ACTION_ID);
  const _acceptFileKeybinding = keybindingService.lookupKeybinding(BEAM_ACCEPT_FILE_ACTION_ID);
  const _rejectFileKeybinding = keybindingService.lookupKeybinding(BEAM_REJECT_FILE_ACTION_ID);
  const _acceptAllKeybinding = keybindingService.lookupKeybinding(BEAM_ACCEPT_ALL_DIFFS_ACTION_ID);
  const _rejectAllKeybinding = keybindingService.lookupKeybinding(BEAM_REJECT_ALL_DIFFS_ACTION_ID);

  const upKeybindLabel = editCodeService.processRawKeybindingText(_upKeybinding?.getLabel() || '');
  const downKeybindLabel = editCodeService.processRawKeybindingText(_downKeybinding?.getLabel() || '');
  const leftKeybindLabel = editCodeService.processRawKeybindingText(_leftKeybinding?.getLabel() || '');
  const rightKeybindLabel = editCodeService.processRawKeybindingText(_rightKeybinding?.getLabel() || '');
  const acceptFileKeybindLabel = editCodeService.processRawKeybindingText(_acceptFileKeybinding?.getAriaLabel() || '');
  const rejectFileKeybindLabel = editCodeService.processRawKeybindingText(_rejectFileKeybinding?.getAriaLabel() || '');
  const acceptAllKeybindLabel = editCodeService.processRawKeybindingText(_acceptAllKeybinding?.getAriaLabel() || '');
  const rejectAllKeybindLabel = editCodeService.processRawKeybindingText(_rejectAllKeybinding?.getAriaLabel() || '');


  if (!isADiffZoneInAnyFile) return null;

  // For pages without a current file index, show a simplified command bar
  if (currFileIdx === null) {
    return (
      <div className="beam-pointer-events-auto">
				<div className="beam-flex beam-bg-beam-bg-2 beam-shadow-md beam-border beam-border-beam-border-2 [&>*:first-child]:beam-pl-3 [&>*:last-child]:beam-pr-3 [&>*]:beam-border-r [&>*]:beam-border-beam-border-2 [&>*:last-child]:beam-border-r-0">
					<div className="beam-flex beam-items-center beam-px-3">
						<span className="beam-text-xs beam-whitespace-nowrap">
							{`${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'} changed`}
						</span>
					</div>
					<button
            className="beam-text-xs beam-whitespace-nowrap beam-cursor-pointer beam-flex beam-items-center beam-justify-center beam-gap-1 beam-bg-[var(--vscode-button-background)] beam-text-[var(--vscode-button-foreground)] hover:beam-opacity-90 beam-h-full beam-px-3"
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}>
            
						Next <MoveRight className="beam-size-3 beam-my-1" />
					</button>
				</div>
			</div>);

  }

  return (
    <div className="beam-pointer-events-auto">


			{/* Accept All / Reject All buttons that appear when the vertical ellipsis is clicked */}
			{showAcceptRejectAllButtons && showAcceptRejectAll &&
      <div className="beam-flex beam-justify-end beam-mb-1">
					<div className="beam-inline-flex beam-bg-beam-bg-2 beam-rounded beam-shadow-md beam-border beam-border-beam-border-2 beam-overflow-hidden">
						<div className="beam-flex beam-items-center [&>*]:beam-border-r [&>*]:beam-border-beam-border-2 [&>*:last-child]:beam-border-r-0">
							<AcceptAllButtonWrapper
            // text={`Accept All${acceptAllKeybindLabel ? ` ${acceptAllKeybindLabel}` : ''}`}
            text={`Accept All`}
            data-tooltip-id='beam-tooltip'
            data-tooltip-content={acceptAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onAcceptAll} />
            
							<RejectAllButtonWrapper
            // text={`Reject All${rejectAllKeybindLabel ? ` ${rejectAllKeybindLabel}` : ''}`}
            text={`Reject All`}
            data-tooltip-id='beam-tooltip'
            data-tooltip-content={rejectAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onRejectAll} />
            
						</div>
					</div>
				</div>
      }

			<div className="beam-flex beam-items-center beam-bg-beam-bg-2 beam-rounded beam-shadow-md beam-border beam-border-beam-border-2 [&>*:first-child]:beam-pl-3 [&>*:last-child]:beam-pr-3 [&>*]:beam-px-3 [&>*]:beam-border-r [&>*]:beam-border-beam-border-2 [&>*:last-child]:beam-border-r-0">

				{/* Diff Navigation Group */}
				<div className="beam-flex beam-items-center beam-py-0.5">
					<button
            className="beam-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(prevDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(prevDiffIdx);
              }
            }}
            data-tooltip-id="beam-tooltip"
            data-tooltip-content={`${upKeybindLabel ? `${upKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>
            
						<MoveUp className="beam-size-3 beam-transition-opacity beam-duration-200 beam-opacity-70 hover:beam-opacity-100" />
					</button>
					<span className={`beam-text-xs beam-whitespace-nowrap beam-px-1 ${!isADiffInThisFile ? "beam-opacity-70" : ""}`}>
						{isADiffInThisFile ?
            `Diff ${(currDiffIdx ?? 0) + 1} of ${sortedDiffIds.length}` :
            streamState === 'streaming' ?
            'No changes yet' :
            'No changes'
            }

					</span>
					<button
            className="beam-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(nextDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(nextDiffIdx);
              }
            }}
            data-tooltip-id="beam-tooltip"
            data-tooltip-content={`${downKeybindLabel ? `${downKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>
            
						<MoveDown className="beam-size-3 beam-transition-opacity beam-duration-200 beam-opacity-70 hover:beam-opacity-100" />
					</button>
				</div>



				{/* File Navigation Group */}
				<div className="beam-flex beam-items-center beam-py-0.5">
					<button
            className="beam-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(prevURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(prevURIIdx);
              }
            }}
            data-tooltip-id="beam-tooltip"
            data-tooltip-content={`${leftKeybindLabel ? `${leftKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>
            
						<MoveLeft className="beam-size-3 beam-transition-opacity beam-duration-200 beam-opacity-70 hover:beam-opacity-100" />
					</button>
					<span className="beam-text-xs beam-whitespace-nowrap beam-px-1 beam-mx-0.5">
						{currFileIdx !== null ?
            `File ${currFileIdx + 1} of ${sortedCommandBarURIs.length}` :
            `${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'}`
            }
					</span>
					<button
            className="beam-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}
            data-tooltip-id="beam-tooltip"
            data-tooltip-content={`${rightKeybindLabel ? `${rightKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>
            
						<MoveRight className="beam-size-3 beam-transition-opacity beam-duration-200 beam-opacity-70 hover:beam-opacity-100" />
					</button>
				</div>


				{/* Accept/Reject buttons - only shown when appropriate */}
				{showAcceptRejectAll &&
        <div className="beam-flex beam-self-stretch beam-gap-0 !beam-px-0 !beam-py-0">
						<AcceptAllButtonWrapper
          // text={`Accept File${acceptFileKeybindLabel ? ` ${acceptFileKeybindLabel}` : ''}`}
          text={`Accept File`}
          data-tooltip-id='beam-tooltip'
          data-tooltip-content={acceptFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onAcceptFile} />
          
						<RejectAllButtonWrapper
          // text={`Reject File${rejectFileKeybindLabel ? ` ${rejectFileKeybindLabel}` : ''}`}
          text={`Reject File`}
          data-tooltip-id='beam-tooltip'
          data-tooltip-content={rejectFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onRejectFile} />
          
					</div>
        }
				{/* Triple colon menu button */}
				{showAcceptRejectAll && <div className="!beam-px-0 !beam-py-0 beam-self-stretch beam-flex beam-justify-center beam-items-center">
					<div
            className="beam-cursor-pointer beam-px-1 beam-self-stretch beam-flex beam-justify-center beam-items-center"
            onClick={() => setShowAcceptRejectAllButtons(!showAcceptRejectAllButtons)}>
            
						<EllipsisVertical
              className="beam-size-3" />
            
					</div>
				</div>}
			</div>
		</div>);

};