import * as vscode from 'vscode';
import { ApiClient } from './apiClient';
import { AnalysisResult, ErrorType, ERROR_TYPE_LABELS } from './types';

export class AnalysisItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: string,
        public readonly value: unknown,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly children?: AnalysisItem[]
    ) {
        super(label, collapsibleState);
        this.tooltip = label;
        this.contextValue = 'analysisItem';

        switch (type) {
            case 'summary':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error');
                break;
            case 'warning':
                this.iconPath = new vscode.ThemeIcon('warning');
                break;
            case 'suggestion':
                this.iconPath = new vscode.ThemeIcon('lightbulb');
                this.command = {
                    title: '应用建议',
                    command: 'cursor-browser-logs.applySuggestion',
                    arguments: [value]
                };
                break;
            case 'stat':
                this.iconPath = new vscode.ThemeIcon('graph');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class AnalysisProvider implements vscode.TreeDataProvider<AnalysisItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AnalysisItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private analysis: AnalysisResult | null = null;
    private rootItems: AnalysisItem[] = [];

    constructor(private apiClient: ApiClient) {
        this.refresh();
    }

    async refresh(): Promise<void> {
        this.rootItems = [];
        this.analysis = await this.apiClient.getAnalysis();
        if (this.analysis) {
            this.buildTree();
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AnalysisItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AnalysisItem): AnalysisItem[] {
        if (element) {
            return element.children ?? [];
        }
        if (this.rootItems.length === 0 && this.analysis) {
            this.buildTree();
        }
        return this.rootItems;
    }

    private buildTree(): void {
        if (!this.analysis) {
            return;
        }

        if (this.analysis.summary) {
            this.rootItems.push(new AnalysisItem(
                `摘要: ${this.analysis.summary}`,
                'summary',
                this.analysis.summary,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        const statsChildren: AnalysisItem[] = [];
        if (this.analysis.errorCount !== undefined) {
            statsChildren.push(new AnalysisItem(`错误: ${this.analysis.errorCount}`, 'error', this.analysis.errorCount, vscode.TreeItemCollapsibleState.None));
        }
        if (this.analysis.warningCount !== undefined) {
            statsChildren.push(new AnalysisItem(`警告: ${this.analysis.warningCount}`, 'warning', this.analysis.warningCount, vscode.TreeItemCollapsibleState.None));
        }
        if (this.analysis.infoCount !== undefined) {
            statsChildren.push(new AnalysisItem(`信息: ${this.analysis.infoCount}`, 'info', this.analysis.infoCount, vscode.TreeItemCollapsibleState.None));
        }
        if (statsChildren.length > 0) {
            this.rootItems.push(new AnalysisItem('统计信息', 'stat', null, vscode.TreeItemCollapsibleState.Expanded, statsChildren));
        }

        if (this.analysis.errorTypes) {
            const errorTypesChildren: AnalysisItem[] = [];
            for (const [type, count] of Object.entries(this.analysis.errorTypes)) {
                if (count > 0) {
                    const label = ERROR_TYPE_LABELS[type as ErrorType] ?? type;
                    errorTypesChildren.push(new AnalysisItem(
                        `${label}: ${count}`,
                        'error',
                        { type, count },
                        vscode.TreeItemCollapsibleState.None
                    ));
                }
            }
            if (errorTypesChildren.length > 0) {
                this.rootItems.push(new AnalysisItem('错误类型分布', 'error', null, vscode.TreeItemCollapsibleState.Expanded, errorTypesChildren));
            }
        }

        if (this.analysis.criticalErrors?.length) {
            const criticalErrorsChildren = this.analysis.criticalErrors.map(error =>
                new AnalysisItem(
                    `${error.message} (出现${error.occurrences}次)`,
                    'error',
                    error,
                    vscode.TreeItemCollapsibleState.None
                )
            );
            this.rootItems.push(new AnalysisItem('关键错误', 'error', null, vscode.TreeItemCollapsibleState.Expanded, criticalErrorsChildren));
        }

        if (this.analysis.suggestions?.length) {
            const suggestionsChildren = this.analysis.suggestions.map(s =>
                new AnalysisItem(s, 'suggestion', s, vscode.TreeItemCollapsibleState.None)
            );
            this.rootItems.push(new AnalysisItem('修改建议', 'suggestion', null, vscode.TreeItemCollapsibleState.Expanded, suggestionsChildren));
        }
    }
}
