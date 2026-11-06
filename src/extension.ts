import * as http from 'http';
import * as vscode from 'vscode';
import { LogsProvider } from './logsProvider';
import { AnalysisProvider } from './analysisProvider';
import { LogsAnalyzer } from './logsAnalyzer';
import { ApiClient } from './apiClient';
import { startLogServer, stopLogServer } from './logServer';

let refreshTimer: NodeJS.Timeout | undefined;
let logServer: http.Server | undefined;

export function activate(context: vscode.ExtensionContext) {
    const apiClient = new ApiClient();
    const logsProvider = new LogsProvider(apiClient);
    const logsAnalyzer = new LogsAnalyzer(apiClient);
    const analysisProvider = new AnalysisProvider(logsAnalyzer);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('browserLogs', logsProvider),
        vscode.window.registerTreeDataProvider('logAnalysis', analysisProvider)
    );

    const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
    const apiServer = config.get<string>('apiServer', 'http://localhost:3001');
    const port = portFrom(apiServer);
    logServer = startLogServer(port, (error) => {
        vscode.window.showErrorMessage(`日志服务启动失败: ${error.message}`);
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('cursor-browser-logs.showLogs', () => {
            logsProvider.refresh();
            vscode.window.showInformationMessage('浏览器日志已刷新');
        }),
        vscode.commands.registerCommand('cursor-browser-logs.analyzeLogs', async () => {
            const result = await logsAnalyzer.analyze();
            if (result) {
                analysisProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志分析完成');
            } else {
                vscode.window.showErrorMessage('分析浏览器日志时出错');
            }
        }),
        vscode.commands.registerCommand('cursor-browser-logs.clearLogs', async () => {
            const result = await apiClient.clearLogs();
            if (result) {
                logsAnalyzer.clearAnalysis();
                logsProvider.refresh();
                analysisProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志已清除');
            } else {
                vscode.window.showErrorMessage('清除浏览器日志时出错');
            }
        }),
        vscode.commands.registerCommand('cursor-browser-logs.generateFix', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的文件');
                return;
            }
            const suggestions = await logsAnalyzer.generateFix(editor.document.fileName, editor.document.getText());
            if (suggestions && suggestions.length > 0) {
                const doc = await vscode.workspace.openTextDocument({
                    content: suggestions.join('\n\n'),
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
            } else {
                vscode.window.showInformationMessage('没有找到相关的修复建议');
            }
        })
    );

    const refreshInterval = config.get<number>('refreshInterval', 10000);
    refreshTimer = setInterval(() => {
        logsProvider.refresh();
    }, refreshInterval);
}

export function deactivate() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = undefined;
    }
    stopLogServer();
    logServer = undefined;
}

function portFrom(apiServer: string): number {
    try {
        const port = Number(new URL(apiServer).port);
        return port > 0 ? port : 3001;
    } catch {
        return 3001;
    }
}
