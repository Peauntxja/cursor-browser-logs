import * as vscode from 'vscode';
import { BrowserType, BrowserConnectionConfig } from './browser-connector';

/**
 * 配置器类 - 负责处理用户配置交互
 */
export class Configurator {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * 获取浏览器连接配置
     */
    public async getBrowserConfig(): Promise<BrowserConnectionConfig | null> {
        try {
            // 1. 选择浏览器类型
            const browserType = await this.selectBrowserType();
            if (!browserType) {
                return null; // 用户取消了选择
            }

            // 2. 输入目标URL
            const targetUrl = await this.inputTargetUrl();
            if (!targetUrl) {
                return null; // 用户取消了输入
            }

            // 3. 输入调试端口（可选）
            const debugPort = await this.inputDebugPort(browserType);
            if (debugPort === -1) {
                return null; // 用户取消了输入
            }

            // 4. 保存配置
            const config: BrowserConnectionConfig = {
                browserType: browserType,
                targetUrl: targetUrl
            };

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

    /**
     * 选择浏览器类型
     */
    private async selectBrowserType(): Promise<BrowserType | null> {
        const savedType = this.getSavedBrowserType();
        
        const browserOptions = [
            { label: 'Chrome', description: 'Google Chrome 浏览器', value: BrowserType.Chrome },
            { label: 'Firefox', description: 'Mozilla Firefox 浏览器', value: BrowserType.Firefox },
            { label: 'Edge', description: 'Microsoft Edge 浏览器', value: BrowserType.Edge },
            { label: 'Safari', description: 'Apple Safari 浏览器', value: BrowserType.Safari }
        ];

        // 如果有保存的选择，将其添加为默认选项
        if (savedType) {
            browserOptions.unshift({
                label: `$(history) 上次选择: ${savedType}`,
                description: '使用上次的选择',
                value: savedType as BrowserType
            });
        }

        const selected = await vscode.window.showQuickPick(browserOptions, {
            placeHolder: '选择要连接的浏览器类型',
            title: 'Cursor Browser Logs 浏览器选择'
        });

        return selected ? selected.value : null;
    }

    /**
     * 输入目标URL
     */
    private async inputTargetUrl(): Promise<string | null> {
        const savedUrl = this.getSavedTargetUrl();
        
        const url = await vscode.window.showInputBox({
            prompt: '输入要监控的网页URL',
            placeHolder: 'https://example.com',
            value: savedUrl || '',
            validateInput: (input) => {
                if (!input) {
                    return '请输入URL';
                }
                try {
                    new URL(input);
                    return null; // URL有效
                } catch (e) {
                    return '请输入有效的URL';
                }
            }
        });

        return url || null;
    }

    /**
     * 输入调试端口
     */
    private async inputDebugPort(browserType: BrowserType): Promise<number> {
        const savedPort = this.getSavedDebugPort();
        let defaultPort = 0;
        
        // 根据浏览器类型设置默认端口
        switch (browserType) {
            case BrowserType.Chrome:
                defaultPort = 9222;
                break;
            case BrowserType.Firefox:
                defaultPort = 6000;
                break;
            case BrowserType.Edge:
                defaultPort = 9222;
                break;
            case BrowserType.Safari:
                defaultPort = 7777;
                break;
        }

        const portStr = await vscode.window.showInputBox({
            prompt: `输入 ${browserType} 浏览器的调试端口（可选）`,
            placeHolder: `默认: ${defaultPort}`,
            value: savedPort ? savedPort.toString() : defaultPort.toString(),
            validateInput: (input) => {
                if (!input) {
                    return null; // 空值是有效的，使用默认值
                }
                const port = parseInt(input);
                if (isNaN(port) || port <= 0 || port > 65535) {
                    return '请输入有效的端口号（1-65535）';
                }
                return null;
            }
        });

        if (portStr === undefined) {
            return -1; // 用户取消了输入
        }

        if (!portStr) {
            return defaultPort; // 使用默认端口
        }

        return parseInt(portStr);
    }

    /**
     * 保存配置
     */
    private saveConfig(config: BrowserConnectionConfig): void {
        // 保存到全局状态
        this.context.globalState.update('browserType', config.browserType);
        this.context.globalState.update('targetUrl', config.targetUrl);
        if (config.debugPort) {
            this.context.globalState.update('debugPort', config.debugPort);
        }

        // 同时保存到配置
        const vsConfig = vscode.workspace.getConfiguration('cursorBrowserLogs');
        vsConfig.update('browserType', config.browserType, vscode.ConfigurationTarget.Global);
        vsConfig.update('targetUrl', config.targetUrl, vscode.ConfigurationTarget.Global);
        if (config.debugPort) {
            vsConfig.update('debugPort', config.debugPort, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * 获取保存的浏览器类型
     */
    private getSavedBrowserType(): BrowserType | null {
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        const configValue = config.get<string>('browserType');
        if (configValue && Object.values(BrowserType).includes(configValue as BrowserType)) {
            return configValue as BrowserType;
        }

        const stateValue = this.context.globalState.get<string>('browserType');
        if (stateValue && Object.values(BrowserType).includes(stateValue as BrowserType)) {
            return stateValue as BrowserType;
        }

        return null;
    }

    /**
     * 获取保存的目标URL
     */
    private getSavedTargetUrl(): string | null {
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        const configValue = config.get<string>('targetUrl');
        if (configValue) {
            return configValue;
        }

        const stateValue = this.context.globalState.get<string>('targetUrl');
        if (stateValue) {
            return stateValue;
        }

        return null;
    }

    /**
     * 获取保存的调试端口
     */
    private getSavedDebugPort(): number | null {
        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        const configValue = config.get<number>('debugPort');
        if (configValue && configValue > 0) {
            return configValue;
        }

        const stateValue = this.context.globalState.get<number>('debugPort');
        if (stateValue && stateValue > 0) {
            return stateValue;
        }

        return null;
    }

    /**
     * 清除保存的配置
     */
    public clearSavedConfig(): void {
        this.context.globalState.update('browserType', undefined);
        this.context.globalState.update('targetUrl', undefined);
        this.context.globalState.update('debugPort', undefined);

        const config = vscode.workspace.getConfiguration('cursorBrowserLogs');
        config.update('browserType', undefined, vscode.ConfigurationTarget.Global);
        config.update('targetUrl', undefined, vscode.ConfigurationTarget.Global);
        config.update('debugPort', undefined, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('已清除所有保存的浏览器配置');
    }

    /**
     * 显示配置面板
     */
    public async showConfigPanel(): Promise<BrowserConnectionConfig | null> {
        // 创建一个新的配置
        return await this.getBrowserConfig();
    }
}