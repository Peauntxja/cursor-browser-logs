import * as path from 'path';
import * as vscode from 'vscode';
import { ApiClient } from './apiClient';
import {
    AnalysisResult,
    CriticalError,
    ErrorFileMapping,
    ErrorType,
    LANGUAGE_EXT_MAP,
    LogEntry,
    ERROR_TYPE_LABELS,
    ERROR_TYPE_SUGGESTIONS,
    createErrorTypeCounter,
    identifyErrorType,
} from './types';

export class LogsAnalyzer {
    private analysisCache: AnalysisResult | null = null;

    constructor(private apiClient: ApiClient) {}

    async analyze(): Promise<boolean> {
        try {
            const logs = await this.apiClient.getLogs();
            if (!logs || logs.length === 0) {
                vscode.window.showInformationMessage('没有日志数据可供分析');
                return false;
            }

            const errorLogs = logs.filter(l => l.level === 'error');
            const warningLogs = logs.filter(l => l.level === 'warn');
            const infoLogs = logs.filter(l => l.level === 'info');

            this.analysisCache = {
                timestamp: Date.now(),
                summary: this.generateSummary(errorLogs.length, warningLogs.length, logs.length),
                errorCount: errorLogs.length,
                warningCount: warningLogs.length,
                infoCount: infoLogs.length,
                errorTypes: this.analyzeErrorTypes(errorLogs),
                suggestions: this.generateSuggestions(errorLogs, warningLogs),
                criticalErrors: this.identifyCriticalErrors(errorLogs),
            };

            return true;
        } catch (error) {
            console.error('分析日志失败:', error);
            vscode.window.showErrorMessage(`分析日志失败: ${(error as Error).message}`);
            return false;
        }
    }

    async generateFix(fileName: string, fileContent: string): Promise<string[]> {
        if (!this.analysisCache) {
            const analyzed = await this.analyze();
            if (!analyzed) {
                return ['无法分析日志，请先使用"Cursor Browser Logs: 分析浏览器日志"命令'];
            }
        }

        const fileExt = path.extname(fileName).toLowerCase();
        const relatedErrors = this.findRelatedErrors(fileName, fileContent);

        if (relatedErrors.length === 0) {
            return ['没有找到与当前文件相关的错误'];
        }

        const suggestions: string[] = [];
        suggestions.push(`# ${path.basename(fileName)} 的修复建议\n`);
        suggestions.push('基于浏览器日志分析，发现以下可能与此文件相关的问题：\n');

        relatedErrors.sort((a, b) => b.confidence - a.confidence);

        for (const error of relatedErrors) {
            suggestions.push(`## ${error.errorMessage}`);
            suggestions.push(`**错误类型**: ${ERROR_TYPE_LABELS[error.errorType] ?? '未知错误'}`);
            if (error.lineHint !== undefined) {
                suggestions.push(`**可能位置**: 第 ${error.lineHint} 行附近`);
            }
            suggestions.push(`**修复建议**: ${error.suggestion}`);
            suggestions.push(`**可信度**: ${Math.round(error.confidence * 100)}%\n`);

            const fixSuggestion = this.generateCodeFix(error, fileContent, fileExt);
            if (fixSuggestion) {
                suggestions.push('### 代码修复示例:\n');
                suggestions.push('```' + (LANGUAGE_EXT_MAP[fileExt] ?? ''));
                suggestions.push(fixSuggestion);
                suggestions.push('```\n');
            }
        }

        return suggestions;
    }

    private generateSummary(errorCount: number, warningCount: number, totalCount: number): string {
        if (errorCount === 0 && warningCount === 0) {
            return `代码运行正常，共${totalCount}条日志，无错误和警告。`;
        }
        if (errorCount > 0) {
            return `发现${errorCount}个错误和${warningCount}个警告，建议检查代码。`;
        }
        return `代码运行基本正常，有${warningCount}个警告需要关注。`;
    }

    private analyzeErrorTypes(errorLogs: LogEntry[]): Record<string, number> {
        const counter = createErrorTypeCounter();

        for (const log of errorLogs) {
            const type = identifyErrorType(log.message ?? '');
            counter[type]++;
        }

        return counter;
    }

    private generateSuggestions(errorLogs: LogEntry[], warningLogs: LogEntry[]): string[] {
        const suggestions: string[] = [];

        if (errorLogs.length === 0 && warningLogs.length === 0) {
            suggestions.push('代码运行正常，未发现错误或警告。');
            return suggestions;
        }

        if (errorLogs.length > 0) {
            suggestions.push(`发现 ${errorLogs.length} 个错误，建议优先修复。`);

            const errorTypes = createErrorTypeCounter();
            for (const log of errorLogs) {
                errorTypes[identifyErrorType(log.message ?? '')]++;
            }

            for (const [type, count] of Object.entries(errorTypes)) {
                if (count > 0) {
                    const label = ERROR_TYPE_LABELS[type as ErrorType] ?? '未知错误';
                    const suggestion = ERROR_TYPE_SUGGESTIONS[type as ErrorType] ?? '';
                    suggestions.push(`${label}(${count}个): ${suggestion}`);
                }
            }
        }

        if (warningLogs.length > 0) {
            suggestions.push(`发现 ${warningLogs.length} 个警告，建议关注并处理。`);

            const deprecationWarnings = warningLogs.filter(log =>
                (log.message ?? '').includes('deprecated') || (log.message ?? '').includes('弃用')
            );
            if (deprecationWarnings.length > 0) {
                suggestions.push(`有 ${deprecationWarnings.length} 个关于弃用API的警告，建议更新到较新的API版本。`);
            }
        }

        return suggestions;
    }

    private identifyCriticalErrors(errorLogs: LogEntry[]): CriticalError[] {
        if (errorLogs.length === 0) {
            return [];
        }

        const errorMsgCount: Record<string, number> = {};
        for (const log of errorLogs) {
            const msg = log.message ?? '';
            errorMsgCount[msg] = (errorMsgCount[msg] ?? 0) + 1;
        }

        const criticalErrors: CriticalError[] = [];

        for (const msg in errorMsgCount) {
            if (errorMsgCount[msg] >= 3) {
                const log = errorLogs.find(e => e.message === msg);
                if (log) {
                    const errorType = identifyErrorType(msg);
                    criticalErrors.push({
                        ...log,
                        errorType,
                        occurrences: errorMsgCount[msg],
                        suggestion: ERROR_TYPE_SUGGESTIONS[errorType],
                        criticalReason: '频繁出现的错误',
                    });
                }
            }
        }

        if (criticalErrors.length === 0 && errorLogs.length > 0) {
            const recentErrors = [...errorLogs]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 3);

            for (const log of recentErrors) {
                const errorType = identifyErrorType(log.message ?? '');
                criticalErrors.push({
                    ...log,
                    errorType,
                    occurrences: errorMsgCount[log.message ?? ''] ?? 1,
                    suggestion: ERROR_TYPE_SUGGESTIONS[errorType],
                    criticalReason: '最近发生的错误',
                });
            }
        }

        return criticalErrors;
    }

    private findRelatedErrors(fileName: string, fileContent: string): ErrorFileMapping[] {
        if (!this.analysisCache) {
            return [];
        }

        const result: ErrorFileMapping[] = [];
        const baseName = path.basename(fileName);
        const analyzedErrors = this.analysisCache.criticalErrors ?? [];

        for (const error of analyzedErrors) {
            const errorMsg = error.message ?? '';
            const errorType = error.errorType ?? identifyErrorType(errorMsg);

            let confidence = 0;
            let lineHint: number | undefined;

            if (errorMsg.includes(baseName)) {
                confidence = 0.9;
                const lineMatch = errorMsg.match(/line\s+(\d+)/i) ?? errorMsg.match(/:(\d+):/);
                if (lineMatch?.[1]) {
                    lineHint = parseInt(lineMatch[1], 10);
                }
            } else {
                confidence = this.calculateErrorFileRelation(errorType, errorMsg, fileContent);
            }

            if (confidence > 0.3) {
                result.push({
                    errorType,
                    errorMessage: errorMsg,
                    fileName,
                    lineHint,
                    suggestion: error.suggestion ?? ERROR_TYPE_SUGGESTIONS[errorType],
                    confidence,
                });
            }
        }

        return result;
    }

    private calculateErrorFileRelation(errorType: ErrorType, errorMsg: string, fileContent: string): number {
        switch (errorType) {
            case 'type-error': {
                const match = errorMsg.match(/(?:Cannot read property|cannot read|is not a function|is not an object|属性|不是一个函数|不是对象).*['"]([^'"]+)['"]/i);
                if (match?.[1] && fileContent.includes(match[1])) {
                    return 0.7;
                }
                return 0;
            }
            case 'reference-error': {
                const match = errorMsg.match(/(?:is not defined|未定义).*['"]([^'"]+)['"]/i);
                if (match?.[1] && fileContent.includes(match[1])) {
                    return 0.8;
                }
                return 0;
            }
            case 'syntax-error':
                return 0.6;
            case 'network-error': {
                const urlMatch = errorMsg.match(/https?:\/\/[^ ]+/);
                if (urlMatch?.[0]) {
                    const url = urlMatch[0];
                    if (fileContent.includes(url) || this.checkUrlPatternInContent(url, fileContent)) {
                        return 0.7;
                    }
                }
                return 0;
            }
            default:
                return 0.2;
        }
    }

    private checkUrlPatternInContent(url: string, content: string): boolean {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            let matches = 0;
            for (const part of pathParts) {
                if (part.length > 2 && content.includes(part)) {
                    matches++;
                }
            }
            return matches >= 2 || (pathParts.length === 1 && matches === 1);
        } catch {
            return false;
        }
    }

    private generateCodeFix(error: ErrorFileMapping, fileContent: string, _fileExt: string): string | null {
        switch (error.errorType) {
            case 'type-error':
                return this.generateTypeErrorFix(error);
            case 'reference-error':
                return this.generateReferenceErrorFix(error);
            case 'syntax-error':
                return this.generateSyntaxErrorFix();
            case 'network-error':
                return this.generateNetworkErrorFix(error);
            default:
                return null;
        }
    }

    private generateTypeErrorFix(error: ErrorFileMapping): string | null {
        const match = error.errorMessage.match(/(?:Cannot read property|cannot read|is not a function|is not an object|属性|不是一个函数|不是对象).*['"]([^'"]+)['"]/i);
        if (!match?.[1]) {
            return null;
        }

        const identifier = match[1];
        const isProperty = error.errorMessage.includes('Cannot read property') || error.errorMessage.includes('cannot read');

        if (isProperty) {
            return `// 在访问属性前检查对象是否存在
if (obj?.${identifier}) {
    const value = obj.${identifier};
} else {
    console.log('属性 ${identifier} 不存在或其所属对象为空');
}`;
        }

        return `// 在调用函数前检查它是否是一个函数
if (typeof ${identifier} === 'function') {
    ${identifier}();
} else {
    console.log('${identifier} 不是一个函数');
}`;
    }

    private generateReferenceErrorFix(error: ErrorFileMapping): string | null {
        const match = error.errorMessage.match(/(?:is not defined|未定义).*['"]([^'"]+)['"]/i);
        if (!match?.[1]) {
            return null;
        }

        const identifier = match[1];
        return `// 确保变量在使用前已定义
let ${identifier};

if (typeof ${identifier} !== 'undefined') {
    console.log(${identifier});
} else {
    console.log('变量 ${identifier} 未定义');
}`;
    }

    private generateSyntaxErrorFix(): string {
        return `// 语法错误通常需要手动修复
// 请检查以下常见问题:
// 1. 括号、引号或大括号是否匹配
// 2. 是否缺少分号或逗号
// 3. 关键字使用是否正确
// 4. 对象和数组语法是否正确`;
    }

    private generateNetworkErrorFix(error: ErrorFileMapping): string | null {
        const urlMatch = error.errorMessage.match(/https?:\/\/[^ ]+/);
        if (!urlMatch) {
            return null;
        }

        const url = urlMatch[0];
        return `// 处理网络请求错误
fetch('${url}')
  .then(response => {
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return response.json();
  })
  .then(data => {
    console.log('请求成功:', data);
  })
  .catch(error => {
    console.error('请求失败:', error);
  });`;
    }
}
