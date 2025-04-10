# Cursor Browser Logs

![Cursor Browser Logs](icon.png)

一个强大的VSCode/Cursor扩展，用于捕获、分析和处理浏览器控制台日志，帮助开发者更高效地调试和修复前端应用程序中的问题。

## 作者

MIZUKI

## 功能特点

- **日志捕获**: 自动捕获浏览器控制台的各类日志，包括:
  - 常规日志 (console.log, console.info)
  - 警告 (console.warn)
  - 错误 (console.error, JavaScript异常)
  - 调试信息 (console.debug)
  - 网络请求错误
  - 未处理的Promise拒绝

- **智能分析**: 基于捕获的日志进行深度分析，提供:
  - 错误根因识别
  - 代码修改建议
  - 常见错误模式检测

- **开发工具集成**: 无缝集成到VSCode/Cursor开发环境，让开发者可以:
  - 直接从编辑器访问日志
  - 快速定位问题代码
  - 基于日志分析结果进行代码修改

## 安装

1. 在VSCode/Cursor扩展市场中搜索 "Cursor Browser Logs"
2. 点击安装
3. 重启编辑器激活扩展

或者，您可以直接从VSIX文件安装:
```
code --install-extension cursor-browser-logs-extension-x.x.x.vsix
```

## 使用方法

### 基本使用
1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 输入 "Cursor Browser Logs: Start Capturing" 开始捕获日志
3. 在浏览器中操作您的应用程序，产生各类日志
4. 返回编辑器，输入 "Cursor Browser Logs: Show Logs" 查看捕获的日志

### 分析日志
1. 在日志查看界面中，点击 "分析日志" 按钮
2. 扩展将分析捕获的日志，识别错误模式并提供修复建议
3. 点击建议旁的 "应用" 按钮可以直接修改代码

### 高级功能
- **导出报告**: 将日志分析结果导出为HTML或Markdown格式
- **过滤日志**: 根据类型、来源或时间范围过滤日志
- **自定义错误规则**: 创建自定义规则识别特定于项目的错误模式

## 配置选项

在设置中，您可以自定义以下选项:

```json
{
  "cursorBrowserLogs.captureInterval": 1000,       // 日志捕获间隔 (毫秒)
  "cursorBrowserLogs.maxLogsStored": 1000,         // 存储的最大日志数量
  "cursorBrowserLogs.enableAutoAnalysis": true,    // 自动分析捕获的日志
  "cursorBrowserLogs.showNotifications": true      // 显示通知
}
```

## 常见问题

### 无法捕获某些日志?
确保您的应用程序运行在同一台机器上，且扩展有权限访问浏览器日志。某些浏览器设置可能会阻止日志捕获。

### 日志分析不够准确?
日志分析基于常见错误模式。如果您的项目有特定的错误模式，可以通过自定义规则提高分析准确性。

### 扩展影响性能?
扩展设计为低资源占用。如果发现性能问题，可以减少捕获频率或暂时禁用自动分析。

## 贡献

欢迎贡献代码、报告问题或提供改进建议!

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可

MIT License - 详见 [LICENSE](LICENSE) 文件 