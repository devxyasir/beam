import { generateUuid } from '../../../../base/common/uuid.js';
import { AgentEvent, AgentEventType } from '../common/chatThreadServiceTypes.js';

export type LegacyAgentEventType =
    | 'PLAN'
    | 'THOUGHT'
    | 'TOOL_CALL'
    | 'FILE_EDIT'
    | 'TERMINAL_RUN'
    | 'TOOL_RESULT'
    | 'ERROR'
    | 'FIX_ATTEMPT'
    | 'SUCCESS'
    | 'STATE_SYNC';

export type AgentEventInputType = AgentEventType | LegacyAgentEventType;

const normalizeEventType = (type: AgentEventInputType): AgentEventType => {
    switch (type) {
        case 'PLAN': return 'plan';
        case 'THOUGHT': return 'thought';
        case 'TOOL_CALL': return 'tool_call';
        case 'FILE_EDIT': return 'file_edit';
        case 'TERMINAL_RUN': return 'terminal';
        case 'TOOL_RESULT': return 'tool_result';
        case 'ERROR': return 'error';
        case 'FIX_ATTEMPT': return 'fix';
        case 'SUCCESS': return 'success';
        case 'STATE_SYNC': return 'state';
        default: return type;
    }
};

const titleOfEvent = (type: AgentEventType, payload: any): string => {
    switch (type) {
        case 'plan': return 'Plan';
        case 'plan_step_started': return 'Plan step started';
        case 'plan_step_completed': return 'Plan step completed';
        case 'thought': return 'Thinking';
        case 'tool_call': return payload?.toolName ? `Tool: ${payload.toolName}` : 'Tool call';
        case 'tool_result': return payload?.toolName ? `Result: ${payload.toolName}` : 'Tool result';
        case 'file_edit': return 'File edit';
        case 'terminal': return 'Terminal';
        case 'diagnostic': return 'Diagnostic';
        case 'error': return 'Error';
        case 'fix': return 'Fix attempt';
        case 'success': return 'Success';
        case 'state': return 'State updated';
    }
};

const summaryOfPayload = (type: AgentEventType, payload: any): string | undefined => {
    if (!payload) return undefined;
    if (typeof payload.message === 'string') return payload.message;
    if (typeof payload.reason === 'string') return payload.reason;
    if (typeof payload.command === 'string') return payload.command;
    if (typeof payload.content === 'string') return payload.content;
    if (payload.toolName) return String(payload.toolName);
    if (type === 'plan' && Array.isArray(payload.steps)) return `${payload.steps.length} steps`;
    return undefined;
};

export class AgentEventBus {
    private listeners: ((event: AgentEvent) => void)[] = [];

    public emit(type: AgentEventInputType, threadId: string, payload: any, options?: { runId?: string; title?: string; summary?: string }) {
        const normalizedType = normalizeEventType(type);
        const event: AgentEvent = {
            id: generateUuid(),
            type: normalizedType,
            timestamp: Date.now(),
            threadId,
            runId: options?.runId ?? threadId,
            title: options?.title ?? titleOfEvent(normalizedType, payload),
            summary: options?.summary ?? summaryOfPayload(normalizedType, payload),
            durationMs: typeof payload?.durationMs === 'number' ? payload.durationMs : undefined,
            payload,
        };
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('[Beam Agent] Event listener failed', error);
            }
        });
    }

    public subscribe(listener: (event: AgentEvent) => void): () => void {
        this.listeners.push(listener);
        return () => { // Return unsubscribe function
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
}

export const agentEventBus = new AgentEventBus();
