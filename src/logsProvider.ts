import * as vscode from 'vscode';
import { ApiClient } from './apiClient';
import { LogEntry } from './types';

const LOG_LEVEL_PREFIX: Record<string, string> = {
    error: '错误',
    warn: '警告',
    info: '信息',
    debug: '调试',
};

const LOG_LEVEL_ICON: Record<string, string> = {
    error: 'error',
    warn: 'warning',
    info: 'info',
    debug: 'debug',
};

export class LogItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly level: string,
        public readonly message: string,
        public readonly timestamp: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = message;
        this.description = new Date(timestamp).toLocaleString();
        this.iconPath = new vscode.ThemeIcon(LOG_LEVEL_ICON[level] ?? 'circle-outline');
        this.contextValue = 'logItem';
    }
}

export class LogGroupItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly level: string,
        public readonly count: number,
        public readonly logs: LogEntry[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon(LOG_LEVEL_ICON[level] ?? 'circle-outline');
        this.description = `${count} 条`;
        this.contextValue = 'logGroup';
    }
}

export class LogsProvider implements vscode.TreeDataProvider<LogItem | LogGroupItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<LogItem | LogGroupItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private logs: LogEntry[] = [];
    private grouped = true;

    constructor(private apiClient: ApiClient) {
        this.refresh();
    }

    async refresh(): Promise<void> {
        this.logs = await this.apiClient.getLogs();
        this._onDidChangeTreeData.fire();
    }

    setGrouped(grouped: boolean): void {
        this.grouped = grouped;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: LogItem | LogGroupItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: LogItem | LogGroupItem): (LogItem | LogGroupItem)[] {
        if (element instanceof LogGroupItem) {
            return this.buildLogItems(element.logs);
        }

        if (element instanceof LogItem) {
            return [];
        }

        if (this.logs.length === 0) {
            return [];
        }

        const sorted = [...this.logs].sort((a, b) => b.timestamp - a.timestamp);

        if (this.grouped) {
            return this.buildGroupItems(sorted);
        }

        return this.buildLogItems(sorted);
    }

    private buildGroupItems(logs: LogEntry[]): LogGroupItem[] {
        const groups: Record<string, LogEntry[]> = {};
        const order = ['error', 'warn', 'info', 'debug'];

        for (const log of logs) {
            const key = log.level;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(log);
        }

        return order
            .filter(level => groups[level]?.length)
            .map(level => {
                const prefix = LOG_LEVEL_PREFIX[level] ?? level;
                return new LogGroupItem(
                    `${prefix} (${groups[level].length})`,
                    level,
                    groups[level].length,
                    groups[level]
                );
            });
    }

    private buildLogItems(logs: LogEntry[]): LogItem[] {
        return logs.map(log => {
            const prefix = LOG_LEVEL_PREFIX[log.level] ?? '';
            const label = prefix
                ? `${prefix}: ${this.truncateMessage(log.message)}`
                : this.truncateMessage(log.message);

            return new LogItem(
                label,
                log.level,
                log.message,
                log.timestamp,
                vscode.TreeItemCollapsibleState.None
            );
        });
    }

    private truncateMessage(message: string, maxLength: number = 80): string {
        if (!message) {
            return '';
        }
        return message.length <= maxLength ? message : message.substring(0, maxLength) + '...';
    }
}
