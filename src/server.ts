import * as express from "express";
import * as http from "http";
import cors from "cors";
import * as vscode from "vscode";
import { BrowserConnector, BrowserType, BrowserConnectionConfig } from "./browser-connector";

/**
 * 日志条目接口
 */
interface LogEntry {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp: number;
    source?: string;
    stackTrace?: string;
    data?: any;
    browser?: string;
}

/**
 * 日志分析结果接口
 */
interface AnalysisResult {
    timestamp: number;
    summary: string;
    issues: Array<{
        id: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        relatedLogs: string[];
        suggestedFix?: string;
    }>;
}

/**
 * 服务器管理器 - 负责创建和管理API服务器
 */
export class ServerManager {
    private app: express.Application;
    private server: http.Server | null = null;
    private port: number = 0;
    private logs: LogEntry[] = [];
    private analysis: AnalysisResult | null = null;
    private browserConnector: BrowserConnector | null = null;

    constructor() {
        this.app = express.default();
        this.configureMiddleware();
        this.configureRoutes();
    }

    /**
     * 配置中间件
     */
    private configureMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
    }

    /**
     * 配置API路由
     */
    private configureRoutes() {
        // 获取日志API
        this.app.get('/api/logs', (req, res) => {
            res.json({
                success: true,
                logs: this.logs
            });
        });

        // 清除日志API
        this.app.delete('/api/logs', (req, res) => {
            this.logs = [];
            res.json({
                success: true,
                message: '所有日志已清除'
            });
        });

        // 获取分析结果API
        this.app.get('/api/analysis', (req, res) => {
            res.json({
                success: true,
                analysis: this.analysis
            });
        });

        // 接收新日志API
        this.app.post('/api/logs', (req, res) => {
            const newLogs = req.body.logs;
            if (Array.isArray(newLogs)) {
                newLogs.forEach(log => {
                    if (this.isValidLogEntry(log)) {
                        this.logs.push(log);
                    }
                });
                res.json({
                    success: true,
                    message: `${newLogs.length} 条日志已添加`
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '无效的日志数据'
                });
            }
        });

        // 健康检查API
        this.app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                status: 'running',
                browserConnected: this.browserConnector?.getStatus().connected || false
            });
        });
    }

    /**
     * 验证日志条目格式
     */
    private isValidLogEntry(log: any): boolean {
        return (
            log &&
            typeof log.id === 'string' &&
            ['info', 'warn', 'error', 'debug'].includes(log.level) &&
            typeof log.message === 'string' &&
            typeof log.timestamp === 'number'
        );
    }

    /**
     * 启动服务器
     * @returns 服务器端口号，如果启动失败则返回0
     */
    public async start(preferredPort: number = 0): Promise<number> {
        if (this.server) {
            return this.port; // 服务器已经启动
        }

        try {
            // 如果指定了端口，尝试使用该端口
            if (preferredPort > 0) {
                try {
                    this.port = await this.startOnPort(preferredPort);
                    return this.port;
                } catch (error) {
                    console.warn(`无法在端口 ${preferredPort} 上启动服务器，尝试其他端口...`);
                }
            }

            // 尝试从3001开始的端口
            for (let port = 3001; port < 3010; port++) {
                try {
                    this.port = await this.startOnPort(port);
                    return this.port;
                } catch (error) {
                    console.warn(`无法在端口 ${port} 上启动服务器，尝试下一个端口...`);
                }
            }

            // 所有尝试都失败
            vscode.window.showErrorMessage('无法启动日志服务器，所有尝试的端口都已被占用');
            return 0;
        } catch (error) {
            vscode.window.showErrorMessage(`启动服务器时出错: ${(error as Error).message}`);
            console.error('[Cursor Browser Logs] 启动服务器失败:', error);
            return 0;
        }
    }

    /**
     * 在指定端口上启动服务器
     */
    private startOnPort(port: number): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(this.app);

            // 处理服务器错误
            this.server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`端口 ${port} 已被占用`));
                } else {
                    reject(error);
                }
            });

            // 启动服务器
            this.server.listen(port, () => {
                console.log(`[Cursor Browser Logs] 服务器已启动，监听端口 ${port}`);
                resolve(port);
            });
        });
    }

    /**
     * 停止服务器
     */
    public async stop(): Promise<void> {
        // 断开浏览器连接
        if (this.browserConnector) {
            this.browserConnector.disconnect();
            this.browserConnector = null;
        }

        // 关闭服务器
        if (this.server) {
            return new Promise((resolve) => {
                this.server!.close(() => {
                    console.log('[Cursor Browser Logs] 服务器已停止');
                    this.server = null;
                    this.port = 0;
                    resolve();
                });
            });
        }
    }

    /**
     * 连接到浏览器
     * @param config 浏览器连接配置
     */
    public async connectToBrowser(config: BrowserConnectionConfig): Promise<boolean> {
        try {
            // 断开现有连接
            if (this.browserConnector) {
                this.browserConnector.disconnect();
            }

            // 创建新的浏览器连接器
            this.browserConnector = new BrowserConnector(config);
            
            // 设置日志回调
            this.browserConnector.setLogCallback((log: LogEntry) => {
                this.logs.push(log);
                console.log(`[Cursor Browser Logs] 收到新日志: ${log.level} - ${log.message}`);
            });

            // 连接到浏览器
            const connected = await this.browserConnector.connect();
            if (connected) {
                vscode.window.showInformationMessage(`已成功连接到 ${config.browserType} 浏览器，监控 ${config.targetUrl}`);
                return true;
            } else {
                vscode.window.showErrorMessage(`无法连接到 ${config.browserType} 浏览器`);
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`连接浏览器失败: ${(error as Error).message}`);
            console.error('[Cursor Browser Logs] 连接浏览器失败:', error);
            return false;
        }
    }

    /**
     * 获取浏览器连接状态
     */
    public getBrowserConnectionStatus() {
        return this.browserConnector?.getStatus() || { connected: false, browserType: BrowserType.Other, targetUrl: '' };
    }

    /**
     * 分析日志
     */
    public analyzeLogData(): AnalysisResult | null {
        // 这里是简化的分析逻辑
        if (this.logs.length === 0) {
            return null;
        }

        const errorLogs = this.logs.filter(log => log.level === 'error');
        const warningLogs = this.logs.filter(log => log.level === 'warn');
        
        const issues = [];
        
        // 处理错误日志
        for (const log of errorLogs) {
            issues.push({
                id: `issue_${log.id}`,
                severity: 'high' as 'high' | 'medium' | 'low' | 'critical',
                message: `发现错误: ${log.message}`,
                relatedLogs: [log.id],
                suggestedFix: `检查 ${log.source || '未知源'} 的错误处理`
            });
        }
        
        // 处理警告日志
        for (const log of warningLogs) {
            issues.push({
                id: `issue_${log.id}`,
                severity: 'medium' as 'high' | 'medium' | 'low' | 'critical',
                message: `发现警告: ${log.message}`,
                relatedLogs: [log.id]
            });
        }
        
        // 创建分析结果
        this.analysis = {
            timestamp: Date.now(),
            summary: `分析了 ${this.logs.length} 条日志，发现 ${errorLogs.length} 个错误和 ${warningLogs.length} 个警告`,
            issues: issues
        };
        
        return this.analysis;
    }

    /**
     * 获取当前服务器地址
     */
    public getServerUrl(): string {
        if (!this.server || this.port === 0) {
            return '';
        }
        return `http://localhost:${this.port}`;
    }
}