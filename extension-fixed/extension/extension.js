"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const logsProvider_1 = require("./logsProvider");
const analysisProvider_1 = require("./analysisProvider");
const logsAnalyzer_1 = require("./logsAnalyzer");
const apiClient_1 = require("./apiClient");
// 扩展激活时调用
function activate(context) {
    console.log('Cursor Browser Logs 扩展已激活');
    // 创建API客户端
    const apiClient = new apiClient_1.ApiClient();
    // 创建日志提供者
    const logsProvider = new logsProvider_1.LogsProvider(apiClient);
    vscode.window.registerTreeDataProvider('browserLogs', logsProvider);
    // 创建分析提供者
    const analysisProvider = new analysisProvider_1.AnalysisProvider(apiClient);
    vscode.window.registerTreeDataProvider('logAnalysis', analysisProvider);
    // 创建日志分析器
    const logsAnalyzer = new logsAnalyzer_1.LogsAnalyzer(apiClient);
    // 注册命令: 查看浏览器日志
    let showLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.showLogs', () => {
        logsProvider.refresh();
        vscode.window.showInformationMessage('浏览器日志已刷新');
    });
    // 注册命令: 分析浏览器日志
    let analyzeLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.analyzeLogs', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield logsAnalyzer.analyze();
        if (result) {
            analysisProvider.refresh();
            vscode.window.showInformationMessage('浏览器日志分析完成');
        }
        else {
            vscode.window.showErrorMessage('分析浏览器日志时出错');
        }
    }));
    // 注册命令: 清除日志
    let clearLogsCommand = vscode.commands.registerCommand('cursor-browser-logs.clearLogs', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield apiClient.clearLogs();
        if (result) {
            logsProvider.refresh();
            vscode.window.showInformationMessage('浏览器日志已清除');
        }
        else {
            vscode.window.showErrorMessage('清除浏览器日志时出错');
        }
    }));
    // 注册命令: 生成修复建议
    let generateFixCommand = vscode.commands.registerCommand('cursor-browser-logs.generateFix', () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的文件');
            return;
        }
        const document = editor.document;
        const fileName = document.fileName;
        const fileContent = document.getText();
        // 根据日志分析结果生成修复建议
        const suggestions = yield logsAnalyzer.generateFix(fileName, fileContent);
        if (suggestions && suggestions.length > 0) {
            // 创建一个新的文档，用于显示修复建议
            const doc = yield vscode.workspace.openTextDocument({
                content: suggestions.join('\n\n'),
                language: 'markdown'
            });
            yield vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        }
        else {
            vscode.window.showInformationMessage('没有找到相关的修复建议');
        }
    }));
    // 添加到上下文中，以便在扩展停止时释放资源
    context.subscriptions.push(showLogsCommand, analyzeLogsCommand, clearLogsCommand, generateFixCommand);
    // 启动自动刷新
    const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
    const refreshInterval = config.get('refreshInterval', 10000);
    setInterval(() => {
        logsProvider.refresh();
    }, refreshInterval);
}
exports.activate = activate;
// 扩展停用时调用
function deactivate() {
    console.log('Cursor Browser Logs 扩展已停用');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map