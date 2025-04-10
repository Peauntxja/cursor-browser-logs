import * as vscode from 'vscode';
import { ApiClient } from './apiClient';

/**
 * 分析条目类，用于树视图显示
 */
export class AnalysisItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: string,
        public readonly value: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly children?: AnalysisItem[]
    ) {
        super(label, collapsibleState);
        
        // 设置工具提示
        this.tooltip = label;
        
        // 设置图标
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
                break;
            case 'stat':
                this.iconPath = new vscode.ThemeIcon('graph');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        
        // 设置上下文值，用于条件显示菜单项
        this.contextValue = 'analysisItem';
        
        // 如果是建议，添加命令
        if (type === 'suggestion') {
            this.command = {
                title: '应用建议',
                command: 'cursor-browser-logs.applySuggestion',
                arguments: [value]
            };
        }
    }
}

/**
 * 分析提供者类，用于在VS Code中显示日志分析结果
 */
export class AnalysisProvider implements vscode.TreeDataProvider<AnalysisItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AnalysisItem | undefined | null | void> = new vscode.EventEmitter<AnalysisItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AnalysisItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private analysis: any = null;
    private rootItems: AnalysisItem[] = [];
    
    constructor(private apiClient: ApiClient) {
        // 初始化时加载分析结果
        this.refresh();
    }
    
    refresh(): void {
        // 触发视图更新
        this._onDidChangeTreeData.fire();
        
        // 清空现有项
        this.rootItems = [];
        
        // 从API服务器获取最新分析结果
        this.apiClient.getAnalysis().then(analysis => {
            this.analysis = analysis;
            if (analysis) {
                this.buildTree();
            }
        });
    }
    
    getTreeItem(element: AnalysisItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: AnalysisItem): AnalysisItem[] {
        if (element) {
            // 返回子节点
            return element.children || [];
        } else {
            // 返回根节点
            if (this.rootItems.length === 0 && this.analysis) {
                this.buildTree();
            }
            return this.rootItems;
        }
    }
    
    /**
     * 构建分析结果树
     */
    private buildTree(): void {
        if (!this.analysis) {
            this.rootItems = [
                new AnalysisItem(
                    '没有分析结果数据',
                    'info',
                    null,
                    vscode.TreeItemCollapsibleState.None
                )
            ];
            return;
        }
        
        // 添加摘要
        if (this.analysis.summary) {
            this.rootItems.push(
                new AnalysisItem(
                    `摘要: ${this.analysis.summary}`,
                    'summary',
                    this.analysis.summary,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        
        // 添加统计信息
        const statsChildren: AnalysisItem[] = [];
        if (this.analysis.errorCount !== undefined) {
            statsChildren.push(
                new AnalysisItem(
                    `错误: ${this.analysis.errorCount}`,
                    'error',
                    this.analysis.errorCount,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        if (this.analysis.warningCount !== undefined) {
            statsChildren.push(
                new AnalysisItem(
                    `警告: ${this.analysis.warningCount}`,
                    'warning',
                    this.analysis.warningCount,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        if (this.analysis.infoCount !== undefined) {
            statsChildren.push(
                new AnalysisItem(
                    `信息: ${this.analysis.infoCount}`,
                    'info',
                    this.analysis.infoCount,
                    vscode.TreeItemCollapsibleState.None
                )
            );
        }
        
        if (statsChildren.length > 0) {
            this.rootItems.push(
                new AnalysisItem(
                    '统计信息',
                    'stat',
                    null,
                    vscode.TreeItemCollapsibleState.Expanded,
                    statsChildren
                )
            );
        }
        
        // 添加错误类型分布
        if (this.analysis.errorTypes) {
            const errorTypesChildren: AnalysisItem[] = [];
            
            for (const type in this.analysis.errorTypes) {
                if (this.analysis.errorTypes[type] > 0) {
                    errorTypesChildren.push(
                        new AnalysisItem(
                            `${this.getErrorTypeName(type)}: ${this.analysis.errorTypes[type]}`,
                            'error',
                            { type, count: this.analysis.errorTypes[type] },
                            vscode.TreeItemCollapsibleState.None
                        )
                    );
                }
            }
            
            if (errorTypesChildren.length > 0) {
                this.rootItems.push(
                    new AnalysisItem(
                        '错误类型分布',
                        'error',
                        null,
                        vscode.TreeItemCollapsibleState.Expanded,
                        errorTypesChildren
                    )
                );
            }
        }
        
        // 添加关键错误
        if (this.analysis.criticalErrors && this.analysis.criticalErrors.length > 0) {
            const criticalErrorsChildren: AnalysisItem[] = [];
            
            for (const error of this.analysis.criticalErrors) {
                criticalErrorsChildren.push(
                    new AnalysisItem(
                        `${error.message} (出现${error.occurrences}次)`,
                        'error',
                        error,
                        vscode.TreeItemCollapsibleState.None
                    )
                );
            }
            
            this.rootItems.push(
                new AnalysisItem(
                    '关键错误',
                    'error',
                    null,
                    vscode.TreeItemCollapsibleState.Expanded,
                    criticalErrorsChildren
                )
            );
        }
        
        // 添加修改建议
        if (this.analysis.suggestions && this.analysis.suggestions.length > 0) {
            const suggestionsChildren: AnalysisItem[] = [];
            
            for (const suggestion of this.analysis.suggestions) {
                suggestionsChildren.push(
                    new AnalysisItem(
                        suggestion,
                        'suggestion',
                        suggestion,
                        vscode.TreeItemCollapsibleState.None
                    )
                );
            }
            
            this.rootItems.push(
                new AnalysisItem(
                    '修改建议',
                    'suggestion',
                    null,
                    vscode.TreeItemCollapsibleState.Expanded,
                    suggestionsChildren
                )
            );
        }
    }
    
    /**
     * 获取错误类型的中文名称
     */
    private getErrorTypeName(type: string): string {
        const typeMap: { [key: string]: string } = {
            'type-error': '类型错误',
            'reference-error': '引用错误',
            'syntax-error': '语法错误',
            'network-error': '网络错误',
            'promise-error': 'Promise错误',
            'dom-error': 'DOM错误',
            'unknown-error': '未知错误'
        };
        
        return typeMap[type] || '未知错误';
    }
} 