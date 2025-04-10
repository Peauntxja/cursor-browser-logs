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
exports.LogsProvider = exports.LogItem = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 日志条目类，用于树视图显示
 */
class LogItem extends vscode.TreeItem {
    constructor(label, level, message, timestamp, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.level = level;
        this.message = message;
        this.timestamp = timestamp;
        this.collapsibleState = collapsibleState;
        // 设置工具提示
        this.tooltip = message;
        // 设置描述
        this.description = new Date(timestamp).toLocaleString();
        // 设置图标
        switch (level) {
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case 'warn':
                this.iconPath = new vscode.ThemeIcon('warning');
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
            case 'debug':
                this.iconPath = new vscode.ThemeIcon('debug');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        // 设置上下文值，用于条件显示菜单项
        this.contextValue = 'logItem';
    }
}
exports.LogItem = LogItem;
/**
 * 日志提供者类，用于在VS Code中显示日志
 */
class LogsProvider {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.logs = [];
        // 初始化时加载日志
        this.refresh();
    }
    refresh() {
        // 触发视图更新
        this._onDidChangeTreeData.fire();
        // 从API服务器获取最新日志
        this.apiClient.getLogs().then(logs => {
            this.logs = logs;
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (element) {
                // 子节点处理逻辑（如果需要）
                return [];
            }
            else {
                // 根节点，显示所有日志
                if (this.logs.length === 0) {
                    // 如果没有日志，再次尝试从服务器获取
                    this.logs = yield this.apiClient.getLogs();
                }
                if (this.logs.length === 0) {
                    vscode.window.showInformationMessage('没有浏览器日志数据');
                    return [];
                }
                // 对日志进行排序：按时间戳降序排列
                const sortedLogs = [...this.logs].sort((a, b) => b.timestamp - a.timestamp);
                // 转换为树视图项
                return sortedLogs.map((log, index) => {
                    // 创建标签
                    let label;
                    // 根据日志级别设置不同的前缀
                    switch (log.level) {
                        case 'error':
                            label = `错误: ${this.truncateMessage(log.message)}`;
                            break;
                        case 'warn':
                            label = `警告: ${this.truncateMessage(log.message)}`;
                            break;
                        case 'info':
                            label = `信息: ${this.truncateMessage(log.message)}`;
                            break;
                        case 'debug':
                            label = `调试: ${this.truncateMessage(log.message)}`;
                            break;
                        default:
                            label = this.truncateMessage(log.message);
                    }
                    return new LogItem(label, log.level, log.message, log.timestamp, vscode.TreeItemCollapsibleState.None);
                });
            }
        });
    }
    /**
     * 截断消息文本，防止过长
     */
    truncateMessage(message, maxLength = 80) {
        if (!message)
            return '';
        if (message.length <= maxLength)
            return message;
        return message.substring(0, maxLength) + '...';
    }
}
exports.LogsProvider = LogsProvider;
//# sourceMappingURL=logsProvider.js.map