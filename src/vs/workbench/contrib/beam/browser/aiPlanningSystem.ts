import type { ILLMProvider, LLMMessage } from './selfHealingAgentController.js';
import { agentEventBus } from './aiAgentEventBus.js';

// --- 1. Interface Definitions ---

export type VSCodeAction =
    | 'open_file'
    | 'edit_file'
    | 'run_terminal_command'
    | 'search_workspace';

export interface PlanStep {
    action: VSCodeAction;
    target: string;
    reasoning?: string; // Optional reasoning for observability
}

export interface ExecutionPlan {
    steps: PlanStep[];
}

// --- 2. Prompts ---

const PLANNING_SYSTEM_PROMPT = `You are a high-level AI Planning System embedded in a VSCode environment.
You DO NOT execute code or access the filesystem directly.
Your ONLY job is to analyze user requests and decompose them into a sequential execution plan.

CRITICAL CONSTRAINTS:
1. You must output a raw JSON object containing a "steps" array.
2. Every step's "action" must be EXACTLY one of: "open_file", "edit_file", "run_terminal_command", "search_workspace".
3. DO NOT invent tools outside this VSCode ecosystem.
4. For any task that may change code, include a final "run_terminal_command" verification step.

Output Format Example:
\`\`\`json
{
  "steps": [
    {
      "action": "search_workspace",
      "target": "auth logic",
      "reasoning": "Find where authentication is handled"
    },
    {
      "action": "edit_file",
      "target": "auth.ts",
      "reasoning": "Update the logic based on search results"
    }
  ]
}
\`\`\`
Return ONLY valid JSON. Do not include conversational filler.`;

// --- 3. Planning System Implementation ---

export class AIPlanningSystem {
    private readonly MAX_PLAN_STEPS = 12;

    constructor(private llmProvider: ILLMProvider) {}

    /**
     * Extracts a JSON block from a raw string, handling markdown code blocks.
     */
    private extractJsonFromMarkdown(text: string): string {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            return jsonMatch[1];
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        // Fallback: assume the whole string might be JSON
        return text.trim();
    }

    /**
     * Validates that the parsed JSON strictly matches the ExecutionPlan schema.
     */
    private validateExecutionPlan(parsedJson: any): ExecutionPlan {
        if (!parsedJson || !Array.isArray(parsedJson.steps)) {
            throw new Error(`Invalid Plan: JSON must contain a "steps" array.`);
        }
        if (parsedJson.steps.length === 0) {
            throw new Error(`Invalid Plan: "steps" must contain at least one step.`);
        }
        if (parsedJson.steps.length > this.MAX_PLAN_STEPS) {
            throw new Error(`Invalid Plan: too many steps (${parsedJson.steps.length}). Maximum is ${this.MAX_PLAN_STEPS}.`);
        }

        const validActions = ['open_file', 'edit_file', 'run_terminal_command', 'search_workspace'];
        const steps: PlanStep[] = [];

        for (const [index, step] of parsedJson.steps.entries()) {
            if (!step || typeof step !== 'object') {
                throw new Error(`Invalid Plan at step ${index}: step must be an object.`);
            }
            if (!validActions.includes(step.action)) {
                throw new Error(`Invalid Plan at step ${index}: Action "${step.action}" is not a supported VSCode tool.`);
            }
            if (typeof step.target !== 'string' || step.target.trim() === '') {
                throw new Error(`Invalid Plan at step ${index}: "target" must be a non-empty string.`);
            }
            if (step.reasoning !== undefined && typeof step.reasoning !== 'string') {
                throw new Error(`Invalid Plan at step ${index}: "reasoning" must be a string when provided.`);
            }

            steps.push({
                action: step.action,
                target: step.target.trim(),
                reasoning: typeof step.reasoning === 'string' ? step.reasoning.trim() : undefined,
            });
        }

        return { steps };
    }

    /**
     * Takes a user request and generates a validated JSON execution plan.
     */
    public async generatePlan(userRequest: string, workspaceContext: string = '', taskId: string = 'plan-0'): Promise<ExecutionPlan> {
        const history: LLMMessage[] = [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: `Workspace Context:\n${workspaceContext}\n\nTask: ${userRequest}` }
        ];

        // 1. Generate the plan using the LLM
        const response = await this.llmProvider.generate(history);

        // 2. Extract JSON payload
        const jsonString = this.extractJsonFromMarkdown(response.content);

        // 3. Parse and Validate
        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (e) {
            throw new Error(`AI generated malformed JSON: ${response.content}`);
        }

        const executionPlan = this.validateExecutionPlan(parsedJson);

        // --- EVENT STREAMING ---
        agentEventBus.emit('PLAN', taskId, executionPlan);

        return executionPlan;
    }
}
