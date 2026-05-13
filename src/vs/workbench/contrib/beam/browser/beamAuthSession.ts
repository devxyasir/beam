/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

export type BeamAuthFlow = 'deep_link' | 'manual_token';

export interface BeamAuthPendingSession {
	readonly state: string;
	readonly flow: BeamAuthFlow;
	readonly expiresAt: number;
}

type BeamAuthListenerState = 'idle' | 'active' | 'cancelled';

let listenerState: BeamAuthListenerState = 'idle';
let pendingSession: BeamAuthPendingSession | undefined;
let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

function makeAuthState(): string {
	const cryptoApi = globalThis.crypto;
	if (cryptoApi?.randomUUID) {
		return cryptoApi.randomUUID();
	}

	const bytes = new Uint8Array(18);
	cryptoApi?.getRandomValues?.(bytes);
	return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function startBeamAuthListener(flow: BeamAuthFlow = 'deep_link', timeoutMs = 10 * 60 * 1000): BeamAuthPendingSession {
	const session: BeamAuthPendingSession = {
		state: makeAuthState(),
		flow,
		expiresAt: Date.now() + timeoutMs,
	};

	listenerState = 'active';
	pendingSession = session;
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
	}
	timeoutHandle = setTimeout(() => {
		if (listenerState === 'active' && pendingSession && Date.now() >= pendingSession.expiresAt) {
			finishBeamAuthListener();
		}
	}, timeoutMs);

	return session;
}

export function cancelBeamAuthListener(): void {
	listenerState = 'cancelled';
	pendingSession = undefined;
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
		timeoutHandle = undefined;
	}
}

export function finishBeamAuthListener(): void {
	listenerState = 'idle';
	pendingSession = undefined;
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
		timeoutHandle = undefined;
	}
}

export function getBeamAuthPendingSession(): BeamAuthPendingSession | undefined {
	if (listenerState !== 'active' || !pendingSession) {
		return undefined;
	}
	if (Date.now() > pendingSession.expiresAt) {
		finishBeamAuthListener();
		return undefined;
	}
	return pendingSession;
}

export function shouldAcceptBeamAuthCallback(state: string | null, flow: BeamAuthFlow = 'deep_link'): boolean {
	const session = getBeamAuthPendingSession();
	if (!session) {
		return false;
	}
	return session.flow === flow && !!state && session.state === state;
}
