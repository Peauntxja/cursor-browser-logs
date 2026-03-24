import * as vscode from 'vscode';
import { LogsProvider } from './logsProvider';
import { AnalysisProvider } from './analysisProvider';
import { LogsAnalyzer } from './logsAnalyzer';
import { ApiClient } from './apiClient';
import { ServerManager } from './server';
import { Configurator } from './configurator';
import { BrowserConnectionConfig } from './browser-connector';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Browser Logs 扩展已激活');

    const configurator = new Configurator(context);
    const serverManager = new ServerManager();

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'cursor-browser-logs.configure';
    updateStatusBar(false);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const configureCommand = vscode.commands.registerCommand('cursor-browser-logs.configure', async () => {
        const config = await configurator.getBrowserConfig();
        if (config) {
            const ok = await startServerWithConfig(serverManager, config);
            if (ok) {
                updateStatusBar(true, config.browserType);
            }
        }
    });

    const clearConfigCommand = vscode.commands.registerCommand('cursor-browser-logs.clearConfig', () => {
        configurator.clearSavedConfig();
        updateStatusBar(false);
    });

    const applySuggestionCommand = vscode.commands.registerCommand(
        'cursor-browser-logs.applySuggestion',
        async (suggestion: string) => {
            if (!suggestion) {
                return;
            }
            await vscode.env.clipboard.writeText(suggestion);
            vscode.window.showInformationMessage('建议已复制到剪贴板');
        }
    );

    context.subscriptions.push(configureCommand, clearConfigCommand, applySuggestionCommand);

    startExtension(context, serverManager, configurator);
}

function updateStatusBar(connected: boolean, browserType?: string): void {
    if (connected) {
        statusBarItem.text = `$(check) Browser Logs: ${browserType ?? 'Connected'}`;
        statusBarItem.tooltip = '浏览器日志 - 已连接（点击重新配置）';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(debug-disconnect) Browser Logs';
        statusBarItem.tooltip = '浏览器日志 - 未连接（点击配置）';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

async function startServerWithConfig(serverManager: ServerManager, config: BrowserConnectionConfig): Promise<boolean> {
    try {
        const port = await serverManager.start(config.debugPort);
        if (port <= 0) {
            vscode.window.showErrorMessage('无法启动日志服务器');
            return false;
        }

        const connected = await serverManager.connectToBrowser(config);
        if (!connected) {
            vscode.window.showErrorMessage(`无法连接到 ${config.browserType} 浏览器`);
            return false;
        }

        vscode.window.showInformationMessage(`成功连接到 ${config.browserType} 浏览器，监控 ${config.targetUrl}`);
        return true;
    } catch (error) {
        vscode.window.showErrorMessage(`启动服务时出错: ${(error as Error).message}`);
        return false;
    }
}

async function startExtension(
    context: vscode.ExtensionContext,
    serverManager: ServerManager,
    configurator: Configurator
) {
    try {
        const config = await configurator.getBrowserConfig();
        if (!config) {
            vscode.window.showInformationMessage(
                '请使用 "Cursor Browser Logs: 配置浏览器连接" 命令来配置浏览器连接',
                '配置'
            ).then(selection => {
                if (selection === '配置') {
                    vscode.commands.executeCommand('cursor-browser-logs.configure');
                }
            });
            return;
        }

        const started = await startServerWithConfig(serverManager, config);
        if (!started) {
            return;
        }

        updateStatusBar(true, config.browserType);

        const serverUrl = serverManager.getServerUrl();
        const apiClient = new ApiClient();
        apiClient.setApiUrl(serverUrl);

        const logsProvider = new LogsProvider(apiClient);
        vscode.window.registerTreeDataProvider('browserLogs', logsProvider);

        const analysisProvider = new AnalysisProvider(apiClient);
        vscode.window.registerTreeDataProvider('logAnalysis', analysisProvider);

        const logsAnalyzer = new LogsAnalyzer(apiClient);

        const showLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.showLogs', () => {
            logsProvider.refresh();
        });

        const analyzeLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.analyzeLogs', async () => {
            const result = await logsAnalyzer.analyze();
            if (result) {
                analysisProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志分析完成');
            } else {
                vscode.window.showErrorMessage('分析浏览器日志时出错');
            }
        });

        const clearLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.clearLogs', async () => {
            const result = await apiClient.clearLogs();
            if (result) {
                logsProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志已清除');
            } else {
                vscode.window.showErrorMessage('清除浏览器日志时出错');
            }
        });

        const generateFixCommand = vscode.commands.registerCommand('cursor-browser-logs.generateFix', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的文件');
                return;
            }

            const { document } = editor;
            const suggestions = await logsAnalyzer.generateFix(document.fileName, document.getText());
            if (suggestions?.length) {
                const doc = await vscode.workspace.openTextDocument({
                    content: suggestions.join('\n\n'),
                    language: 'markdown',
                });
                await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
            } else {
                vscode.window.showInformationMessage('没有找到相关的修复建议');
            }
        });

        context.subscriptions.push(showLogsCommand, analyzeLogsCommand, clearLogsCommand, generateFixCommand);

        const vscodeConfig = vscode.workspace.getConfiguration('cursorBrowserLogs');
        const refreshInterval = Math.max(vscodeConfig.get<number>('refreshInterval', 10000), 1000);
        const intervalId = setInterval(() => logsProvider.refresh(), refreshInterval);

        context.subscriptions.push({ dispose: () => clearInterval(intervalId) });
    } catch (error) {
        vscode.window.showErrorMessage(`启动扩展时出错: ${(error as Error).message}`);
    }

    context.subscriptions.push({
        dispose: async () => {
            await serverManager.stop();
        },
    });
}

export function deactivate() {
    console.log('Cursor Browser Logs 扩展已停用');
}
