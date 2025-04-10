import * as vscode from 'vscode';
import { LogsProvider } from './logsProvider';
import { AnalysisProvider } from './analysisProvider';
import { LogsAnalyzer } from './logsAnalyzer';
import { ApiClient } from './apiClient';

// 扩展激活时调用
export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Browser Logs 扩展已激活');

    // 创建API客户端
    const apiClient = new ApiClient();
    
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
    const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
    const refreshInterval = config.get<number>('refreshInterval', 10000);
    setInterval(() => {
        logsProvider.refresh();
    }, refreshInterval);
}

// 扩展停用时调用
export function deactivate() {
    console.log('Cursor Browser Logs 扩展已停用');
} 