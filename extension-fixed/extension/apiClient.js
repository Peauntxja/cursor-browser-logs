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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const vscode = __importStar(require("vscode"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * API客户端，用于与浏览器日志API服务器通信
 */
class ApiClient {
    constructor() {
        // 从配置中获取API服务器地址
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        this.apiUrl = config.get('apiServer', 'http://localhost:3001');
    }
    /**
     * 获取所有日志
     */
    getLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, node_fetch_1.default)(`${this.apiUrl}/api/logs`);
                const data = yield response.json();
                if (data.success && Array.isArray(data.logs)) {
                    return data.logs;
                }
                return [];
            }
            catch (error) {
                console.error('获取日志失败:', error);
                vscode.window.showErrorMessage(`获取日志失败: ${error.message}`);
                return [];
            }
        });
    }
    /**
     * 获取分析结果
     */
    getAnalysis() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, node_fetch_1.default)(`${this.apiUrl}/api/analysis`);
                const data = yield response.json();
                if (data.success && data.analysis) {
                    return data.analysis;
                }
                return null;
            }
            catch (error) {
                console.error('获取分析结果失败:', error);
                vscode.window.showErrorMessage(`获取分析结果失败: ${error.message}`);
                return null;
            }
        });
    }
    /**
     * 清除日志
     */
    clearLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, node_fetch_1.default)(`${this.apiUrl}/api/logs`, {
                    method: 'DELETE'
                });
                const data = yield response.json();
                return data.success === true;
            }
            catch (error) {
                console.error('清除日志失败:', error);
                vscode.window.showErrorMessage(`清除日志失败: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * 设置API服务器地址
     */
    setApiUrl(url) {
        if (url && url.trim() !== '') {
            this.apiUrl = url;
            // 更新配置
            const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
            config.update('apiServer', url, vscode.ConfigurationTarget.Global);
        }
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=apiClient.js.map