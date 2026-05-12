/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

// ─────────────────────────────────────────────────────────────────────────────
//  Beam Cloud Client
//  Communicates with the Beam API Gateway instead of calling AI providers directly.
//  Local providers (Ollama, LM Studio) are NOT affected by this file.
// ─────────────────────────────────────────────────────────────────────────────

import { LLMChatMessage, LLMFIMMessage, OnError, OnFinalMessage, OnText } from './sendLLMMessageTypes.js';
import { SendableReasoningInfo } from './modelCapabilities.js';
import { BeamIntelligenceMode } from './beamSettingsTypes.js';

// The Beam API base URL. Points to localhost during development.
// Replace with your production URL before shipping.
export const BEAM_API_BASE_URL = (typeof process !== 'undefined' && process.env?.['BEAM_API_URL']) || 'http://localhost:3001';

// ─── Type for a single SSE chunk from the Beam API ───────────────────────────

interface BeamSseChunk {
	content?: string;
	reasoning?: string;
	toolCall?: {
		id?: string;
		name?: string;
		arguments?: string;
		isDone?: boolean;
	};
	attachment?: unknown;
	metadata?: {
		type?: string;
		[key: string]: unknown;
	};
	error?: string;
}

// ─── Read a Beam Token from environment / storage ────────────────────────────
// In production this will be read from VS Code SecretStorage (see Phase 3).
// For now we read from an env var so local dev works immediately.

let _cachedToken: string | null = null;

export function setBeamCloudToken(token: string | null) {
	_cachedToken = token;
}

export function getBeamCloudToken(): string | null {
	if (_cachedToken) return _cachedToken;
	if (typeof process !== 'undefined' && process.env?.['BEAM_API_TOKEN']) {
		return process.env['BEAM_API_TOKEN'];
	}
	return null;
}

// ─── Stream Chat ──────────────────────────────────────────────────────────────

export interface BeamCloudChatParams {
	modelId: string;
	mode?: BeamIntelligenceMode;
	taskType?: 'planner' | 'executor' | 'verifier' | 'summarizer' | 'vision' | 'ocr' | 'chat';
	messages: LLMChatMessage[];
	reasoning?: SendableReasoningInfo; // Added reasoning support
	onText: OnText;
	onFinalMessage: OnFinalMessage;
	onError: OnError;
	_setAborter: (aborter: () => void) => void;
	mcpTools?: import('./prompt/prompts.js').InternalToolInfo[] | undefined;
}

export async function beamCloudStreamChat(params: BeamCloudChatParams): Promise<void> {
	const { modelId, mode, taskType, messages, onText, onFinalMessage, onError, _setAborter } = params;

	const token = getBeamCloudToken();
	if (!token) {
		onError({ message: 'You are not signed in to Beam Cloud. Please sign in via Settings → Beam Cloud.', fullError: null });
		return;
	}

	const controller = new AbortController();
	_setAborter(() => controller.abort());

	// Use dev routes for local development (no auth required)
	const isDevToken = token === 'dev-token';
	const url = isDevToken
		? `${BEAM_API_BASE_URL}/v1/dev/chat/completions`
		: `${BEAM_API_BASE_URL}/v1/chat/completions`;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept': 'text/event-stream',
	};
	if (!isDevToken) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: modelId,
				mode,
				taskType,
				messages: messages.map((m) => {
					if ('tool_call_id' in m) {
						return {
							role: 'tool',
							content: m.content,
							tool_call_id: m.tool_call_id,
						};
					}
					if ('tool_calls' in m) {
						return {
							role: 'assistant',
							content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
							tool_calls: m.tool_calls,
						};
					}
					if ('content' in m) {
						return {
							role: m.role,
							content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
						};
					}
					return {
						role: m.role === 'model' ? 'assistant' : 'user',
						content: m.parts.map(p => 'text' in p ? p.text : JSON.stringify(p)).join(''),
					};
				}),
				stream: true,
				reasoning: params.reasoning,
				tools: params.mcpTools ? params.mcpTools.map(t => ({
					type: 'function',
					function: {
						name: t.name,
						description: t.description,
						parameters: {
							type: 'object',
							properties: t.params,
							required: Object.keys(t.params),
						}
					}
				})) : undefined,
			}),
			signal: controller.signal,
		});
	} catch (err) {
		if ((err as Error).name === 'AbortError') return;
		onError({ message: `Beam Cloud: Connection failed. Is the server running? (${(err as Error).message})`, fullError: err as Error });
		return;
	}

	if (!response.ok) {
		let errorBody: { error?: { message?: string } } = {};
		try { errorBody = await response.json(); } catch (_) { /* ignore */ }
		const msg = errorBody?.error?.message ?? `Beam Cloud returned HTTP ${response.status}`;
		onError({ message: msg, fullError: null });
		return;
	}

	// ─── Parse the SSE stream ────────────────────────────────────────────────

	const reader = response.body?.getReader();
	if (!reader) {
		onError({ message: 'Beam Cloud: Response body was empty.', fullError: null });
		return;
	}

	const decoder = new TextDecoder();
	let fullText = '';
	let fullReasoning = '';
	let toolCallId = '';
	let toolCallName = '';
	let toolCallArguments = '';
	let buffer = '';
	const finishChat = () => {
		let rawParams: Record<string, string> = {};
		try {
			const parsed = toolCallArguments ? JSON.parse(toolCallArguments) : {};
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				rawParams = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
			}
		} catch {
			rawParams = {};
		}
		onFinalMessage({
			fullText,
			fullReasoning,
			anthropicReasoning: null,
			toolCall: toolCallName ? {
				id: toolCallId,
				name: toolCallName,
				rawParams,
				doneParams: Object.keys(rawParams),
				isDone: true,
			} : undefined,
		});
	};

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? ''; // keep the incomplete last line

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const dataStr = line.slice('data: '.length).trim();
				if (dataStr === '[DONE]') {
					finishChat();
					return;
				}

				try {
					const chunk: BeamSseChunk = JSON.parse(dataStr);

					if (chunk.error) {
						onError({ message: chunk.error, fullError: null });
						return;
					}

					const hasVisibleDelta = !!chunk.content || !!chunk.reasoning || !!chunk.toolCall;
					if (!hasVisibleDelta) {
						if (chunk.metadata?.type === 'routing') {
							console.debug('Beam Cloud routing:', chunk.metadata);
						}
						continue;
					}

					if (chunk.content) {
						fullText += chunk.content;
					}
					if (chunk.reasoning) {
						fullReasoning += chunk.reasoning;
					}
					if (chunk.toolCall) {
						toolCallId += chunk.toolCall.id ?? '';
						toolCallName += chunk.toolCall.name ?? '';
						toolCallArguments += chunk.toolCall.arguments ?? '';
					}

					onText({
						fullText,
						fullReasoning,
						toolCall: toolCallName ? {
							id: toolCallId,
							name: toolCallName,
							rawParams: {},
							doneParams: [],
							isDone: false,
						} : undefined,
					});
				} catch (_) {
					// Skip malformed JSON chunks silently
				}
			}
		}

		// Stream ended without [DONE] — still call onFinalMessage
			if (fullText || fullReasoning || toolCallName) {
				finishChat();
			} else {
			onError({ message: 'Beam Cloud: Response was empty.', fullError: null });
		}

	} catch (err) {
		if ((err as Error).name === 'AbortError') return;
		onError({ message: `Beam Cloud stream error: ${(err as Error).message}`, fullError: err as Error });
	}
}

// ─── FIM (Autocomplete) ───────────────────────────────────────────────────────

export interface BeamCloudFIMParams {
	modelId: string;
	messages: LLMFIMMessage;
	onFinalMessage: OnFinalMessage;
	onError: OnError;
}

export async function beamCloudFIM(params: BeamCloudFIMParams): Promise<void> {
	const { modelId, messages, onFinalMessage, onError } = params;

	const token = getBeamCloudToken();
	if (!token) {
		onError({ message: 'You are not signed in to Beam Cloud. Please sign in via Settings → Beam Cloud.', fullError: null });
		return;
	}

	// Use dev routes for local development (no auth required)
	const isDevToken = token === 'dev-token';
	const url = isDevToken
		? `${BEAM_API_BASE_URL}/v1/dev/fim/completions`
		: `${BEAM_API_BASE_URL}/v1/fim/completions`;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	if (!isDevToken) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: modelId,
				prefix: messages.prefix,
				suffix: messages.suffix,
				stopTokens: messages.stopTokens,
			}),
		});
	} catch (err) {
		onError({ message: `Beam Cloud FIM: Connection failed. (${(err as Error).message})`, fullError: err as Error });
		return;
	}

	if (!response.ok) {
		let errorBody: { error?: { message?: string } } = {};
		try { errorBody = await response.json(); } catch (_) { /* ignore */ }
		const msg = errorBody?.error?.message ?? `Beam Cloud FIM returned HTTP ${response.status}`;
		onError({ message: msg, fullError: null });
		return;
	}

	try {
		const data = await response.json() as { completion: string };
		onFinalMessage({ fullText: data.completion ?? '', fullReasoning: '', anthropicReasoning: null });
	} catch (err) {
		onError({ message: `Beam Cloud FIM: Failed to parse response.`, fullError: err as Error });
	}
}

// ─── User Usage ──────────────────────────────────────────────────────────────

export interface BeamCloudUsage {
	usedTokens: number;
	tokenQuota: number;
	tokensRemaining: number;
	tier: string;
	resetDate: string;
}

export interface BeamCloudUser {
	id: string;
	email: string;
	username: string;
	avatarUrl?: string | null;
	tier: string;
	createdAt?: string;
}

export interface BeamCloudAccountStatus {
	user: BeamCloudUser;
	usage: BeamCloudUsage;
}

export interface BeamCloudTokenPair {
	accessToken: string;
	refreshToken: string;
	expiresAt: string;
}

export function getBeamCloudAuthUrl(): string {
	return `${BEAM_API_BASE_URL}/v1/auth/github`;
}

function authHeaders(token: string): Record<string, string> {
	return token === 'dev-token' ? {} : { Authorization: `Bearer ${token}` };
}

function normalizeUsage(data: any): BeamCloudUsage {
	const usedTokens = Number(data.usedTokens ?? data.tokensUsedThisMonth ?? 0);
	const tokenQuota = Number(data.tokenQuota ?? data.tokenLimitThisMonth ?? 0);
	return {
		usedTokens,
		tokenQuota,
		tokensRemaining: Number(data.tokensRemaining ?? Math.max(0, tokenQuota - usedTokens)),
		tier: String(data.tier ?? 'free'),
		resetDate: String(data.resetDate ?? data.resetsAt ?? new Date().toISOString()),
	};
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
	if (!response.ok) {
		let errorBody: { error?: { message?: string } } = {};
		try { errorBody = await response.json(); } catch (_) { /* ignore */ }
		throw new Error(errorBody?.error?.message ?? fallbackMessage);
	}
	return await response.json() as T;
}

export async function getBeamCloudUsage(token?: string): Promise<BeamCloudUsage | null> {
	const apiToken = token || getBeamCloudToken();
	if (!apiToken) return null;

	try {
		// Skip auth header for dev token (local development)
		const headers = authHeaders(apiToken);
		const url = (apiToken === 'dev-token')
			? `${BEAM_API_BASE_URL}/v1/dev/user/usage`
			: `${BEAM_API_BASE_URL}/v1/user/usage`;

		const response = await fetch(url, {
			method: 'GET',
			headers,
		});
		const data = await parseJsonResponse<any>(response, `Beam Cloud usage returned HTTP ${response.status}`);
		return normalizeUsage(data);
	} catch (err) {
		console.error('getBeamCloudUsage error:', err);
		throw err;
	}
}

export async function getBeamCloudAccountStatus(token?: string): Promise<BeamCloudAccountStatus | null> {
	const apiToken = token || getBeamCloudToken();
	if (!apiToken) return null;

	const headers = authHeaders(apiToken);
	const basePath = apiToken === 'dev-token' ? '/v1/dev' : '/v1';
	const [userResponse, usageResponse] = await Promise.all([
		fetch(`${BEAM_API_BASE_URL}${basePath}/user/me`, { method: 'GET', headers }),
		fetch(`${BEAM_API_BASE_URL}${basePath}/user/usage`, { method: 'GET', headers }),
	]);
	const user = await parseJsonResponse<BeamCloudUser>(userResponse, `Beam Cloud account returned HTTP ${userResponse.status}`);
	const usage = normalizeUsage(await parseJsonResponse<any>(usageResponse, `Beam Cloud usage returned HTTP ${usageResponse.status}`));
	return { user, usage };
}

export async function refreshBeamCloudAuth(refreshToken: string): Promise<BeamCloudTokenPair> {
	const response = await fetch(`${BEAM_API_BASE_URL}/v1/auth/refresh`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refreshToken }),
	});
	const tokenPair = await parseJsonResponse<BeamCloudTokenPair>(response, `Beam Cloud refresh returned HTTP ${response.status}`);
	setBeamCloudToken(tokenPair.accessToken);
	return tokenPair;
}

export async function logoutBeamCloud(token: string, refreshToken: string): Promise<void> {
	if (token === 'dev-token') return;
	await fetch(`${BEAM_API_BASE_URL}/v1/auth/logout`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...authHeaders(token),
		},
		body: JSON.stringify({ refreshToken }),
	}).catch(error => console.warn('Beam Cloud logout failed:', error));
	setBeamCloudToken(null);
}

export async function getBeamCloudModels(token?: string): Promise<string[] | null> {
	const apiToken = token || getBeamCloudToken();
	if (!apiToken) return null;

	try {
		// Skip auth header for dev token (local development)
		const headers: Record<string, string> = {};
		if (apiToken !== 'dev-token') {
			headers['Authorization'] = `Bearer ${apiToken}`;
		}
		const url = (apiToken === 'dev-token')
			? `${BEAM_API_BASE_URL}/v1/dev/models`
			: `${BEAM_API_BASE_URL}/v1/models`;

		const response = await fetch(url, {
			method: 'GET',
			headers,
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		const data = await response.json();
		return data.models.map((m: { id: string }) => m.id);
	} catch (err) {
		console.error('getBeamCloudModels error:', err);
		throw err;
	}
}
