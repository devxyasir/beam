/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { BEAM_SESSION_MEMORY_STORAGE_KEY } from '../common/storageKeys.js';

export type BeamSessionMemoryKind =
	| 'frequent_file'
	| 'preference'
	| 'recurring_error'
	| 'last_working_on';

export interface BeamSessionMemoryEntry {
	id: string;
	kind: BeamSessionMemoryKind;
	workspacePath: string;
	text: string;
	source?: string;
	tags?: string[];
	createdAt: number;
	updatedAt: number;
	reinforcedAt: number;
	accessCount: number;
}

export interface BeamRetrievedSessionMemory extends BeamSessionMemoryEntry {
	stalenessScore: number;
}

export interface BeamCompletedTaskMemoryInput {
	userText: string;
	assistantText: string;
	files: string[];
	errors: string[];
}

export interface IBeamSessionMemoryService {
	readonly _serviceBrand: undefined;
	record(entry: Pick<BeamSessionMemoryEntry, 'kind' | 'text'> & Partial<Omit<BeamSessionMemoryEntry, 'id' | 'kind' | 'text' | 'workspacePath' | 'createdAt' | 'updatedAt' | 'reinforcedAt' | 'accessCount'>>): void;
	recordCompletedTask(input: BeamCompletedTaskMemoryInput): void;
	getRelevantEntries(opts?: { query?: string; limit?: number; kinds?: BeamSessionMemoryKind[] }): BeamRetrievedSessionMemory[];
	formatForPrompt(opts?: { query?: string; maxEntries?: number; maxChars?: number }): string;
}

export const IBeamSessionMemoryService = createDecorator<IBeamSessionMemoryService>('beamSessionMemoryService');

const MAX_WORKSPACE_SESSION_MEMORIES = 50;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

const tokenSet = (value: string) => new Set(
	value
		.toLowerCase()
		.split(/[^a-z0-9_./\\-]+/g)
		.filter(token => token.length > 2)
);

const truncateText = (value: string, maxLength: number) => {
	const clean = normalize(value);
	return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
};

class BeamSessionMemoryService extends Disposable implements IBeamSessionMemoryService {
	_serviceBrand: undefined;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super();
	}

	private _workspacePath(): string {
		return this.workspaceContextService.getWorkspace().folders[0]?.uri.fsPath ?? 'NO_WORKSPACE';
	}

	private _readEntries(): BeamSessionMemoryEntry[] {
		const raw = this.storageService.get(BEAM_SESSION_MEMORY_STORAGE_KEY, StorageScope.WORKSPACE);
		if (!raw) return [];
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((entry): entry is BeamSessionMemoryEntry =>
				!!entry
				&& typeof entry.id === 'string'
				&& typeof entry.kind === 'string'
				&& typeof entry.workspacePath === 'string'
				&& typeof entry.text === 'string'
				&& typeof entry.createdAt === 'number'
				&& typeof entry.updatedAt === 'number'
				&& typeof entry.reinforcedAt === 'number'
				&& typeof entry.accessCount === 'number'
			);
		}
		catch {
			return [];
		}
	}

	private _writeEntries(entries: BeamSessionMemoryEntry[]): void {
		const workspacePath = this._workspacePath();
		const scoped = entries
			.filter(entry => entry.workspacePath === workspacePath)
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, MAX_WORKSPACE_SESSION_MEMORIES);

		this.storageService.store(
			BEAM_SESSION_MEMORY_STORAGE_KEY,
			JSON.stringify(scoped),
			StorageScope.WORKSPACE,
			StorageTarget.MACHINE,
		);
	}

	record(entry: Pick<BeamSessionMemoryEntry, 'kind' | 'text'> & Partial<Omit<BeamSessionMemoryEntry, 'id' | 'kind' | 'text' | 'workspacePath' | 'createdAt' | 'updatedAt' | 'reinforcedAt' | 'accessCount'>>): void {
		const text = truncateText(entry.text, 260);
		if (!text) return;

		const now = Date.now();
		const workspacePath = this._workspacePath();
		const entries = this._readEntries();
		const existing = entries.find(memory =>
			memory.workspacePath === workspacePath
			&& memory.kind === entry.kind
			&& memory.text.toLowerCase() === text.toLowerCase()
		);

		if (existing) {
			existing.updatedAt = now;
			existing.reinforcedAt = now;
			existing.accessCount += 1;
			existing.tags = [...new Set([...(existing.tags ?? []), ...(entry.tags ?? [])])];
			this._writeEntries(entries);
			return;
		}

		entries.push({
			id: generateUuid(),
			kind: entry.kind,
			workspacePath,
			text,
			source: entry.source,
			tags: entry.tags,
			createdAt: now,
			updatedAt: now,
			reinforcedAt: now,
			accessCount: 1,
		});
		this._writeEntries(entries);
	}

	recordCompletedTask(input: BeamCompletedTaskMemoryInput): void {
		const userText = truncateText(input.userText, 180);
		if (userText) {
			this.record({
				kind: 'last_working_on',
				text: `Last worked on: ${userText}`,
				source: 'completed_task',
			});
		}

		for (const file of input.files.slice(0, 8)) {
			this.record({
				kind: 'frequent_file',
				text: `Frequently touched file: ${file}`,
				source: 'completed_task',
				tags: ['file'],
			});
		}

		for (const error of input.errors.slice(0, 3)) {
			this.record({
				kind: 'recurring_error',
				text: `Resolved error pattern: ${truncateText(error, 180)}`,
				source: 'completed_task',
				tags: ['error'],
			});
		}

		const preference = this._extractPreference(input.userText);
		if (preference) {
			this.record({
				kind: 'preference',
				text: preference,
				source: 'user_request',
				tags: ['preference'],
			});
		}
	}

	private _extractPreference(text: string): string | null {
		const clean = normalize(text);
		if (!clean) return null;

		const lower = clean.toLowerCase();
		if (/\bprefer(s|red)?\b|\balways use\b|\bdon't use\b|\bdo not use\b|\bkeep .* style\b/.test(lower)) {
			return `User preference: ${truncateText(clean, 180)}`;
		}
		if (/\btabs\b|\bspaces\b|\bearly returns\b|\bnested if\b|\btypescript\b|\breact\b|\btailwind\b/.test(lower) && /\buse\b|\bavoid\b|\bkeep\b/.test(lower)) {
			return `User preference: ${truncateText(clean, 180)}`;
		}
		return null;
	}

	getRelevantEntries(opts: { query?: string; limit?: number; kinds?: BeamSessionMemoryKind[] } = {}): BeamRetrievedSessionMemory[] {
		const now = Date.now();
		const workspacePath = this._workspacePath();
		const queryTokens = tokenSet(opts.query ?? '');
		const kinds = opts.kinds ? new Set(opts.kinds) : null;

		return this._readEntries()
			.filter(entry => entry.workspacePath === workspacePath)
			.filter(entry => !kinds || kinds.has(entry.kind))
			.map(entry => {
				const ageMs = Math.max(0, now - entry.reinforcedAt);
				const stalenessScore = Math.min(1, ageMs / THIRTY_DAYS_MS);
				const entryTokens = tokenSet(`${entry.kind} ${entry.text} ${(entry.tags ?? []).join(' ')}`);
				let overlap = 0;
				for (const token of queryTokens) {
					if (entryTokens.has(token)) overlap += 1;
				}
				const queryScore = queryTokens.size ? overlap / queryTokens.size : 0;
				const recencyScore = 1 - stalenessScore;
				const reinforcementScore = Math.min(1, entry.accessCount / 8);
				const score = queryScore * 3 + recencyScore * 1.5 + reinforcementScore;
				return { ...entry, stalenessScore, _score: score };
			})
			.sort((a, b) => b._score - a._score || b.updatedAt - a.updatedAt)
			.slice(0, opts.limit ?? 5)
			.map(({ _score, ...entry }) => entry);
	}

	formatForPrompt(opts: { query?: string; maxEntries?: number; maxChars?: number } = {}): string {
		const entries = this.getRelevantEntries({
			query: opts.query,
			limit: opts.maxEntries ?? 3,
		});
		if (!entries.length) return '';

		const lines = entries.map(entry => {
			const ageLabel = entry.stalenessScore >= 1 ? 'stale' : entry.stalenessScore > 0.5 ? 'aging' : 'fresh';
			return `- [${entry.kind}; ${ageLabel}; staleness=${entry.stalenessScore.toFixed(2)}] ${entry.text}`;
		});
		const block = `Workspace session memory:\n${lines.join('\n')}`;
		return truncateText(block, opts.maxChars ?? 1400);
	}
}

registerSingleton(IBeamSessionMemoryService, BeamSessionMemoryService, InstantiationType.Eager);
