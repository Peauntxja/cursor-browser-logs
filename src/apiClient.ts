import * as vscode from 'vscode';
import fetch from 'node-fetch';

/**
 * API客户端，用于与浏览器日志API服务器通信
 */
export class ApiClient {
    private apiUrl: string;

    constructor() {
        // 从配置中获取API服务器地址
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        this.apiUrl = config.get<string>('apiServer', 'http://localhost:3001');
    }

    /**
     * 获取所有日志
     */
    async getLogs(): Promise<any[]> {
        try {
            const response = await fetch(`${this.apiUrl}/api/logs`);
            const data = await response.json() as any;
            
            if (data.success && Array.isArray(data.logs)) {
                return data.logs;
            }
            return [];
        } catch (error) {
            console.error('获取日志失败:', error);
            vscode.window.showErrorMessage(`获取日志失败: ${(error as Error).message}`);
            return [];
        }
    }

    /**
     * 获取分析结果
     */
    async getAnalysis(): Promise<any | null> {
        try {
            const response = await fetch(`${this.apiUrl}/api/analysis`);
            const data = await response.json() as any;
            
            if (data.success && data.analysis) {
                return data.analysis;
            }
            return null;
        } catch (error) {
            console.error('获取分析结果失败:', error);
            vscode.window.showErrorMessage(`获取分析结果失败: ${(error as Error).message}`);
            return null;
        }
    }

    /**
     * 清除日志
     */
    async clearLogs(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/api/logs`, {
                method: 'DELETE'
            });
            const data = await response.json() as any;
            
            return data.success === true;
        } catch (error) {
            console.error('清除日志失败:', error);
            vscode.window.showErrorMessage(`清除日志失败: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * 设置API服务器地址
     */
    setApiUrl(url: string) {
        if (url && url.trim() !== '') {
            this.apiUrl = url;
            
            // 更新配置
            const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
            config.update('apiServer', url, vscode.ConfigurationTarget.Global);
        }
    }
} 