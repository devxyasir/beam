/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { WebSearchResult } from '../common/toolsServiceTypes.js';

export interface IWebSearchService {
	readonly _serviceBrand: undefined;
	search(query: string, numResults: number): Promise<WebSearchResult[]>;
}

export const IWebSearchService = createDecorator<IWebSearchService>('beamWebSearchService');

/**
 * DuckDuckGo HTML scrape approach — no API key required.
 * We use the DuckDuckGo "lite" endpoint which returns a simple HTML page
 * that we can parse for result titles, URLs, and snippets.
 *
 * Fallback: if DDG blocks us (rare in VS Code context), we return a helpful
 * "search manually" message so the agent can tell the user.
 */
export class WebSearchService implements IWebSearchService {
	readonly _serviceBrand: undefined;

	constructor(
		@IRequestService private readonly _requestService: IRequestService,
	) { }

	async search(query: string, numResults: number): Promise<WebSearchResult[]> {
		const clampedNum = Math.min(Math.max(numResults, 1), 10);

		try {
			// DuckDuckGo lite HTML endpoint — lightweight, no JS, no API key
			const encodedQuery = encodeURIComponent(query);
			const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

			const response = await this._requestService.request({
				type: 'GET',
				url,
				headers: {
					// Mimic a plain browser request so DDG doesn't block
					'User-Agent': 'Mozilla/5.0 (compatible; BeamAgent/1.0)',
					'Accept': 'text/html',
				},
			}, CancellationToken.None);

			if (response.res.statusCode !== 200) {
				return this._fallbackResults(query);
			}

			const buffer = await streamToBuffer(response.stream);
			const html = buffer.toString();

			return this._parseDDGHtml(html, clampedNum);
		} catch (e) {
			// Network error or blocked — return graceful fallback
			return this._fallbackResults(query);
		}
	}

	/**
	 * Parse DuckDuckGo lite HTML.
	 * Structure (simplified):
	 *   <div class="result results_links">
	 *     <a class="result__a" href="...">Title</a>
	 *     <div class="result__snippet">Snippet text...</div>
	 *   </div>
	 */
	private _parseDDGHtml(html: string, numResults: number): WebSearchResult[] {
		const results: WebSearchResult[] = [];

		// Match each result block
		const resultBlockRegex = /<div class="result[^"]*results_links[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
		const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/;
		const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/;

		// Strip HTML tags helper
		const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

		let match: RegExpExecArray | null;
		while ((match = resultBlockRegex.exec(html)) !== null && results.length < numResults) {
			const block = match[0];

			const titleMatch = titleRegex.exec(block);
			if (!titleMatch) continue;

			const rawUrl = titleMatch[1];
			const rawTitle = titleMatch[2];

			// DDG encodes the real URL in a redirect. Extract the `uddg` param or use as-is.
			let url = rawUrl;
			try {
				const urlObj = new URL(rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl);
				const uddg = urlObj.searchParams.get('uddg');
				if (uddg) url = decodeURIComponent(uddg);
			} catch { /* keep original */ }

			const snippetMatch = snippetRegex.exec(block);
			const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';
			const title = stripTags(rawTitle);

			if (!title || !url) continue;

			results.push({ title, url, snippet });
		}

		// If regex approach found nothing (DDG changed their markup), try a simpler extraction
		if (results.length === 0) {
			return this._parseDDGSimple(html, numResults);
		}

		return results;
	}

	/**
	 * Simpler fallback parser: find all result__a links.
	 */
	private _parseDDGSimple(html: string, numResults: number): WebSearchResult[] {
		const results: WebSearchResult[] = [];
		const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
		const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

		let m: RegExpExecArray | null;
		while ((m = linkRegex.exec(html)) !== null && results.length < numResults) {
			const rawUrl = m[1];
			const rawTitle = m[2];

			let url = rawUrl;
			try {
				const urlObj = new URL(rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl);
				const uddg = urlObj.searchParams.get('uddg');
				if (uddg) url = decodeURIComponent(uddg);
			} catch { /* keep original */ }

			const title = stripTags(rawTitle);
			if (!title || !url) continue;

			results.push({ title, url, snippet: '' });
		}

		return results;
	}

	/**
	 * If DDG is unreachable, return a result that instructs the agent to
	 * tell the user to search manually.
	 */
	private _fallbackResults(query: string): WebSearchResult[] {
		return [{
			title: 'Web search unavailable',
			url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
			snippet: `Could not fetch web results automatically. The user can search manually: https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
		}];
	}
}

registerSingleton(IWebSearchService, WebSearchService, InstantiationType.Delayed);
