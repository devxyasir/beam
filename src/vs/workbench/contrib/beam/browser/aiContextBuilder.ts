import { IToolsService } from './toolsServiceInterface.js';

// --- Type Abstractions for VSCode Internal Services ---
// (These map to actual VSCode IEditorService capabilities)

export interface ITextModel {
    getValue(): string;
    getLineCount(): number;
}

export interface IActiveEditorControl {
    hasModel?(): boolean;
    getModel(): any;
}

export interface IVisibleEditor {
    resource?: { fsPath: string };
}

export interface IEditorService {
    activeTextEditorControl?: IActiveEditorControl;
    visibleEditors: readonly IVisibleEditor[];
}

// --- Context Interfaces ---

export interface AgentContext {
    activeFileContent: string;
    visibleFileSignatures: string[];
    relevantSearchResults: string[];
}

export class AIContextBuilder {
    // strict token optimization caps
    private readonly MAX_CHARS_ACTIVE_FILE = 20000; // ~5k tokens
    private readonly MAX_CHARS_SEARCH = 10000;      // ~2.5k tokens
    private readonly MAX_CHARS_SEARCH_QUERY = 200;
    private readonly MAX_CONTEXT_SEARCH_QUERIES = 2;

    constructor(
        private editorService: IEditorService,
        private toolsService: IToolsService
    ) {}

    private buildSearchQueries(userRequest: string): string[] {
        const normalized = userRequest.trim().replace(/\s+/g, ' ').substring(0, this.MAX_CHARS_SEARCH_QUERY);
        const quotedTerms = Array.from(userRequest.matchAll(/[`"']([^`"']{3,80})[`"']/g)).map(match => match[1].trim());
        const identifierTerms = Array.from(userRequest.matchAll(/\b[A-Za-z_$][A-Za-z0-9_$./-]{2,}\b/g))
            .map(match => match[0])
            .filter(term => ![
                'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'make', 'fix', 'code', 'file',
                'please', 'need', 'agent', 'system', 'working', 'error', 'errors',
            ].includes(term.toLowerCase()))
            .slice(0, 6);

        const candidates = [
            quotedTerms[0],
            identifierTerms.join(' '),
            normalized,
        ].filter((query): query is string => !!query && query.trim().length > 0);

        return Array.from(new Set(candidates.map(query => query.trim().substring(0, this.MAX_CHARS_SEARCH_QUERY))))
            .slice(0, this.MAX_CONTEXT_SEARCH_QUERIES);
    }

    private addSearchResult(context: AgentContext, label: string, searchResultsStr: string) {
        const trimmedResult = searchResultsStr.length > this.MAX_CHARS_SEARCH
            ? searchResultsStr.substring(0, this.MAX_CHARS_SEARCH) + '\n...[TRUNCATED]'
            : searchResultsStr;
        context.relevantSearchResults.push(`${label}\n${trimmedResult}`);
    }

    /**
     * Extracts dynamic context directly from the VSCode IDE state without duplication.
     */
    public async buildContext(userRequest: string): Promise<AgentContext> {
        const context: AgentContext = {
            activeFileContent: 'No active editor found.',
            visibleFileSignatures: [],
            relevantSearchResults: []
        };

        // 1. Tier 1: Extract Active Unsaved File State
        const activeEditor = this.editorService.activeTextEditorControl as any;
        if (activeEditor && typeof activeEditor.getModel === 'function') {
            const model = activeEditor.getModel();
            if (model && typeof model.getValue === 'function') {
                const fullText = model.getValue();

                // Token Optimization Strategy: Truncation
                if (fullText.length > this.MAX_CHARS_ACTIVE_FILE) {
                    context.activeFileContent = fullText.substring(0, this.MAX_CHARS_ACTIVE_FILE) + '\n\n...[TRUNCATED TO SAVE TOKENS]';
                } else {
                    context.activeFileContent = fullText;
                }
            }
        }

        // 2. Tier 2: Extract Visible Editor Tabs (Paths only)
        const visibleEditors = this.editorService.visibleEditors;
        context.visibleFileSignatures = visibleEditors
            .map(e => e.resource?.fsPath)
            .filter((path): path is string => !!path); // Filter undefined

        // 3. Tier 3: Contextual Workspace Search
        // Use existing VSCode search-backed tools for lightweight path and content context.
        try {
            const searchQueries = this.buildSearchQueries(userRequest);
            const primaryQuery = searchQueries[0] || userRequest.trim().substring(0, this.MAX_CHARS_SEARCH_QUERY) || 'src';
            const validatedPathParams = this.toolsService.validateParams['search_pathnames_only']({
                query: primaryQuery,
                page_number: '1'
            });

            const { result: pathResult } = await this.toolsService.callTool['search_pathnames_only'](validatedPathParams as any);
            const resolvedPathResult = await pathResult;
            const pathResultsStr = this.toolsService.stringOfResult['search_pathnames_only'](validatedPathParams as any, resolvedPathResult);
            this.addSearchResult(context, `Path search for "${primaryQuery}"`, pathResultsStr || 'No path matches.');

            for (const query of searchQueries) {
                const validatedContentParams = this.toolsService.validateParams['search_for_files']({
                    query,
                    is_regex: 'false',
                    page_number: '1'
                });
                const { result: contentResult } = await this.toolsService.callTool['search_for_files'](validatedContentParams as any);
                const resolvedContentResult = await contentResult;
                const contentResultsStr = this.toolsService.stringOfResult['search_for_files'](validatedContentParams as any, resolvedContentResult);
                this.addSearchResult(context, `Content search for "${query}"`, contentResultsStr || 'No content matches.');
            }
        } catch (e) {
            // Failsafe: if the search errors, we silently drop the Tier 3 context
            // to ensure the agent still runs with Tier 1 and Tier 2.
            const message = e instanceof Error ? e.message : String(e);
            context.relevantSearchResults.push(`Search failed or unavailable: ${message}`);
        }

        return context;
    }

    /**
     * Compiles the extracted context into the final System Prompt prefix for the LLM.
     */
    public formatContextForLLM(context: AgentContext): string {
        return `
# Live VSCode Workspace Context

## Active Editor (Currently focused file)
\`\`\`
${context.activeFileContent}
\`\`\`

## Other Visible Tabs
${context.visibleFileSignatures.length > 0 ? context.visibleFileSignatures.join('\n') : 'None'}

## Relevant Workspace Files (Search Results)
${context.relevantSearchResults.join('\n')}
`;
    }
}
