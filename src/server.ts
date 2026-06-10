import * as express from 'express';
import * as http from 'http';
import cors from 'cors';
import * as vscode from 'vscode';
import { BrowserConnector, BrowserType, BrowserConnectionConfig } from './browser-connector';
import { LogEntry, AnalysisResult, Severity } from './types';

interface ServerAnalysisIssue {
    id: string;
    severity: Severity;
    message: string;
    relatedLogs: string[];
    suggestedFix?: string;
}

export class ServerManager {
    private static readonly DEFAULT_MAX_LOGS = 5000;

    private app: express.Application;
    private server: http.Server | null = null;
    private port: number = 0;
    private logs: LogEntry[] = [];
    private analysis: AnalysisResult | null = null;
    private browserConnector: BrowserConnector | null = null;
    private maxLogs: number;

    constructor() {
        this.app = express.default();
        this.maxLogs = vscode.workspace
            .getConfiguration('cursorBrowserLogs')
            .get<number>('maxLogs', ServerManager.DEFAULT_MAX_LOGS);
        this.configureMiddleware();
        this.configureRoutes();
    }

    private configureMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
    }

    private configureRoutes() {
        this.app.get('/api/logs', (_req, res) => {
            res.json({ success: true, logs: this.logs });
        });

        this.app.delete('/api/logs', (_req, res) => {
            this.logs = [];
            res.json({ success: true, message: '所有日志已清除' });
        });

        this.app.get('/api/analysis', (_req, res) => {
            res.json({ success: true, analysis: this.analysis });
        });

        this.app.post('/api/logs', (req, res) => {
            const newLogs = req.body.logs;
            if (!Array.isArray(newLogs)) {
                res.status(400).json({ success: false, message: '无效的日志数据' });
                return;
            }
            for (const log of newLogs) {
                if (this.isValidLogEntry(log)) {
                    this.addLog(log);
                }
            }
            res.json({ success: true, message: `${newLogs.length} 条日志已添加` });
        });

        this.app.get('/api/health', (_req, res) => {
            res.json({
                success: true,
                status: 'running',
                browserConnected: this.browserConnector?.getStatus().connected ?? false,
            });
        });
    }

    private addLog(log: LogEntry): void {
        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    private isValidLogEntry(log: unknown): log is LogEntry {
        if (!log || typeof log !== 'object') {
            return false;
        }
        const entry = log as Record<string, unknown>;
        return (
            typeof entry.id === 'string' &&
            typeof entry.message === 'string' &&
            typeof entry.timestamp === 'number' &&
            ['info', 'warn', 'error', 'debug'].includes(entry.level as string)
        );
    }

    public async start(preferredPort: number = 0): Promise<number> {
        if (this.server) {
            return this.port;
        }

        try {
            if (preferredPort > 0) {
                try {
                    this.port = await this.startOnPort(preferredPort);
                    return this.port;
                } catch {
                    console.warn(`无法在端口 ${preferredPort} 上启动服务器，尝试其他端口...`);
                }
            }

            for (let port = 3001; port < 3010; port++) {
                try {
                    this.port = await this.startOnPort(port);
                    return this.port;
                } catch {
                    console.warn(`无法在端口 ${port} 上启动服务器，尝试下一个端口...`);
                }
            }

            vscode.window.showErrorMessage('无法启动日志服务器，所有尝试的端口都已被占用');
            return 0;
        } catch (error) {
            vscode.window.showErrorMessage(`启动服务器时出错: ${(error as Error).message}`);
            return 0;
        }
    }

    private startOnPort(port: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = http.createServer(this.app);

            server.on('error', (error: NodeJS.ErrnoException) => {
                server.close();
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`端口 ${port} 已被占用`));
                } else {
                    reject(error);
                }
            });

            server.listen(port, () => {
                this.server = server;
                console.log(`[Cursor Browser Logs] 服务器已启动，监听端口 ${port}`);
                resolve(port);
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.browserConnector) {
            this.browserConnector.disconnect();
            this.browserConnector = null;
        }

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

    public async connectToBrowser(config: BrowserConnectionConfig): Promise<boolean> {
        if (this.browserConnector) {
            this.browserConnector.disconnect();
        }

        this.browserConnector = new BrowserConnector(config);

        this.browserConnector.setLogCallback((log: LogEntry) => {
            this.addLog(log);
            console.log(`[Cursor Browser Logs] 收到新日志: ${log.level} - ${log.message}`);
        });

        return this.browserConnector.connect();
    }

    public getBrowserConnectionStatus() {
        return this.browserConnector?.getStatus() ?? {
            connected: false,
            browserType: BrowserType.Other,
            targetUrl: '',
        };
    }

    public analyzeLogData(): AnalysisResult | null {
        if (this.logs.length === 0) {
            return null;
        }

        const errorLogs = this.logs.filter(log => log.level === 'error');
        const warningLogs = this.logs.filter(log => log.level === 'warn');

        const issues: ServerAnalysisIssue[] = [];

        for (const log of errorLogs) {
            issues.push({
                id: `issue_${log.id}`,
                severity: 'high',
                message: `发现错误: ${log.message}`,
                relatedLogs: [log.id],
                suggestedFix: `检查 ${log.source ?? '未知源'} 的错误处理`,
            });
        }

        for (const log of warningLogs) {
            issues.push({
                id: `issue_${log.id}`,
                severity: 'medium',
                message: `发现警告: ${log.message}`,
                relatedLogs: [log.id],
            });
        }

        this.analysis = {
            timestamp: Date.now(),
            summary: `分析了 ${this.logs.length} 条日志，发现 ${errorLogs.length} 个错误和 ${warningLogs.length} 个警告`,
            errorCount: errorLogs.length,
            warningCount: warningLogs.length,
            infoCount: this.logs.filter(l => l.level === 'info').length,
            errorTypes: {},
            suggestions: [],
            criticalErrors: [],
            issues,
        };

        return this.analysis;
    }

    public getServerUrl(): string {
        if (!this.server || this.port === 0) {
            return '';
        }
        return `http://localhost:${this.port}`;
    }
}
