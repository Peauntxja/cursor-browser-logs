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

### 从扩展市场安装
1. 在VSCode/Cursor扩展市场中搜索 "Cursor Browser Logs"
2. 点击安装
3. 重启编辑器激活扩展

### 从VSIX文件安装
1. 下载最新的VSIX文件
2. 在VSCode/Cursor中，打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
3. 输入并选择 "Extensions: Install from VSIX..."
4. 选择下载的VSIX文件
5. 安装完成后重启编辑器

```bash
# VSCode命令行安装方式（可选）
code --install-extension cursor-browser-logs-0.0.2.vsix

# Cursor命令行安装方式（可选）
/Applications/Cursor.app/Contents/Resources/app/bin/code --install-extension cursor-browser-logs-0.0.2.vsix  # macOS
C:\Program Files\Cursor\resources\app\bin\code.cmd --install-extension cursor-browser-logs-0.0.2.vsix  # Windows
```

## 使用方法

### 准备浏览器
在使用扩展前，需要先启动浏览器的远程调试模式：

**Chrome (推荐，支持最完善)**
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
start chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

**Edge**
```bash
# macOS
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222

# Windows
start msedge --remote-debugging-port=9222

# Linux
microsoft-edge --remote-debugging-port=9222
```

**Firefox**
需要在Firefox中启用远程调试功能：
1. 打开 `about:config`
2. 设置 `devtools.debugger.remote-enabled` 为 `true`
3. 设置 `devtools.chrome.enabled` 为 `true`
4. 重启Firefox并使用以下命令启动：
```bash
firefox -start-debugger-server 6000
```

### 基本使用
1. 在浏览器远程调试模式下，打开您的网页
2. 在Cursor中，打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
3. 输入 "Cursor Browser Logs: 配置浏览器连接" 并选择
4. 在配置界面中：
   - 选择浏览器类型
   - 输入目标URL（您在浏览器中打开的网页地址）
   - 输入调试端口（Chrome/Edge默认为9222，Firefox默认为6000）
5. 配置完成后，在左侧活动栏中查找 "Browser Logs" 图标
6. 或者使用命令 "Cursor Browser Logs: 查看浏览器日志" 来查看捕获的日志

### 分析日志
1. 确保您已经捕获到一些浏览器日志
2. 在命令面板中输入 "Cursor Browser Logs: 分析浏览器日志" 并选择
3. 或者在活动栏的Browser Logs视图中，切换到"日志分析"标签
4. 扩展将分析捕获的日志，识别错误模式并显示分析结果
5. 分析结果包括错误统计、错误类型分布和修复建议

### 生成修复建议
1. 打开您想要分析的代码文件（通常是与浏览器错误相关的前端代码）
2. 在命令面板中选择 "Cursor Browser Logs: 生成修复建议"
3. 扩展会分析当前文件和收集到的错误日志之间的关联
4. 如果找到相关问题，将生成修复建议并显示在新的编辑器窗口中

### 其他有用命令
- "Cursor Browser Logs: 清除日志" - 清除当前收集的所有日志
- "Cursor Browser Logs: 清除配置" - 清除保存的浏览器连接配置

## 配置选项

在VSCode/Cursor设置中，您可以自定义以下选项:

```json
{
  "cursorBrowserLogs.browserType": "chrome",       // 要连接的浏览器类型
  "cursorBrowserLogs.targetUrl": "",               // 要监控的目标网页URL
  "cursorBrowserLogs.debugPort": 0,                // 浏览器调试端口（0表示使用默认端口）
  "cursorBrowserLogs.apiServer": "http://localhost:3001", // 浏览器日志API服务器地址
  "cursorBrowserLogs.refreshInterval": 10000       // 自动刷新日志的间隔时间（毫秒）
}
```

## 常见问题

### 命令无法找到(command not found)？
如果遇到 "command 'cursor-browser-logs.xxx' not found" 错误：
1. 确保扩展已正确安装
2. 重启Cursor/VSCode
3. 检查左侧活动栏是否有Browser Logs图标
4. 如果问题仍然存在，尝试卸载后重新安装扩展

### 无法捕获浏览器日志？
1. 确保浏览器已使用正确的命令启动，开启了远程调试
2. 验证调试端口（通常是9222）没有被其他程序占用
3. 确保在配置中输入了正确的目标URL
4. 如果使用Chrome，可以通过访问 http://localhost:9222/json/version 检查调试接口是否正常

### 日志分析不够准确？
日志分析基于常见错误模式。如果您的项目有特定的错误模式，可能需要进一步优化分析算法。我们计划在后续版本中支持自定义规则。

### 扩展影响性能？
扩展设计为低资源占用。如果发现性能问题，可以通过以下方式优化：
1. 增加刷新间隔时间（在配置中修改refreshInterval值）
2. 减少需要监控的浏览器页面
3. 在不需要时关闭扩展

## 开发者指南

如果您想参与开发或本地测试此扩展，请按照以下步骤操作：

### 准备开发环境
1. 克隆仓库
   ```bash
   git clone https://github.com/Peauntxja/cursor-browser-logs.git
   cd cursor-browser-logs
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 编译TypeScript代码
   ```bash
   npm run compile
   ```

### 本地测试
1. 在VSCode中打开项目文件夹
2. 按F5启动扩展调试会话
3. 在新打开的扩展开发主机窗口中测试扩展功能

### 创建VSIX包
```bash
npm run package
```
这将在项目根目录创建一个.vsix文件，可用于分发和安装。

## 贡献

欢迎贡献代码、报告问题或提供改进建议!

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可

MIT License - 详见 [LICENSE](LICENSE) 文件 