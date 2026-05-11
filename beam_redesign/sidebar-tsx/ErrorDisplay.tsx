/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from "../../../../common/sendLLMMessageTypes.js";


export const ErrorDisplay = ({
	message: message_,
	fullError,
	onDismiss,
	showDismiss,
}: {
	message: string,
	fullError: Error | null,
	onDismiss: (() => void) | null,
	showDismiss?: boolean,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const details = errorDetails(fullError)
	const isExpandable = !!details

	const message = message_ + ''

	return (
		<div className={`rounded-xl border border-[var(--beam-agent-border-2)] bg-[var(--beam-agent-red-dim)] p-4 overflow-auto`}>
			{/* Header */}
			<div className='flex items-start justify-between'>
				<div className='flex gap-3'>
					<AlertCircle className='h-5 w-5 text-[var(--beam-agent-red)] mt-0.5 flex-shrink-0' />
					<div className='flex-1'>
						<h3 className='font-medium text-[var(--beam-agent-red)]'>
							Error
						</h3>
						<p className='text-beam-fg-2 mt-1 text-sm opacity-90'>
							{message}
						</p>
					</div>
				</div>

				<div className='flex gap-2'>
					{isExpandable && (
						<button className='text-[var(--beam-agent-red)] hover:opacity-80 p-1 rounded-lg transition-opacity duration-150'
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? (
								<ChevronUp className='h-5 w-5' />
							) : (
								<ChevronDown className='h-5 w-5' />
							)}
						</button>
					)}
					{showDismiss && onDismiss && (
						<button className='text-[var(--beam-agent-red)] hover:opacity-80 p-1 rounded-lg transition-opacity duration-150'
							onClick={onDismiss}
						>
							<X className='h-5 w-5' />
						</button>
					)}
				</div>
			</div>

			{/* Expandable Details */}
			{isExpanded && details && (
				<div className='mt-4 space-y-3 border-t border-[var(--beam-agent-border-2)] pt-3 overflow-auto'>
					<div>
						<span className='font-medium text-[var(--beam-agent-red)] text-sm'>Full Error: </span>
						<pre className='text-beam-fg-3 text-xs mt-1'>{details}</pre>
					</div>
				</div>
			)}
		</div>
	);
};
