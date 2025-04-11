import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * 浏览器类型枚举
 */
export enum BrowserType {
    Chrome = 'chrome',
    Firefox = 'firefox',
    Edge = 'edge',
    Safari = 'safari',
    Other = 'other'
}

/**
 * 浏览器连接配置接口
 */
export interface BrowserConnectionConfig {
    browserType: BrowserType;
    targetUrl: string;
    debugPort?: number;
}

/**
 * 浏览器连接状态
 */
export interface BrowserConnectionStatus {
    connected: boolean;
    browserType: BrowserType;
    targetUrl: string;
    lastConnectTime?: Date;
    errorMessage?: string;
}

/**
 * 浏览器连接器类 - 负责与浏览器通信，获取日志
 */
export class BrowserConnector {
    private config: BrowserConnectionConfig;
    private status: BrowserConnectionStatus;
    private connectionInterval: NodeJS.Timeout | null = null;
    private onLogCallback: ((log: any) => void) | null = null;

    constructor(config: BrowserConnectionConfig) {
        this.config = config;
        this.status = {
            connected: false,
            browserType: config.browserType,
            targetUrl: config.targetUrl
        };
    }

    /**
     * 启动浏览器连接
     */
    public async connect(): Promise<boolean> {
        try {
            // 停止现有连接
            if (this.connectionInterval) {
                this.disconnect();
            }
            
            // 根据浏览器类型执行不同的连接逻辑
            let connectResult = false;
            
            switch (this.config.browserType) {
                case BrowserType.Chrome:
                    connectResult = await this.connectToChrome();
                    break;
                case BrowserType.Firefox:
                    connectResult = await this.connectToFirefox();
                    break;
                case BrowserType.Edge:
                    connectResult = await this.connectToEdge();
                    break;
                case BrowserType.Safari:
                    connectResult = await this.connectToSafari();
                    break;
                default:
                    throw new Error(`不支持的浏览器类型: ${this.config.browserType}`);
            }
            
            if (connectResult) {
                this.status.connected = true;
                this.status.lastConnectTime = new Date();
                this.status.errorMessage = undefined;
                return true;
            } else {
                throw new Error('连接浏览器失败');
            }
        } catch (error) {
            this.status.connected = false;
            this.status.errorMessage = (error as Error).message;
            vscode.window.showErrorMessage(`连接浏览器失败: ${(error as Error).message}`);
            console.error('[Cursor Browser Logs] 连接浏览器失败:', error);
            return false;
        }
    }

    /**
     * 断开浏览器连接
     */
    public disconnect(): void {
        if (this.connectionInterval) {
            clearInterval(this.connectionInterval);
            this.connectionInterval = null;
        }
        this.status.connected = false;
    }

    /**
     * 获取连接状态
     */
    public getStatus(): BrowserConnectionStatus {
        return { ...this.status };
    }

    /**
     * 设置日志回调函数
     * @param callback 接收日志的回调函数
     */
    public setLogCallback(callback: (log: any) => void): void {
        this.onLogCallback = callback;
    }

    /**
     * 连接到Chrome浏览器
     * 通过Chrome DevTools Protocol收集日志
     */
    private async connectToChrome(): Promise<boolean> {
        // Chrome默认调试端口
        const debugPort = this.config.debugPort || 9222;
        
        try {
            // 首先尝试连接到Chrome调试接口
            const response = await this.httpGet(`http://localhost:${debugPort}/json/version`);
            console.log('[Cursor Browser Logs] Chrome调试信息:', response);
            
            // 获取已打开的标签页
            const tabs = await this.httpGet(`http://localhost:${debugPort}/json/list`);
            
            // 找到匹配的标签页
            const targetTab = tabs.find((tab: any) => 
                tab.url && tab.url.includes(new URL(this.config.targetUrl).hostname)
            );
            
            if (!targetTab) {
                throw new Error(`未找到匹配的标签页: ${this.config.targetUrl}`);
            }
            
            console.log('[Cursor Browser Logs] 已找到目标标签页:', targetTab.title);
            
            // 启动定时轮询获取日志
            this.startChromeLogPolling(targetTab.id, debugPort);
            
            return true;
        } catch (error) {
            console.error('[Cursor Browser Logs] 连接Chrome失败:', error);
            throw new Error(`连接Chrome失败: ${(error as Error).message}。确保Chrome已使用 --remote-debugging-port=${debugPort} 参数启动`);
        }
    }

    /**
     * 启动Chrome日志轮询
     */
    private startChromeLogPolling(tabId: string, port: number): void {
        // 设置轮询间隔，默认每秒查询一次日志
        this.connectionInterval = setInterval(async () => {
            try {
                // 这里模拟从Chrome获取日志的逻辑
                // 实际实现中，应该使用Chrome DevTools Protocol的Console Domain
                // 执行命令如 Runtime.evaluate 获取控制台日志
                
                // 模拟采集到的日志
                if (this.onLogCallback) {
                    const now = Date.now();
                    this.onLogCallback({
                        id: `chrome_log_${now}`,
                        level: this.getRandomLogLevel(),
                        message: `来自Chrome标签页 "${tabId}" 的日志消息 (${new Date().toISOString()})`,
                        timestamp: now,
                        source: `${this.config.targetUrl}`,
                        browser: 'chrome'
                    });
                }
            } catch (error) {
                console.error('[Cursor Browser Logs] 获取Chrome日志失败:', error);
            }
        }, 5000);  // 每5秒轮询一次
    }

    /**
     * 连接到Firefox浏览器
     */
    private async connectToFirefox(): Promise<boolean> {
        try {
            // Firefox Remote Debugging Protocol
            // 这里是简化的实现，实际应使用Firefox Remote Debugging Protocol
            console.log('[Cursor Browser Logs] 尝试连接到Firefox...');
            
            // 启动轮询模拟日志收集
            this.startFirefoxLogPolling();
            
            return true;
        } catch (error) {
            console.error('[Cursor Browser Logs] 连接Firefox失败:', error);
            throw new Error(`连接Firefox失败: ${(error as Error).message}。确保Firefox已开启远程调试。`);
        }
    }

    /**
     * 启动Firefox日志轮询
     */
    private startFirefoxLogPolling(): void {
        this.connectionInterval = setInterval(() => {
            try {
                if (this.onLogCallback) {
                    const now = Date.now();
                    this.onLogCallback({
                        id: `firefox_log_${now}`,
                        level: this.getRandomLogLevel(),
                        message: `来自Firefox的日志消息 (${new Date().toISOString()})`,
                        timestamp: now,
                        source: this.config.targetUrl,
                        browser: 'firefox'
                    });
                }
            } catch (error) {
                console.error('[Cursor Browser Logs] 获取Firefox日志失败:', error);
            }
        }, 5000);  // 每5秒轮询一次
    }

    /**
     * 连接到Edge浏览器
     */
    private async connectToEdge(): Promise<boolean> {
        // Edge使用与Chrome相同的DevTools Protocol
        const debugPort = this.config.debugPort || 9222;
        
        try {
            console.log('[Cursor Browser Logs] 尝试连接到Edge...');
            
            // 启动轮询模拟日志收集
            this.startEdgeLogPolling();
            
            return true;
        } catch (error) {
            console.error('[Cursor Browser Logs] 连接Edge失败:', error);
            throw new Error(`连接Edge失败: ${(error as Error).message}。确保Edge已使用 --remote-debugging-port=${debugPort} 参数启动`);
        }
    }

    /**
     * 启动Edge日志轮询
     */
    private startEdgeLogPolling(): void {
        this.connectionInterval = setInterval(() => {
            try {
                if (this.onLogCallback) {
                    const now = Date.now();
                    this.onLogCallback({
                        id: `edge_log_${now}`,
                        level: this.getRandomLogLevel(),
                        message: `来自Edge的日志消息 (${new Date().toISOString()})`,
                        timestamp: now,
                        source: this.config.targetUrl,
                        browser: 'edge'
                    });
                }
            } catch (error) {
                console.error('[Cursor Browser Logs] 获取Edge日志失败:', error);
            }
        }, 5000);  // 每5秒轮询一次
    }

    /**
     * 连接到Safari浏览器
     */
    private async connectToSafari(): Promise<boolean> {
        try {
            console.log('[Cursor Browser Logs] 尝试连接到Safari...');
            
            // 启动轮询模拟日志收集
            this.startSafariLogPolling();
            
            return true;
        } catch (error) {
            console.error('[Cursor Browser Logs] 连接Safari失败:', error);
            throw new Error(`连接Safari失败: ${(error as Error).message}。确保Safari已开启Web Inspector并允许远程自动化。`);
        }
    }

    /**
     * 启动Safari日志轮询
     */
    private startSafariLogPolling(): void {
        this.connectionInterval = setInterval(() => {
            try {
                if (this.onLogCallback) {
                    const now = Date.now();
                    this.onLogCallback({
                        id: `safari_log_${now}`,
                        level: this.getRandomLogLevel(),
                        message: `来自Safari的日志消息 (${new Date().toISOString()})`,
                        timestamp: now,
                        source: this.config.targetUrl,
                        browser: 'safari'
                    });
                }
            } catch (error) {
                console.error('[Cursor Browser Logs] 获取Safari日志失败:', error);
            }
        }, 5000);  // 每5秒轮询一次
    }

    /**
     * 辅助方法：执行HTTP GET请求
     */
    private httpGet(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            
            client.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(new Error(`解析响应失败: ${err}`));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * 辅助方法：获取随机日志级别（用于模拟）
     */
    private getRandomLogLevel(): 'info' | 'warn' | 'error' | 'debug' {
        const levels = ['info', 'warn', 'error', 'debug'];
        return levels[Math.floor(Math.random() * levels.length)] as 'info' | 'warn' | 'error' | 'debug';
    }

    /**
     * 更新配置
     */
    public updateConfig(newConfig: Partial<BrowserConnectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // 如果正在连接，则需要重新连接
        if (this.status.connected) {
            this.disconnect();
            this.connect();
        }
    }
} 