# Cursor Browser Logs Analyzer

这个VS Code扩展为Cursor编辑器提供了强大的浏览器日志分析功能。它可以帮助开发者捕获、分析和管理Web应用程序中的控制台日志，并提供智能的错误修复建议。

## 功能

- **浏览器日志捕获**：自动捕获浏览器控制台中的各类日志
- **错误分析**：智能分析错误类型和模式
- **修复建议**：根据错误类型提供针对性的代码修复建议
- **可视化界面**：直观的日志查看和分析界面

## 安装

1. 在VS Code中打开扩展面板
2. 搜索"Cursor Browser Logs Analyzer"
3. 点击安装

## 使用方法

1. 通过活动栏中的"Browser Logs"图标打开扩展
2. 使用"查看浏览器日志"命令查看捕获的日志
3. 使用"分析浏览器日志"命令分析日志并获取修复建议
4. 在编辑器上下文菜单中使用"生成修复建议"针对当前文件生成修复建议

## 配置选项

在设置中，你可以自定义以下配置：

- `cursorBrowserLogs.apiServer`：浏览器日志API服务器地址（默认为http://localhost:3001）
- `cursorBrowserLogs.refreshInterval`：自动刷新日志的时间间隔（毫秒）

## 常见问题

**Q: 为什么没有捕获到日志？**
A: 确保你的Web应用程序已经安装并初始化了browser-logger工具。

**Q: 如何与已有项目集成？**
A: 在项目中引入并初始化browser-logger工具，然后使用本扩展查看和分析日志。

## 源代码

项目源代码托管在 [GitHub](https://github.com/your-username/cursor-browser-logs)。

## 许可证

MIT 