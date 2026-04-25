/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from '../../../../common/sendLLMMessageTypes.js';


export const ErrorDisplay = ({
  message: message_,
  fullError,
  onDismiss,
  showDismiss





}: {message: string;fullError: Error | null;onDismiss: (() => void) | null;showDismiss?: boolean;}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const details = errorDetails(fullError);
  const isExpandable = !!details;

  const message = message_ + '';

  return (
    <div className={`beam-rounded-lg beam-border beam-border-red-200 beam-bg-red-50 beam-p-4 beam-overflow-auto`}>
			{/* Header */}
			<div className="beam-flex beam-items-start beam-justify-between">
				<div className="beam-flex beam-gap-3">
					<AlertCircle className="beam-h-5 beam-w-5 beam-text-red-600 beam-mt-0.5" />
					<div className="beam-flex-1">
						<h3 className="beam-font-semibold beam-text-red-800">
							{/* eg Error */}
							Error
						</h3>
						<p className="beam-text-red-700 beam-mt-1">
							{/* eg Something went wrong */}
							{message}
						</p>
					</div>
				</div>

				<div className="beam-flex beam-gap-2">
					{isExpandable &&
          <button className="beam-text-red-600 hover:beam-text-red-800 beam-p-1 beam-rounded"
          onClick={() => setIsExpanded(!isExpanded)}>
            
							{isExpanded ?
            <ChevronUp className="beam-h-5 beam-w-5" /> :

            <ChevronDown className="beam-h-5 beam-w-5" />
            }
						</button>
          }
					{showDismiss && onDismiss &&
          <button className="beam-text-red-600 hover:beam-text-red-800 beam-p-1 beam-rounded"
          onClick={onDismiss}>
            
							<X className="beam-h-5 beam-w-5" />
						</button>
          }
				</div>
			</div>

			{/* Expandable Details */}
			{isExpanded && details &&
      <div className="beam-mt-4 beam-space-y-3 beam-border-t beam-border-red-200 beam-pt-3 beam-overflow-auto">
					<div>
						<span className="beam-font-semibold beam-text-red-800">Full Error: </span>
						<pre className="beam-text-red-700">{details}</pre>
					</div>
				</div>
      }
		</div>);

};