import { BeamSettingsState, ModelOption } from '../../../../common/beamSettingsService.js';
import { AgentRoutingRole, beamIntelligenceModes, BeamIntelligenceMode, ChatMode, displayInfoOfProviderName, localProviderNames, ModelSelection, ProviderName, RefreshableProviderName } from '../../../../common/beamSettingsTypes.js';
import { getModelCapabilities } from '../../../../common/modelCapabilities.js';
import { RefreshModelStateOfProvider } from '../../../../common/refreshModelService.js';

export const beamIntelligenceModeInfo: Record<BeamIntelligenceMode, {
	icon: string;
	title: string;
	description: string;
	latency: 'Lowest' | 'Low' | 'Medium' | 'Variable';
	capability: 'Light' | 'Balanced' | 'High' | 'Local';
	locality: 'Cloud' | 'Local' | 'Mixed';
}> = {
	fast: {
		icon: '⚡',
		title: 'Fast',
		description: 'Quick responses and lightweight edits',
		latency: 'Lowest',
		capability: 'Light',
		locality: 'Cloud',
	},
	balanced: {
		icon: '⚖',
		title: 'Balanced',
		description: 'Best everyday coding experience',
		latency: 'Low',
		capability: 'Balanced',
		locality: 'Mixed',
	},
	powerful: {
		icon: '🧠',
		title: 'Powerful',
		description: 'Deep reasoning and large codebase refactors',
		latency: 'Medium',
		capability: 'High',
		locality: 'Cloud',
	},
	free: {
		icon: '🎁',
		title: 'Free',
		description: 'Free cloud or local models when available',
		latency: 'Variable',
		capability: 'Balanced',
		locality: 'Mixed',
	},
	local: {
		icon: '💻',
		title: 'Local',
		description: 'Runs on your machine with Ollama or LM Studio',
		latency: 'Variable',
		capability: 'Local',
		locality: 'Local',
	},
};

export const chatModeInfo: Record<ChatMode, { title: string; description: string }> = {
	normal: { title: 'Chat', description: 'Conversational help without tools' },
	gather: { title: 'Gather', description: 'Reads and searches context without edits' },
	agent: { title: 'Agent', description: 'Plans, edits, runs tools, and verifies' },
};

export type ProviderUxStatus = {
	state: 'connected' | 'missing' | 'offline' | 'loading';
	label: string;
	detail: string;
};

export type BeamModeResolution = {
	requestedMode: BeamIntelligenceMode;
	resolvedMode: BeamIntelligenceMode;
	selection: ModelSelection | null;
	modelOption: ModelOption | null;
	isFallback: boolean;
	fallbackReason: string | null;
	statusLabel: string;
};

const localProviderSet = new Set<string>(localProviderNames as readonly string[]);

export const isLocalProvider = (providerName: ProviderName) => localProviderSet.has(providerName);

const normalized = (value: string) => value.toLowerCase();

const isFastModelName = (modelName: string) => {
	const name = normalized(modelName);
	return /flash|mini|haiku|lite|small|turbo|groq|instant|8b|7b|3b/.test(name);
};

const isFreeModel = (option: ModelOption, settingsState: BeamSettingsState) => {
	const capabilities = getModelCapabilities(option.selection.providerName, option.selection.modelName, settingsState.overridesOfModel);
	const name = normalized(option.selection.modelName);
	return option.selection.providerName === 'beamCloud'
		|| isLocalProvider(option.selection.providerName)
		|| name.includes('free')
		|| (capabilities.cost.input === 0 && capabilities.cost.output === 0);
};

const providerHasModels = (settingsState: BeamSettingsState, providerName: ProviderName) => {
	const provider = settingsState.settingsOfProvider[providerName];
	return !!provider?._didFillInProviderSettings && provider.models.some(model => !model.isHidden);
};

export const getProviderUxStatus = (
	settingsState: BeamSettingsState,
	refreshModelState: RefreshModelStateOfProvider,
	providerName: ProviderName,
): ProviderUxStatus => {
	const provider = settingsState.settingsOfProvider[providerName];
	const title = displayInfoOfProviderName(providerName).title;

	if (isLocalProvider(providerName)) {
		const refreshable = providerName as RefreshableProviderName;
		const refreshState = refreshModelState[refreshable]?.state;
		const modelCount = provider?.models?.filter(model => !model.isHidden).length ?? 0;
		if (refreshState === 'refreshing' || refreshState === 'init') {
			return { state: 'loading', label: `${title} checking`, detail: 'Looking for local models' };
		}
		if (provider?._didFillInProviderSettings && modelCount > 0) {
			return { state: 'connected', label: `${title} connected`, detail: `${modelCount} local model${modelCount === 1 ? '' : 's'} available` };
		}
		return { state: 'offline', label: `${title} offline`, detail: 'Start the local server or refresh models' };
	}

	if (providerHasModels(settingsState, providerName)) {
		const modelCount = provider.models.filter(model => !model.isHidden).length;
		return { state: 'connected', label: `${title} connected`, detail: `${modelCount} model${modelCount === 1 ? '' : 's'} available` };
	}

	return { state: 'missing', label: `${title} not configured`, detail: 'Connect this provider in settings' };
};

const scoreOptionForMode = (option: ModelOption, settingsState: BeamSettingsState, mode: BeamIntelligenceMode) => {
	const { providerName, modelName } = option.selection;
	const capabilities = getModelCapabilities(providerName, modelName, settingsState.overridesOfModel);
	let score = 0;
	if (capabilities.specialToolFormat) score += 120;
	if (capabilities.contextWindow >= 100_000) score += 90;
	if (capabilities.reasoningCapabilities) score += 120;
	if (isLocalProvider(providerName)) score += 30;
	if (providerName === 'beamCloud') score += 40;

	if (mode === 'fast') {
		score += isFastModelName(modelName) ? 900 : 0;
		score -= capabilities.reasoningCapabilities ? 50 : 0;
	}
	else if (mode === 'balanced') {
		score += capabilities.specialToolFormat ? 300 : 0;
		score += capabilities.contextWindow >= 32_000 ? 120 : 0;
	}
	else if (mode === 'powerful') {
		score += capabilities.reasoningCapabilities ? 900 : 0;
		score += capabilities.contextWindow >= 100_000 ? 240 : 0;
		score += isFastModelName(modelName) ? -100 : 0;
	}
	else if (mode === 'free') {
		score += isFreeModel(option, settingsState) ? 900 : 0;
	}
	else if (mode === 'local') {
		score += isLocalProvider(providerName) ? 1000 : -400;
	}

	return score;
};

const modeHasCandidate = (option: ModelOption, settingsState: BeamSettingsState, mode: BeamIntelligenceMode) => {
	const { providerName, modelName } = option.selection;
	const capabilities = getModelCapabilities(providerName, modelName, settingsState.overridesOfModel);
	if (mode === 'fast') return isFastModelName(modelName);
	if (mode === 'powerful') return !!capabilities.reasoningCapabilities || capabilities.contextWindow >= 100_000;
	if (mode === 'free') return isFreeModel(option, settingsState);
	if (mode === 'local') return isLocalProvider(providerName);
	return true;
};

export const resolveBeamMode = (
	settingsState: BeamSettingsState,
	mode: BeamIntelligenceMode = settingsState.globalSettings.intelligenceMode ?? 'balanced',
): BeamModeResolution => {
	const options = settingsState._modelOptions;
	if (options.length === 0) {
		return {
			requestedMode: mode,
			resolvedMode: mode,
			selection: null,
			modelOption: null,
			isFallback: false,
			fallbackReason: 'No configured models are available.',
			statusLabel: 'No model configured',
		};
	}

	const preferred = [...options]
		.filter(option => modeHasCandidate(option, settingsState, mode))
		.sort((a, b) => scoreOptionForMode(b, settingsState, mode) - scoreOptionForMode(a, settingsState, mode))[0];
	const fallback = [...options]
		.sort((a, b) => scoreOptionForMode(b, settingsState, 'balanced') - scoreOptionForMode(a, settingsState, 'balanced'))[0];
	const selected = preferred ?? fallback;
	const isFallback = !preferred;

	return {
		requestedMode: mode,
		resolvedMode: isFallback ? 'balanced' : mode,
		selection: selected?.selection ?? null,
		modelOption: selected ?? null,
		isFallback,
		fallbackReason: isFallback ? `${beamIntelligenceModeInfo[mode].title} mode is not configured yet. Beam is using the best available model.` : null,
		statusLabel: selected ? `${displayInfoOfProviderName(selected.selection.providerName).title} ready` : 'No model configured',
	};
};

export const resolveAgentRouting = (settingsState: BeamSettingsState): Record<AgentRoutingRole, BeamModeResolution> => {
	const mode = settingsState.globalSettings.intelligenceMode ?? 'balanced';
	return {
		planner: settingsState.globalSettings.agentModelRouting?.planner
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.planner)
			: resolveBeamMode(settingsState, mode === 'fast' ? 'balanced' : 'powerful'),
		executor: settingsState.globalSettings.agentModelRouting?.executor
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.executor)
			: resolveBeamMode(settingsState, mode),
		verifier: settingsState.globalSettings.agentModelRouting?.verifier
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.verifier)
			: resolveBeamMode(settingsState, mode === 'powerful' ? 'balanced' : mode),
		summarizer: settingsState.globalSettings.agentModelRouting?.summarizer
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.summarizer)
			: resolveBeamMode(settingsState, mode),
		vision: settingsState.globalSettings.agentModelRouting?.vision
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.vision)
			: resolveBeamMode(settingsState, 'powerful'),
		ocr: settingsState.globalSettings.agentModelRouting?.ocr
			? selectionToResolution(settingsState, mode, settingsState.globalSettings.agentModelRouting.ocr)
			: resolveBeamMode(settingsState, 'fast'),
	};
};

const selectionToResolution = (settingsState: BeamSettingsState, mode: BeamIntelligenceMode, selection: ModelSelection): BeamModeResolution => {
	const option = settingsState._modelOptions.find(candidate =>
		candidate.selection.providerName === selection.providerName && candidate.selection.modelName === selection.modelName
	) ?? { name: selection.modelName, selection };
	return {
		requestedMode: mode,
		resolvedMode: mode,
		selection,
		modelOption: option,
		isFallback: false,
		fallbackReason: null,
		statusLabel: `${displayInfoOfProviderName(selection.providerName).title} ready`,
	};
};

export { beamIntelligenceModes };
