/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useIsDark } from '../util/services.js';
// import { SidebarThreadSelector } from './SidebarThreadSelector.js';
// import { SidebarChat } from './SidebarChat.js';

import '../styles.css';
import { SidebarChat } from './SidebarChat.js';
import ErrorBoundary from './ErrorBoundary.js';

export const Sidebar = ({ className }: {className: string;}) => {

  const isDark = useIsDark();
  return <div
    className={`beam-scope ${isDark ? "beam-dark" : ""}`}
    style={{ width: '100%', height: '100%' }}>
    
		<div
    // default background + text styles for sidebar
    className={` beam-w-full beam-h-full beam-bg-beam-bg-2 beam-text-beam-fg-1 `}>




      

			<div className={`beam-w-full beam-h-full`}>
				<ErrorBoundary>
					<SidebarChat />
				</ErrorBoundary>

			</div>
		</div>
	</div>;


};