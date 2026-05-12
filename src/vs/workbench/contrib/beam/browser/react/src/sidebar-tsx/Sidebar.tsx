/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, LogIn, LogOut, RefreshCw, Settings, UserCircle } from 'lucide-react';
import { BEAM_OPEN_SETTINGS_ACTION_ID } from '../../../beamSettingsPane.js';
import { BeamCloudAccountStatus } from '../../../../common/beamCloudClient.js';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import Severity from '../../../../../../../base/common/severity.js';
import type { INotificationHandle } from '../../../../../../../platform/notification/common/notification.js';
// import { SidebarThreadSelector } from './SidebarThreadSelector.js';
// import { SidebarChat } from './SidebarChat.js';

import '../styles.css'
import { SidebarChat } from './SidebarChat.js';
import ErrorBoundary from './ErrorBoundary.js';

const BeamAccountMenu = () => {
	const accessor = useAccessor();
	const beamSettingsService = accessor.get('IBeamSettingsService');
	const nativeHostService = accessor.get('INativeHostService');
	const commandService = accessor.get('ICommandService');
	const notificationService = accessor.get('INotificationService');
	const settingsState = useSettingsState();
	const [isOpen, setIsOpen] = useState(false);
	const [account, setAccount] = useState<BeamCloudAccountStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const authNotificationRef = useRef<INotificationHandle | null>(null);

	const token = settingsState.settingsOfProvider.beamCloud.beamToken;
	const refreshToken = settingsState.settingsOfProvider.beamCloud.beamRefreshToken;
	const tokenExpiresAt = settingsState.settingsOfProvider.beamCloud.beamTokenExpiresAt;
	const isDevelopmentToken = token === 'dev-token';

	const refreshAccount = useCallback(async () => {
		if (!token || isDevelopmentToken) {
			setAccount(null);
			return;
		}
		setIsLoading(true);
		try {
			let activeToken = token;
			if (refreshToken && tokenExpiresAt) {
				const expiresInMs = new Date(tokenExpiresAt).getTime() - Date.now();
				if (!Number.isFinite(expiresInMs) || expiresInMs <= 60_000) {
					const refreshed = await beamSettingsService.refreshBeamCloudAuth(refreshToken);
					activeToken = refreshed.accessToken;
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', refreshed.accessToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', refreshed.refreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', refreshed.expiresAt);
				}
			}
			setAccount(await beamSettingsService.getBeamCloudAccountStatus(activeToken));
			const models = await beamSettingsService.getBeamCloudModels(activeToken);
			if (models) {
				beamSettingsService.setBeamCloudModels(models);
			}
		} catch (error) {
			if (refreshToken) {
				try {
					const refreshed = await beamSettingsService.refreshBeamCloudAuth(refreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', refreshed.accessToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', refreshed.refreshToken);
					await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', refreshed.expiresAt);
					setAccount(await beamSettingsService.getBeamCloudAccountStatus(refreshed.accessToken));
					const models = await beamSettingsService.getBeamCloudModels(refreshed.accessToken);
					if (models) {
						beamSettingsService.setBeamCloudModels(models);
					}
				} catch {
					setAccount(null);
				}
			} else {
				console.warn('Beam Cloud account refresh failed:', error);
				setAccount(null);
			}
		} finally {
			setIsLoading(false);
		}
	}, [beamSettingsService, isDevelopmentToken, refreshToken, token, tokenExpiresAt]);

	useEffect(() => {
		refreshAccount();
	}, [refreshAccount]);

	useEffect(() => {
		if (token && !isDevelopmentToken && isAuthenticating) {
			authNotificationRef.current?.close();
			authNotificationRef.current = null;
			setIsAuthenticating(false);
		}
	}, [isAuthenticating, isDevelopmentToken, token]);

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handlePointerDown);
		return () => document.removeEventListener('mousedown', handlePointerDown);
	}, [isOpen]);

	const login = useCallback(async () => {
		if (isDevelopmentToken) {
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', '');
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', '');
			await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', '');
			beamSettingsService.setBeamCloudModels([]);
		}
		const authUrl = await beamSettingsService.getBeamCloudAuthUrl();
		authNotificationRef.current?.close();
		const notification = notificationService.prompt(Severity.Info, 'Waiting for Beam authentication', [
			{
				label: 'Cancel',
				run: () => {
					authNotificationRef.current?.close();
					authNotificationRef.current = null;
					setIsAuthenticating(false);
				},
			},
		], {
			source: 'Beam',
			sticky: true,
		});
		notification.progress.infinite();
		authNotificationRef.current = notification;
		setIsAuthenticating(true);
		nativeHostService.openExternal(authUrl);
		setIsOpen(false);
	}, [beamSettingsService, isDevelopmentToken, nativeHostService, notificationService]);

	const signOut = useCallback(async () => {
		if (token) {
			await beamSettingsService.logoutBeamCloud(token, refreshToken ?? '');
		}
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', '');
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', '');
		await beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', '');
		beamSettingsService.setBeamCloudModels([]);
		setAccount(null);
		authNotificationRef.current?.close();
		authNotificationRef.current = null;
		setIsAuthenticating(false);
		setIsOpen(false);
	}, [beamSettingsService, refreshToken, token]);

	if (!token || isDevelopmentToken) {
		return <div className='@@beam-account-chip-wrap'>
			<button type='button' className='@@beam-account-chip @@beam-account-chip-login' onClick={login}>
				<LogIn className='size-3.5' />
				<span>{isAuthenticating ? 'Waiting for Beam authentication' : 'Log in to Beam'}</span>
			</button>
		</div>;
	}

	const usage = account?.usage;
	const percent = usage?.tokenQuota ? Math.min(100, Math.round((usage.usedTokens / usage.tokenQuota) * 100)) : 0;
	const label = account?.user.email ?? (isLoading ? 'Checking account' : 'Beam Account');

	return <div className='@@beam-account-chip-wrap' ref={menuRef}>
		<button type='button' className='@@beam-account-chip' onClick={() => setIsOpen(value => !value)}>
			<span className='@@beam-account-chip-avatar'>
				{account?.user.avatarUrl ? <img src={account.user.avatarUrl} alt='' /> : <UserCircle className='size-3.5' />}
			</span>
			<span className='truncate'>{label}</span>
			<ChevronDown className='size-3' />
		</button>
		{isOpen && <div className='@@beam-account-menu'>
			<div className='@@beam-account-menu-section'>
				<div className='@@beam-account-menu-row'>
					<strong>{account?.user.username ?? 'Beam Account'}</strong>
					<span className='@@beam-account-plan'>{account?.usage.tier ?? 'cloud'}</span>
				</div>
				<div className='@@beam-account-subtitle truncate'>{account?.user.email ?? 'Connected to Beam Cloud'}</div>
			</div>
			<div className='@@beam-account-menu-section'>
				<div className='@@beam-account-menu-row'>
					<span>Monthly usage</span>
					<strong>{percent}%</strong>
				</div>
				<div className='@@beam-account-meter mt-2'>
					<div className={`@@beam-account-meter-fill ${percent > 90 ? 'danger' : percent > 70 ? 'warning' : ''}`} style={{ width: `${percent}%` }} />
				</div>
			</div>
			<button type='button' className='@@beam-account-menu-action' onClick={refreshAccount}>
				<RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
				Refresh account
			</button>
			<button type='button' className='@@beam-account-menu-action' onClick={() => {
				commandService.executeCommand(BEAM_OPEN_SETTINGS_ACTION_ID);
				setIsOpen(false);
			}}>
				<Settings className='size-3.5' />
				Beam settings
			</button>
			<button type='button' className='@@beam-account-menu-action danger' onClick={signOut}>
				<LogOut className='size-3.5' />
				Sign out
			</button>
		</div>}
	</div>;
};

export const Sidebar = ({ className }: { className: string }) => {

	const isDark = useIsDark()
	return <div
		className={`@@beam-scope ${isDark ? 'dark' : ''}`}
		style={{ width: '100%', height: '100%' }}
	>
		<div
			// default background + text styles for sidebar
			className={`
				w-full h-full
				bg-[color:var(--beam-bg-1)]
				text-[#f0f0f2]
			`}
		>

			<div className={`relative w-full h-full`}>
				<ErrorBoundary>
					<BeamAccountMenu />
					<SidebarChat />
				</ErrorBoundary>

			</div>
		</div>
	</div>


}

