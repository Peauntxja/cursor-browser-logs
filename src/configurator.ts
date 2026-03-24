import * as vscode from 'vscode';
import { BrowserType, BrowserConnectionConfig } from './browser-connector';

const DEFAULT_DEBUG_PORTS: Partial<Record<BrowserType, number>> = {
    [BrowserType.Chrome]: 9222,
    [BrowserType.Firefox]: 6000,
    [BrowserType.Edge]: 9222,
    [BrowserType.Safari]: 7777,
};

const BROWSER_OPTIONS: Array<{ label: string; description: string; value: BrowserType }> = [
    { label: 'Chrome', description: 'Google Chrome 浏览器', value: BrowserType.Chrome },
    { label: 'Firefox', description: 'Mozilla Firefox 浏览器', value: BrowserType.Firefox },
    { label: 'Edge', description: 'Microsoft Edge 浏览器', value: BrowserType.Edge },
    { label: 'Safari', description: 'Apple Safari 浏览器', value: BrowserType.Safari },
];

export class Configurator {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async getBrowserConfig(): Promise<BrowserConnectionConfig | null> {
        try {
            const browserType = await this.selectBrowserType();
            if (!browserType) {
                return null;
            }

            const targetUrl = await this.inputTargetUrl();
            if (!targetUrl) {
                return null;
            }

            const debugPort = await this.inputDebugPort(browserType);
            if (debugPort === -1) {
                return null;
            }

            const config: BrowserConnectionConfig = { browserType, targetUrl };
            if (debugPort > 0) {
                config.debugPort = debugPort;
            }

            this.saveConfig(config);
            return config;
        } catch (error) {
            vscode.window.showErrorMessage(`配置过程中出错: ${(error as Error).message}`);
            return null;
        }
    }

    public clearSavedConfig(): void {
        const cfg = vscode.workspace.getConfiguration('cursorBrowserLogs');
        cfg.update('browserType', undefined, vscode.ConfigurationTarget.Global);
        cfg.update('targetUrl', undefined, vscode.ConfigurationTarget.Global);
        cfg.update('debugPort', undefined, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('已清除所有保存的浏览器配置');
    }

    private async selectBrowserType(): Promise<BrowserType | null> {
        const savedType = this.getConfigValue<string>('browserType');
        const options = [...BROWSER_OPTIONS];

        if (savedType && Object.values(BrowserType).includes(savedType as BrowserType)) {
            options.unshift({
                label: `$(history) 上次选择: ${savedType}`,
                description: '使用上次的选择',
                value: savedType as BrowserType,
            });
        }

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '选择要连接的浏览器类型',
            title: 'Cursor Browser Logs 浏览器选择',
        });

        return selected?.value ?? null;
    }

    private async inputTargetUrl(): Promise<string | null> {
        const savedUrl = this.getConfigValue<string>('targetUrl');

        const url = await vscode.window.showInputBox({
            prompt: '输入要监控的网页URL',
            placeHolder: 'https://example.com',
            value: savedUrl ?? '',
            validateInput: (input) => {
                if (!input) {
                    return '请输入URL';
                }
                try {
                    new URL(input);
                    return null;
                } catch {
                    return '请输入有效的URL';
                }
            },
        });

        return url ?? null;
    }

    private async inputDebugPort(browserType: BrowserType): Promise<number> {
        const savedPort = this.getConfigValue<number>('debugPort');
        const defaultPort = DEFAULT_DEBUG_PORTS[browserType] ?? 9222;

        const portStr = await vscode.window.showInputBox({
            prompt: `输入 ${browserType} 浏览器的调试端口（可选）`,
            placeHolder: `默认: ${defaultPort}`,
            value: (savedPort && savedPort > 0 ? savedPort : defaultPort).toString(),
            validateInput: (input) => {
                if (!input) {
                    return null;
                }
                const port = parseInt(input);
                if (isNaN(port) || port <= 0 || port > 65535) {
                    return '请输入有效的端口号（1-65535）';
                }
                return null;
            },
        });

        if (portStr === undefined) {
            return -1;
        }
        return portStr ? parseInt(portStr) : defaultPort;
    }

    private saveConfig(config: BrowserConnectionConfig): void {
        const cfg = vscode.workspace.getConfiguration('cursorBrowserLogs');
        cfg.update('browserType', config.browserType, vscode.ConfigurationTarget.Global);
        cfg.update('targetUrl', config.targetUrl, vscode.ConfigurationTarget.Global);
        if (config.debugPort) {
            cfg.update('debugPort', config.debugPort, vscode.ConfigurationTarget.Global);
        }
    }

    private getConfigValue<T>(key: string): T | undefined {
        const cfg = vscode.workspace.getConfiguration('cursorBrowserLogs');
        return cfg.get<T>(key);
    }
}
