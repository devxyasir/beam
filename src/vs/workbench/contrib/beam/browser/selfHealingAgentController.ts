import { agentEventBus } from './aiAgentEventBus.js';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface LLMMessage {
    role: Role;
    content: string;
    name?: string; // Used for tool results
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ILLMProvider {
    generate(history: LLMMessage[], tools?: any[]): Promise<LLMMessage>;
}

export class SelfHealingAgentController {
    constructor(private llmProvider: ILLMProvider) { }

    public async executeTask(taskId: string, userMessage: string) {
        agentEventBus.emit('THOUGHT', taskId, { message: 'Starting task...' });

        const history: LLMMessage[] = [{ role: 'user', content: userMessage }];
        const response = await this.llmProvider.generate(history);

        agentEventBus.emit('SUCCESS', taskId, { result: response.content });
        return response;
    }

    public async attemptFix(taskId: string, errorContext: string) {
        agentEventBus.emit('FIX_ATTEMPT', taskId, { error: errorContext });

        const history: LLMMessage[] = [{ role: 'user', content: `Fix this error: ${errorContext}` }];
        const response = await this.llmProvider.generate(history);

        return response;
    }
}
