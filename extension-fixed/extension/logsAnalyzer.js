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
exports.LogsAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * 日志分析器类，用于分析日志并生成修复建议
 */
class LogsAnalyzer {
    constructor(apiClient) {
        this.apiClient = apiClient;
        // 分析结果缓存
        this.analysisCache = null;
    }
    /**
     * 分析浏览器日志
     */
    analyze() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 获取最新的日志数据
                const logs = yield this.apiClient.getLogs();
                if (!logs || logs.length === 0) {
                    vscode.window.showInformationMessage('没有日志数据可供分析');
                    return false;
                }
                // 构建分析结果
                // 在实际项目中，这里会有更复杂的分析逻辑
                const analysis = {
                    timestamp: new Date().getTime(),
                    summary: this.generateSummary(logs),
                    errorCount: logs.filter(log => log.level === 'error').length,
                    warningCount: logs.filter(log => log.level === 'warn').length,
                    infoCount: logs.filter(log => log.level === 'info').length,
                    errorTypes: this.analyzeErrorTypes(logs),
                    suggestions: this.generateSuggestions(logs),
                    criticalErrors: this.identifyCriticalErrors(logs)
                };
                // 缓存分析结果
                this.analysisCache = analysis;
                // TODO: 实际项目中，这里应该发送分析结果到服务器
                // 但为了简化，我们暂时只保存在内存中
                return true;
            }
            catch (error) {
                console.error('分析日志失败:', error);
                vscode.window.showErrorMessage(`分析日志失败: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * 生成修复建议
     */
    generateFix(fileName, fileContent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.analysisCache) {
                const analyzed = yield this.analyze();
                if (!analyzed) {
                    return ['无法分析日志，请先使用"Cursor Browser Logs: 分析浏览器日志"命令'];
                }
            }
            // 获取当前文件的扩展名
            const fileExt = path.extname(fileName).toLowerCase();
            // 找出与当前文件相关的错误
            const relatedErrors = this.findRelatedErrors(fileName, fileContent);
            if (relatedErrors.length === 0) {
                return ['没有找到与当前文件相关的错误'];
            }
            // 生成修复建议
            const suggestions = [];
            suggestions.push(`# ${path.basename(fileName)} 的修复建议\n`);
            suggestions.push(`基于浏览器日志分析，发现以下可能与此文件相关的问题：\n`);
            // 按照可信度排序
            relatedErrors.sort((a, b) => b.confidence - a.confidence);
            for (const error of relatedErrors) {
                suggestions.push(`## ${error.errorMessage}`);
                suggestions.push(`**错误类型**: ${this.getErrorTypeName(error.errorType)}`);
                if (error.lineHint !== undefined) {
                    suggestions.push(`**可能位置**: 第 ${error.lineHint} 行附近`);
                }
                suggestions.push(`**修复建议**: ${error.suggestion}`);
                suggestions.push(`**可信度**: ${Math.round(error.confidence * 100)}%\n`);
                // 根据错误类型生成具体的代码修复建议
                const fixSuggestion = this.generateCodeFix(error, fileContent, fileExt);
                if (fixSuggestion) {
                    suggestions.push(`### 代码修复示例:\n`);
                    suggestions.push('```' + this.getLanguageByExt(fileExt));
                    suggestions.push(fixSuggestion);
                    suggestions.push('```\n');
                }
            }
            return suggestions;
        });
    }
    /**
     * 根据文件扩展名获取语言标识符
     */
    getLanguageByExt(ext) {
        const map = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.vue': 'vue',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less'
        };
        return map[ext] || '';
    }
    /**
     * 生成摘要信息
     */
    generateSummary(logs) {
        const errorCount = logs.filter(log => log.level === 'error').length;
        const warningCount = logs.filter(log => log.level === 'warn').length;
        if (errorCount === 0 && warningCount === 0) {
            return `代码运行正常，共${logs.length}条日志，无错误和警告。`;
        }
        else if (errorCount > 0) {
            return `发现${errorCount}个错误和${warningCount}个警告，建议检查代码。`;
        }
        else {
            return `代码运行基本正常，有${warningCount}个警告需要关注。`;
        }
    }
    /**
     * 分析错误类型
     */
    analyzeErrorTypes(logs) {
        const errorTypes = {
            'type-error': 0,
            'reference-error': 0,
            'syntax-error': 0,
            'network-error': 0,
            'promise-error': 0,
            'dom-error': 0,
            'unknown-error': 0
        };
        // 筛选出错误日志
        const errorLogs = logs.filter(log => log.level === 'error');
        for (const log of errorLogs) {
            const message = log.message || '';
            let matched = false;
            // 类型错误
            if (message.match(/TypeError|类型错误|is not a function|is not an object|Cannot read property|不是一个函数|不是对象|无法读取属性/i)) {
                errorTypes['type-error']++;
                matched = true;
            }
            // 引用错误
            if (message.match(/ReferenceError|引用错误|is not defined|未定义|is undefined|is null|为null|为undefined/i)) {
                errorTypes['reference-error']++;
                matched = true;
            }
            // 语法错误
            if (message.match(/SyntaxError|语法错误|Unexpected token|Unexpected identifier|Invalid or unexpected token|缺少标识符|意外的标识符/i)) {
                errorTypes['syntax-error']++;
                matched = true;
            }
            // 网络错误
            if (message.match(/网络请求 失败|Failed to fetch|Network Error|网络错误|404|500|403|CORS|跨域|拒绝访问/i)) {
                errorTypes['network-error']++;
                matched = true;
            }
            // Promise错误
            if (message.match(/未处理的Promise拒绝|Uncaught \(in promise\)|Promise|async|await|then|catch|rejection/i)) {
                errorTypes['promise-error']++;
                matched = true;
            }
            // DOM错误
            if (message.match(/DOM|Element|找不到元素|找不到节点|document|querySelector|getElementById|not found|selector|选择器|标签|元素|节点/i)) {
                errorTypes['dom-error']++;
                matched = true;
            }
            // 未知错误
            if (!matched) {
                errorTypes['unknown-error']++;
            }
        }
        return errorTypes;
    }
    /**
     * 生成建议
     */
    generateSuggestions(logs) {
        const suggestions = [];
        const errorLogs = logs.filter(log => log.level === 'error');
        const warningLogs = logs.filter(log => log.level === 'warn');
        // 如果没有错误和警告，返回正面评价
        if (errorLogs.length === 0 && warningLogs.length === 0) {
            suggestions.push('代码运行正常，未发现错误或警告。');
            return suggestions;
        }
        // 错误相关建议
        if (errorLogs.length > 0) {
            suggestions.push(`发现 ${errorLogs.length} 个错误，建议优先修复。`);
            // 根据错误类型添加具体建议
            const errorTypes = this.analyzeErrorTypes(logs);
            for (const type in errorTypes) {
                if (errorTypes[type] > 0) {
                    const suggestion = this.getSuggestionForErrorType(type);
                    suggestions.push(`${this.getErrorTypeName(type)}(${errorTypes[type]}个): ${suggestion}`);
                }
            }
        }
        // 警告相关建议
        if (warningLogs.length > 0) {
            suggestions.push(`发现 ${warningLogs.length} 个警告，建议关注并处理。`);
            // 检查是否存在弃用API警告
            const deprecationWarnings = warningLogs.filter(log => (log.message || '').includes('deprecated') || (log.message || '').includes('弃用'));
            if (deprecationWarnings.length > 0) {
                suggestions.push(`有 ${deprecationWarnings.length} 个关于弃用API的警告，建议更新到较新的API版本。`);
            }
        }
        return suggestions;
    }
    /**
     * 识别关键错误
     */
    identifyCriticalErrors(logs) {
        const errorLogs = logs.filter(log => log.level === 'error');
        if (errorLogs.length === 0)
            return [];
        // 错误消息去重和计数
        const errorMsgCount = {};
        for (const log of errorLogs) {
            const msg = log.message || '';
            if (!errorMsgCount[msg]) {
                errorMsgCount[msg] = 0;
            }
            errorMsgCount[msg]++;
        }
        // 找出频繁出现的错误（出现3次以上视为关键错误）
        const criticalErrors = [];
        for (const msg in errorMsgCount) {
            if (errorMsgCount[msg] >= 3) {
                const log = errorLogs.find(e => e.message === msg);
                if (log) {
                    const errorType = this.identifyErrorType(msg);
                    criticalErrors.push(Object.assign(Object.assign({}, log), { errorType, occurrences: errorMsgCount[msg], suggestion: this.getSuggestionForErrorType(errorType), criticalReason: '频繁出现的错误' }));
                }
            }
        }
        // 如果没有频繁出现的错误，取最新的几个错误作为关键错误
        if (criticalErrors.length === 0 && errorLogs.length > 0) {
            // 按时间排序，取最新的3个错误
            const recentErrors = [...errorLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
            for (const log of recentErrors) {
                const errorType = this.identifyErrorType(log.message || '');
                criticalErrors.push(Object.assign(Object.assign({}, log), { errorType, occurrences: errorMsgCount[log.message || ''] || 1, suggestion: this.getSuggestionForErrorType(errorType), criticalReason: '最近发生的错误' }));
            }
        }
        return criticalErrors;
    }
    /**
     * 找出与当前文件相关的错误
     */
    findRelatedErrors(fileName, fileContent) {
        if (!this.analysisCache)
            return [];
        const result = [];
        const baseName = path.basename(fileName);
        // 获取已分析的错误
        const analyzedErrors = this.analysisCache.criticalErrors || [];
        if (analyzedErrors.length === 0)
            return [];
        for (const error of analyzedErrors) {
            const errorMsg = error.message || '';
            const errorType = error.errorType || this.identifyErrorType(errorMsg);
            // 检查错误消息中是否包含文件名
            let confidence = 0;
            let lineHint = undefined;
            if (errorMsg.includes(baseName)) {
                // 错误消息中直接包含文件名，高度相关
                confidence = 0.9;
                // 尝试提取行号
                const lineMatch = errorMsg.match(/line\s+(\d+)/i) || errorMsg.match(/:(\d+):/);
                if (lineMatch && lineMatch[1]) {
                    lineHint = parseInt(lineMatch[1], 10);
                }
            }
            else {
                // 根据错误类型和文件内容进行关联度分析
                confidence = this.calculateErrorFileRelation(errorType, errorMsg, fileContent);
            }
            // 如果关联度超过阈值，则认为是相关错误
            if (confidence > 0.3) {
                result.push({
                    errorType,
                    errorMessage: errorMsg,
                    fileName,
                    lineHint,
                    suggestion: error.suggestion || this.getSuggestionForErrorType(errorType),
                    confidence
                });
            }
        }
        return result;
    }
    /**
     * 计算错误与文件的关联度
     */
    calculateErrorFileRelation(errorType, errorMsg, fileContent) {
        let confidence = 0;
        switch (errorType) {
            case 'type-error':
                // 尝试从错误消息中提取变量或方法名
                const typeErrorMatch = errorMsg.match(/(?:Cannot read property|cannot read|is not a function|is not an object|属性|不是一个函数|不是对象).*['"]([^'"]+)['"]/i);
                if (typeErrorMatch && typeErrorMatch[1]) {
                    const identifier = typeErrorMatch[1];
                    if (fileContent.includes(identifier)) {
                        confidence = 0.7;
                    }
                }
                break;
            case 'reference-error':
                // 尝试从错误消息中提取未定义的变量名
                const refErrorMatch = errorMsg.match(/(?:is not defined|未定义).*['"]([^'"]+)['"]/i);
                if (refErrorMatch && refErrorMatch[1]) {
                    const identifier = refErrorMatch[1];
                    if (fileContent.includes(identifier)) {
                        confidence = 0.8;
                    }
                }
                break;
            case 'syntax-error':
                // 语法错误通常与文件相关性较高
                confidence = 0.6;
                break;
            case 'network-error':
                // 尝试从错误消息中提取URL
                const urlMatch = errorMsg.match(/https?:\/\/[^ ]+/);
                if (urlMatch && urlMatch[0]) {
                    // 检查文件中是否包含类似的URL模式
                    const url = urlMatch[0];
                    if (fileContent.includes(url) || this.checkUrlPatternInContent(url, fileContent)) {
                        confidence = 0.7;
                    }
                }
                break;
            default:
                // 其他错误类型，低关联度
                confidence = 0.2;
        }
        return confidence;
    }
    /**
     * 检查URL模式在内容中的匹配情况
     */
    checkUrlPatternInContent(url, content) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            // 检查路径的各个部分是否在内容中出现
            let matches = 0;
            for (const part of pathParts) {
                if (part.length > 2 && content.includes(part)) { // 只考虑长度大于2的部分
                    matches++;
                }
            }
            // 如果路径的多个部分都在内容中出现，则认为URL模式匹配
            return matches >= 2 || (pathParts.length === 1 && matches === 1);
        }
        catch (e) {
            return false;
        }
    }
    /**
     * 生成具体的代码修复建议
     */
    generateCodeFix(error, fileContent, fileExt) {
        switch (error.errorType) {
            case 'type-error':
                return this.generateTypeErrorFix(error, fileContent);
            case 'reference-error':
                return this.generateReferenceErrorFix(error, fileContent);
            case 'syntax-error':
                return this.generateSyntaxErrorFix(error, fileContent);
            case 'network-error':
                return this.generateNetworkErrorFix(error, fileContent);
            default:
                return null;
        }
    }
    /**
     * 生成类型错误的修复建议
     */
    generateTypeErrorFix(error, fileContent) {
        const typeErrorMatch = error.errorMessage.match(/(?:Cannot read property|cannot read|is not a function|is not an object|属性|不是一个函数|不是对象).*['"]([^'"]+)['"]/i);
        if (!typeErrorMatch || !typeErrorMatch[1])
            return null;
        const identifier = typeErrorMatch[1];
        const isProperty = error.errorMessage.includes('Cannot read property') || error.errorMessage.includes('cannot read');
        if (isProperty) {
            // 属性访问错误
            return `// 在访问属性前检查对象是否存在
if (obj && obj.${identifier}) {
    // 安全地访问 obj.${identifier}
    const value = obj.${identifier};
    // ...
} else {
    // 处理属性不存在的情况
    console.log('属性 ${identifier} 不存在或其所属对象为空');
}`;
        }
        else {
            // 函数调用错误
            return `// 在调用函数前检查它是否是一个函数
if (typeof ${identifier} === 'function') {
    // 安全地调用函数
    ${identifier}();
} else {
    // 处理函数不存在的情况
    console.log('${identifier} 不是一个函数');
}`;
        }
    }
    /**
     * 生成引用错误的修复建议
     */
    generateReferenceErrorFix(error, fileContent) {
        const refErrorMatch = error.errorMessage.match(/(?:is not defined|未定义).*['"]([^'"]+)['"]/i);
        if (!refErrorMatch || !refErrorMatch[1])
            return null;
        const identifier = refErrorMatch[1];
        return `// 确保变量在使用前已定义
let ${identifier}; // 根据实际需要定义变量

// 或者在使用前检查变量是否存在
if (typeof ${identifier} !== 'undefined') {
    // 安全地使用变量
    console.log(${identifier});
} else {
    // 处理变量未定义的情况
    console.log('变量 ${identifier} 未定义');
}`;
    }
    /**
     * 生成语法错误的修复建议
     */
    generateSyntaxErrorFix(error, fileContent) {
        // 语法错误一般很难自动生成修复建议，只提供一些通用建议
        return `// 语法错误通常需要手动修复
// 请检查以下常见问题:
// 1. 括号、引号或大括号是否匹配
// 2. 是否缺少分号或逗号
// 3. 关键字使用是否正确
// 4. 对象和数组语法是否正确`;
    }
    /**
     * 生成网络错误的修复建议
     */
    generateNetworkErrorFix(error, fileContent) {
        const urlMatch = error.errorMessage.match(/https?:\/\/[^ ]+/);
        if (!urlMatch)
            return null;
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
    // 处理错误情况，例如显示友好的错误消息给用户
    showErrorToUser('无法加载数据，请稍后再试');
  });

// 显示错误给用户的辅助函数
function showErrorToUser(message) {
  // 实现错误显示逻辑
}`;
    }
    /**
     * 识别错误类型
     */
    identifyErrorType(message) {
        // 类型错误
        if (message.match(/TypeError|类型错误|is not a function|is not an object|Cannot read property|不是一个函数|不是对象|无法读取属性/i)) {
            return 'type-error';
        }
        // 引用错误
        if (message.match(/ReferenceError|引用错误|is not defined|未定义|is undefined|is null|为null|为undefined/i)) {
            return 'reference-error';
        }
        // 语法错误
        if (message.match(/SyntaxError|语法错误|Unexpected token|Unexpected identifier|Invalid or unexpected token|缺少标识符|意外的标识符/i)) {
            return 'syntax-error';
        }
        // 网络错误
        if (message.match(/网络请求 失败|Failed to fetch|Network Error|网络错误|404|500|403|CORS|跨域|拒绝访问/i)) {
            return 'network-error';
        }
        // Promise错误
        if (message.match(/未处理的Promise拒绝|Uncaught \(in promise\)|Promise|async|await|then|catch|rejection/i)) {
            return 'promise-error';
        }
        // DOM错误
        if (message.match(/DOM|Element|找不到元素|找不到节点|document|querySelector|getElementById|not found|selector|选择器|标签|元素|节点/i)) {
            return 'dom-error';
        }
        // 默认为未知错误
        return 'unknown-error';
    }
    /**
     * 获取错误类型对应的建议
     */
    getSuggestionForErrorType(errorType) {
        // 确保错误类型是有效的
        const validatedType = ['type-error', 'reference-error', 'syntax-error', 'network-error',
            'promise-error', 'dom-error', 'unknown-error'].includes(errorType)
            ? errorType
            : 'unknown-error';
        const suggestions = {
            'type-error': '检查变量类型是否正确，确保在调用方法前对象已被正确初始化。',
            'reference-error': '确保变量在使用前已经被声明和初始化，检查变量名拼写是否正确。',
            'syntax-error': '检查代码语法，可能存在括号不匹配、缺少分号或逗号等语法错误。',
            'network-error': '检查API地址是否正确，服务器是否正常运行，或是否存在跨域问题。',
            'promise-error': '确保所有Promise都有适当的错误处理（使用catch或try/catch）。',
            'dom-error': '检查DOM元素选择器，确保在DOM加载完成后再操作元素。',
            'unknown-error': '检查代码逻辑和数据流，确保所有边界情况都已处理。'
        };
        return suggestions[validatedType];
    }
    /**
     * 获取错误类型的中文名称
     */
    getErrorTypeName(type) {
        const typeMap = {
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
exports.LogsAnalyzer = LogsAnalyzer;
//# sourceMappingURL=logsAnalyzer.js.map