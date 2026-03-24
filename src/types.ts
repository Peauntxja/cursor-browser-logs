export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type ErrorType =
    | 'type-error'
    | 'reference-error'
    | 'syntax-error'
    | 'network-error'
    | 'promise-error'
    | 'dom-error'
    | 'unknown-error';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface LogEntry {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: number;
    source?: string;
    stackTrace?: string;
    data?: unknown;
    browser?: string;
}

export interface AnalysisIssue {
    id: string;
    severity: Severity;
    message: string;
    relatedLogs: string[];
    suggestedFix?: string;
}

export interface AnalysisResult {
    timestamp: number;
    summary: string;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    errorTypes: Record<string, number>;
    suggestions: string[];
    criticalErrors: CriticalError[];
    issues?: AnalysisIssue[];
}

export interface CriticalError {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: number;
    source?: string;
    errorType: ErrorType;
    occurrences: number;
    suggestion: string;
    criticalReason: string;
}

export interface ErrorFileMapping {
    errorType: ErrorType;
    errorMessage: string;
    fileName: string;
    lineHint?: number;
    suggestion: string;
    confidence: number;
}

export const LOG_LEVELS: LogLevel[] = ['info', 'warn', 'error', 'debug'];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
    'type-error': '类型错误',
    'reference-error': '引用错误',
    'syntax-error': '语法错误',
    'network-error': '网络错误',
    'promise-error': 'Promise错误',
    'dom-error': 'DOM错误',
    'unknown-error': '未知错误',
};

export const ERROR_TYPE_PATTERNS: Record<Exclude<ErrorType, 'unknown-error'>, RegExp> = {
    'type-error': /TypeError|类型错误|is not a function|is not an object|Cannot read property|不是一个函数|不是对象|无法读取属性/i,
    'reference-error': /ReferenceError|引用错误|is not defined|未定义|is undefined|is null|为null|为undefined/i,
    'syntax-error': /SyntaxError|语法错误|Unexpected token|Unexpected identifier|Invalid or unexpected token|缺少标识符|意外的标识符/i,
    'network-error': /网络请求 失败|Failed to fetch|Network Error|网络错误|404|500|403|CORS|跨域|拒绝访问/i,
    'promise-error': /未处理的Promise拒绝|Uncaught \(in promise\)|Promise|async|await|then|catch|rejection/i,
    'dom-error': /DOM|Element|找不到元素|找不到节点|document|querySelector|getElementById|not found|selector|选择器|标签|元素|节点/i,
};

export const ERROR_TYPE_SUGGESTIONS: Record<ErrorType, string> = {
    'type-error': '检查变量类型是否正确，确保在调用方法前对象已被正确初始化。',
    'reference-error': '确保变量在使用前已经被声明和初始化，检查变量名拼写是否正确。',
    'syntax-error': '检查代码语法，可能存在括号不匹配、缺少分号或逗号等语法错误。',
    'network-error': '检查API地址是否正确，服务器是否正常运行，或是否存在跨域问题。',
    'promise-error': '确保所有Promise都有适当的错误处理（使用catch或try/catch）。',
    'dom-error': '检查DOM元素选择器，确保在DOM加载完成后再操作元素。',
    'unknown-error': '检查代码逻辑和数据流，确保所有边界情况都已处理。',
};

export const LANGUAGE_EXT_MAP: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.vue': 'vue',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
};

/**
 * 根据错误消息识别错误类型
 */
export function identifyErrorType(message: string): ErrorType {
    for (const [type, pattern] of Object.entries(ERROR_TYPE_PATTERNS)) {
        if (pattern.test(message)) {
            return type as ErrorType;
        }
    }
    return 'unknown-error';
}

/**
 * 初始化一个空的错误类型计数器
 */
export function createErrorTypeCounter(): Record<ErrorType, number> {
    return {
        'type-error': 0,
        'reference-error': 0,
        'syntax-error': 0,
        'network-error': 0,
        'promise-error': 0,
        'dom-error': 0,
        'unknown-error': 0,
    };
}
