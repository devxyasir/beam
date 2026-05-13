/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { IBeamSettingsService } from '../common/beamSettingsService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { finishBeamAuthListener, shouldAcceptBeamAuthCallback } from './beamAuthSession.js';

class BeamAuthHandler extends Disposable implements IWorkbenchContribution, IURLHandler {

	static readonly ID = 'beam.authHandler';

	constructor(
		@IURLService private readonly urlService: IURLService,
		@IBeamSettingsService private readonly beamSettingsService: IBeamSettingsService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super();
		this._register(this.urlService.registerHandler(this));
	}

	async handleURL(uri: URI): Promise<boolean> {
		const isLegacyCallback = uri.authority === 'beam.beam' && uri.path === '/auth-callback';
		const isBeamCallback = uri.scheme === 'beam' && uri.authority === 'auth' && uri.path === '/callback';
		if (!isLegacyCallback && !isBeamCallback) {
			return false;
		}

		const query = new URLSearchParams(uri.query);
		const token = query.get('token') ?? query.get('accessToken');
		const state = query.get('state');
		const refreshToken = query.get('refreshToken');
		const expiresAt = query.get('expiresAt');

		if (isBeamCallback && token) {
			if (!shouldAcceptBeamAuthCallback(state, 'deep_link')) {
				this.notificationService.warn('Beam browser login did not match this pending Beam window. Start login again from this window.');
				return true;
			}

			try {
				const redeemed = await this.beamSettingsService.redeemBeamCloudIdeAuthToken(token, state ?? undefined);
				await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', redeemed.accessToken);
				await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', redeemed.refreshToken);
				await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', redeemed.expiresAt);
				try {
					const models = await this.beamSettingsService.getBeamCloudModels(redeemed.accessToken);
					if (models) {
						this.beamSettingsService.setBeamCloudModels(models);
					}
				} catch (error) {
					console.warn('Beam Cloud: signed in, but failed to refresh cloud models.', error);
				}
				finishBeamAuthListener();
				this.notificationService.info('Successfully signed in to Beam Cloud!');
			} catch (error) {
				this.notificationService.error(error instanceof Error ? error.message : 'Beam auth token could not be redeemed.');
			}
			return true;
		}

		if (isLegacyCallback && token) {
			await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamToken', token);
			if (refreshToken) {
				await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamRefreshToken', refreshToken);
			}
			if (expiresAt) {
				await this.beamSettingsService.setSettingOfProvider('beamCloud', 'beamTokenExpiresAt', expiresAt);
			}
			try {
				const models = await this.beamSettingsService.getBeamCloudModels(token);
				if (models) {
					this.beamSettingsService.setBeamCloudModels(models);
				}
			} catch (error) {
				console.warn('Beam Cloud: signed in, but failed to refresh cloud models.', error);
			}
			finishBeamAuthListener();
			this.notificationService.info('Successfully signed in to Beam Cloud!');
			return true;
		}

		return false;
	}
}

registerWorkbenchContribution2(BeamAuthHandler.ID, BeamAuthHandler, WorkbenchPhase.Eventually);
