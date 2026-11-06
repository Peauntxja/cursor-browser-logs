# Cursor Browser Logs

在 Cursor 侧边栏查看浏览器控制台错误，并按日志给出修复建议。

启动扩展后，本机 `http://localhost:3001` 开始接收日志。在浏览器控制台粘贴：

```js
console.error = ((orig) => (...args) => {
  fetch('http://localhost:3001/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'error', message: args.map(String).join(' '), timestamp: Date.now() })
  });
  orig(...args);
})(console.error);
```

然后打开 Browser Logs 侧边栏。命令面板可刷新日志、分析日志、清除日志，或对当前文件生成修复建议。

端口由设置 `cursorBrowserLogs.apiServer` 决定，默认 `http://localhost:3001`。
