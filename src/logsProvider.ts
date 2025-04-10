import * as vscode from 'vscode';
import { ApiClient } from './apiClient';

/**
 * 日志条目类，用于树视图显示
 */
export class LogItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly level: string,
        public readonly message: string,
        public readonly timestamp: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
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

/**
 * 日志提供者类，用于在VS Code中显示日志
 */
export class LogsProvider implements vscode.TreeDataProvider<LogItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<LogItem | undefined | null | void> = new vscode.EventEmitter<LogItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LogItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private logs: any[] = [];
    
    constructor(private apiClient: ApiClient) {
        // 初始化时加载日志
        this.refresh();
    }
    
    refresh(): void {
        // 触发视图更新
        this._onDidChangeTreeData.fire();
        
        // 从API服务器获取最新日志
        this.apiClient.getLogs().then(logs => {
            this.logs = logs;
        });
    }
    
    getTreeItem(element: LogItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: LogItem): Promise<LogItem[]> {
        if (element) {
            // 子节点处理逻辑（如果需要）
            return [];
        } else {
            // 根节点，显示所有日志
            if (this.logs.length === 0) {
                // 如果没有日志，再次尝试从服务器获取
                this.logs = await this.apiClient.getLogs();
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
                let label: string;
                
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
                
                return new LogItem(
                    label,
                    log.level,
                    log.message,
                    log.timestamp,
                    vscode.TreeItemCollapsibleState.None
                );
            });
        }
    }
    
    /**
     * 截断消息文本，防止过长
     */
    private truncateMessage(message: string, maxLength: number = 80): string {
        if (!message) return '';
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }
} 