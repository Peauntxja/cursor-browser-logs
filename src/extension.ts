import * as vscode from 'vscode';
import { LogsProvider } from './logsProvider';
import { AnalysisProvider } from './analysisProvider';
import { LogsAnalyzer } from './logsAnalyzer';
import { ApiClient } from './apiClient';
import { ServerManager } from './server';
import { Configurator } from './configurator';
import { BrowserType, BrowserConnectionConfig } from './browser-connector';

// 扩展激活时调用
export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Browser Logs 扩展已激活');

    // 创建配置器
    const configurator = new Configurator(context);

    // 创建服务器管理器
    const serverManager = new ServerManager();
    
    // 注册配置命令
    let configureCommand = vscode.commands.registerCommand('cursor-browser-logs.configure', async () => {
        const config = await configurator.showConfigPanel();
        if (config) {
            startServerWithConfig(serverManager, config);
        }
    });
    
    // 注册清除配置命令
    let clearConfigCommand = vscode.commands.registerCommand('cursor-browser-logs.clearConfig', () => {
        configurator.clearSavedConfig();
    });
    
    // 将命令添加到上下文中
    context.subscriptions.push(configureCommand, clearConfigCommand);

    // 启动流程
    startExtension(context, serverManager, configurator);
}

// 使用配置启动服务器
async function startServerWithConfig(serverManager: ServerManager, config: BrowserConnectionConfig): Promise<boolean> {
    try {
        // 启动服务器
        const port = await serverManager.start(config.debugPort);
        if (port <= 0) {
            vscode.window.showErrorMessage('无法启动日志服务器');
            return false;
        }
        
        // 连接到浏览器
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

// 启动扩展的主流程
async function startExtension(context: vscode.ExtensionContext, serverManager: ServerManager, configurator: Configurator) {
    try {
        // 获取浏览器配置
        const config = await configurator.getBrowserConfig();
        if (!config) {
            // 用户取消了配置，提示手动配置
            vscode.window.showInformationMessage('请使用 "Cursor Browser Logs: 配置浏览器连接" 命令来配置浏览器连接', '配置').then(selection => {
                if (selection === '配置') {
                    vscode.commands.executeCommand('cursor-browser-logs.configure');
                }
            });
            return;
        }
        
        // 启动服务器并连接浏览器
        const started = await startServerWithConfig(serverManager, config);
        if (!started) {
            return;
        }
        
        // 获取服务器URL
        const serverUrl = serverManager.getServerUrl();
        
        // 创建API客户端
        const apiClient = new ApiClient();
        apiClient.setApiUrl(serverUrl);
        
        // 创建日志提供者
        const logsProvider = new LogsProvider(apiClient);
        vscode.window.registerTreeDataProvider('browserLogs', logsProvider);

        // 创建分析提供者
        const analysisProvider = new AnalysisProvider(apiClient);
        vscode.window.registerTreeDataProvider('logAnalysis', analysisProvider);
        
        // 创建日志分析器
        const logsAnalyzer = new LogsAnalyzer(apiClient);

        // 注册命令: 查看浏览器日志
        let showLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.showLogs', () => {
            logsProvider.refresh();
            vscode.window.showInformationMessage('浏览器日志已刷新');
        });

        // 注册命令: 分析浏览器日志
        let analyzeLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.analyzeLogs', async () => {
            const result = await logsAnalyzer.analyze();
            if (result) {
                analysisProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志分析完成');
            } else {
                vscode.window.showErrorMessage('分析浏览器日志时出错');
            }
        });

        // 注册命令: 清除日志
        let clearLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.clearLogs', async () => {
            const result = await apiClient.clearLogs();
            if (result) {
                logsProvider.refresh();
                vscode.window.showInformationMessage('浏览器日志已清除');
            } else {
                vscode.window.showErrorMessage('清除浏览器日志时出错');
            }
        });

        // 注册命令: 生成修复建议
        let generateFixCommand = vscode.commands.registerCommand('cursor-browser-logs.generateFix', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有打开的文件');
                return;
            }

            const document = editor.document;
            const fileName = document.fileName;
            const fileContent = document.getText();

            // 根据日志分析结果生成修复建议
            const suggestions = await logsAnalyzer.generateFix(fileName, fileContent);
            if (suggestions && suggestions.length > 0) {
                // 创建一个新的文档，用于显示修复建议
                const doc = await vscode.workspace.openTextDocument({
                    content: suggestions.join('\n\n'),
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
            } else {
                vscode.window.showInformationMessage('没有找到相关的修复建议');
            }
        });

        // 添加到上下文中，以便在扩展停止时释放资源
        context.subscriptions.push(
            showLogsCommand,
            analyzeLogsCommand,
            clearLogsCommand,
            generateFixCommand
        );

        // 启动自动刷新
        const vscodeConfig = vscode.workspace.getConfiguration('cursorBrowserLogs');
        const refreshInterval = vscodeConfig.get<number>('refreshInterval', 10000);
        const intervalId = setInterval(() => {
            logsProvider.refresh();
        }, refreshInterval);

        // 注册一个销毁函数，在扩展被禁用时清理
        context.subscriptions.push({
            dispose: () => {
                clearInterval(intervalId);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`启动扩展时出错: ${(error as Error).message}`);
    }
    
    // 将服务器管理器添加到上下文中，确保扩展停用时服务器会被正确关闭
    context.subscriptions.push({
        dispose: async () => {
            await serverManager.stop();
        }
    });
}

// 扩展停用时调用
export function deactivate() {
    console.log('Cursor Browser Logs 扩展已停用');
}