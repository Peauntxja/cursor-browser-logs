import * as vscode from 'vscode';
import fetch, { Response } from 'node-fetch';
import { LogEntry, AnalysisResult } from './types';

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiClient {
    private apiUrl: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        this.apiUrl = config.get<string>('apiServer', 'http://localhost:3001');
    }

    async getLogs(): Promise<LogEntry[]> {
        try {
            const data = await this.fetchJson<{ success: boolean; logs: LogEntry[] }>(`${this.apiUrl}/api/logs`);
            return data?.success && Array.isArray(data.logs) ? data.logs : [];
        } catch (error) {
            console.error('获取日志失败:', error);
            return [];
        }
    }

    async getAnalysis(): Promise<AnalysisResult | null> {
        try {
            const data = await this.fetchJson<{ success: boolean; analysis: AnalysisResult | null }>(`${this.apiUrl}/api/analysis`);
            return data?.success ? data.analysis ?? null : null;
        } catch (error) {
            console.error('获取分析结果失败:', error);
            return null;
        }
    }

    async clearLogs(): Promise<boolean> {
        try {
            const data = await this.fetchJson<{ success: boolean }>(`${this.apiUrl}/api/logs`, { method: 'DELETE' });
            return data?.success === true;
        } catch (error) {
            console.error('清除日志失败:', error);
            vscode.window.showErrorMessage(`清除日志失败: ${(error as Error).message}`);
            return false;
        }
    }

    setApiUrl(url: string): void {
        if (!url?.trim()) {
            return;
        }
        this.apiUrl = url;
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        config.update('apiServer', url, vscode.ConfigurationTarget.Global);
    }

    private async fetchJson<T>(url: string, init?: { method?: string }): Promise<T | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response: Response = await fetch(url, {
                ...init,
                signal: controller.signal as any,
            });
            return (await response.json()) as T;
        } finally {
            clearTimeout(timer);
        }
    }
}
