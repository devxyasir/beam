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
		// Expecting vscode://beam.beam/auth-callback?token=...
		if (uri.authority !== 'beam.beam' || uri.path !== '/auth-callback') {
			return false;
		}

		const query = new URLSearchParams(uri.query);
		const token = query.get('token') ?? query.get('accessToken');
		const refreshToken = query.get('refreshToken');
		const expiresAt = query.get('expiresAt');

		if (token) {
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
			this.notificationService.info('Successfully signed in to Beam Cloud!');
			return true;
		}

		return false;
	}
}

registerWorkbenchContribution2(BeamAuthHandler.ID, BeamAuthHandler, WorkbenchPhase.Eventually);
