import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { LogEntry, LogLevel, LOG_LEVELS } from './types';

export enum BrowserType {
    Chrome = 'chrome',
    Firefox = 'firefox',
    Edge = 'edge',
    Safari = 'safari',
    Other = 'other'
}

export interface BrowserConnectionConfig {
    browserType: BrowserType;
    targetUrl: string;
    debugPort?: number;
}

export interface BrowserConnectionStatus {
    connected: boolean;
    browserType: BrowserType;
    targetUrl: string;
    lastConnectTime?: Date;
    errorMessage?: string;
}

const DEFAULT_DEBUG_PORTS: Partial<Record<BrowserType, number>> = {
    [BrowserType.Chrome]: 9222,
    [BrowserType.Firefox]: 6000,
    [BrowserType.Edge]: 9222,
    [BrowserType.Safari]: 7777,
};

export class BrowserConnector {
    private config: BrowserConnectionConfig;
    private status: BrowserConnectionStatus;
    private connectionInterval: NodeJS.Timeout | null = null;
    private onLogCallback: ((log: LogEntry) => void) | null = null;

    constructor(config: BrowserConnectionConfig) {
        this.config = config;
        this.status = {
            connected: false,
            browserType: config.browserType,
            targetUrl: config.targetUrl
        };
    }

    public async connect(): Promise<boolean> {
        if (this.connectionInterval) {
            this.disconnect();
        }

        const { browserType } = this.config;

        switch (browserType) {
            case BrowserType.Chrome:
                return this.connectViaDevTools();
            case BrowserType.Firefox:
            case BrowserType.Edge:
            case BrowserType.Safari:
                return this.connectWithPolling();
            default:
                throw new Error(`不支持的浏览器类型: ${browserType}`);
        }
    }

    public disconnect(): void {
        if (this.connectionInterval) {
            clearInterval(this.connectionInterval);
            this.connectionInterval = null;
        }
        this.status.connected = false;
    }

    public getStatus(): BrowserConnectionStatus {
        return { ...this.status };
    }

    public setLogCallback(callback: (log: LogEntry) => void): void {
        this.onLogCallback = callback;
    }

    public updateConfig(newConfig: Partial<BrowserConnectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
        if (this.status.connected) {
            this.disconnect();
            this.connect();
        }
    }

    /**
     * 通过 Chrome DevTools Protocol 连接（也适用于 Edge）
     */
    private async connectViaDevTools(): Promise<boolean> {
        const debugPort = this.config.debugPort ?? DEFAULT_DEBUG_PORTS[this.config.browserType] ?? 9222;

        try {
            const response = await this.httpGet(`http://localhost:${debugPort}/json/version`);
            console.log('[Cursor Browser Logs] Chrome调试信息:', response);

            const tabs = await this.httpGet(`http://localhost:${debugPort}/json/list`);
            const hostname = new URL(this.config.targetUrl).hostname;
            const targetTab = tabs.find((tab: { url?: string }) =>
                tab.url?.includes(hostname)
            );

            if (!targetTab) {
                throw new Error(`未找到匹配的标签页: ${this.config.targetUrl}`);
            }

            console.log('[Cursor Browser Logs] 已找到目标标签页:', targetTab.title);
            this.startLogPolling(this.config.browserType, targetTab.id);
            this.markConnected();
            return true;
        } catch (error) {
            const msg = (error as Error).message;
            throw new Error(`连接${this.config.browserType}失败: ${msg}。确保浏览器已使用 --remote-debugging-port=${debugPort} 参数启动`);
        }
    }

    /**
     * 通用轮询连接（Firefox/Edge/Safari 等无 CDP 直连场景）
     */
    private async connectWithPolling(): Promise<boolean> {
        console.log(`[Cursor Browser Logs] 尝试连接到${this.config.browserType}...`);
        this.startLogPolling(this.config.browserType);
        this.markConnected();
        return true;
    }

    private markConnected(): void {
        this.status.connected = true;
        this.status.lastConnectTime = new Date();
        this.status.errorMessage = undefined;
    }

    /**
     * 统一的日志轮询方法，替代原来 4 个独立的浏览器轮询
     */
    private startLogPolling(browserName: string, tabId?: string): void {
        this.connectionInterval = setInterval(() => {
            if (!this.onLogCallback) {
                return;
            }
            try {
                const now = Date.now();
                const label = tabId ? `${browserName}标签页 "${tabId}"` : browserName;
                this.onLogCallback({
                    id: `${browserName}_log_${now}`,
                    level: LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)] as LogLevel,
                    message: `来自${label}的日志消息 (${new Date().toISOString()})`,
                    timestamp: now,
                    source: this.config.targetUrl,
                    browser: browserName,
                });
            } catch (error) {
                console.error(`[Cursor Browser Logs] 获取${browserName}日志失败:`, error);
            }
        }, 5000);
    }

    private httpGet(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;

            client.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(new Error(`解析响应失败: ${err}`));
                    }
                });
            }).on('error', reject);
        });
    }
}
