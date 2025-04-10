# 发布扩展到VS Code插件市场指南

本文档提供了如何将Cursor Browser Logs Analyzer扩展发布到VS Code插件市场的详细步骤。

## 准备工作

### 1. 创建Azure DevOps账号

VS Code插件市场使用Azure DevOps进行身份验证和管理。如果您还没有账号，请前往 [Azure DevOps](https://dev.azure.com/) 创建一个免费账号。

### 2. 创建个人访问令牌(PAT)

1. 登录您的Azure DevOps账号
2. 点击右上角的用户头像，选择"个人访问令牌"
3. 点击"新建令牌"
4. 给令牌一个描述性名称，如"VS Code Extension Publishing"
5. 在"组织"字段中选择"所有可访问的组织"
6. 将过期时间设置为您需要的时间（最长为1年）
7. 在"作用域"部分，选择"Marketplace"并勾选"管理"
8. 点击"创建"
9. **重要**：立即复制生成的令牌并保存在安全的地方，因为离开页面后将无法再看到完整的令牌

### 3. 安装vsce工具

```bash
npm install -g @vscode/vsce
```

## 创建发布者ID

1. 前往[VS Code插件市场发布者管理页面](https://marketplace.visualstudio.com/manage/publishers)
2. 使用您的Microsoft账号登录（与创建PAT的账号相同）
3. 点击"创建发布者"
4. 填写必要信息：
   - **ID**：唯一标识符，将用于扩展URL和发布过程，创建后无法更改
   - **名称**：发布者的显示名称
   - 其他选填字段
5. 点击"创建"
6. 将这个发布者ID替换到package.json中的"publisher"字段

## 验证发布者

```bash
vsce login <发布者ID>
```

系统会提示您输入之前创建的个人访问令牌(PAT)。

## 修改package.json

确保package.json文件包含以下必填字段：

```json
{
  "name": "cursor-browser-logs",
  "displayName": "Cursor Browser Logs Analyzer",
  "description": "在Cursor中集成浏览器日志分析工具",
  "version": "0.0.1",
  "publisher": "YourPublisherID",   // 使用您创建的发布者ID
  "engines": {
    "vscode": "^1.60.0"
  },
  // 其他字段...
}
```

## 发布扩展

### 打包扩展

```bash
vsce package
```

这将生成一个.vsix文件，可以手动安装或发布到市场。

### 发布到市场

```bash
vsce publish
```

或者指定版本：

```bash
vsce publish patch  # 递增修订号 (0.0.1 -> 0.0.2)
vsce publish minor  # 递增次版本号 (0.0.1 -> 0.1.0)
vsce publish major  # 递增主版本号 (0.0.1 -> 1.0.0)
```

您也可以直接发布特定的VSIX文件：

```bash
vsce publish -p <your-token> --packagePath cursor-browser-logs-fixed.vsix
```

## 更新扩展

每次更新扩展时，请确保：

1. 更新package.json中的版本号
2. 更新CHANGELOG.md描述更改内容
3. 再次运行`vsce publish`命令

## 撤销发布

如果需要撤销发布的扩展：

```bash
vsce unpublish <发布者ID>.<扩展名>
```

例如：

```bash
vsce unpublish YourPublisherID.cursor-browser-logs
```

## 可能遇到的问题及解决方案

1. **错误："You exceeded the number of allowed tags of 10"**
   - 解决方案：确保package.json中的keywords数组不超过10个项目

2. **错误："403 Forbidden (or 401 Unauthorized)"**
   - 解决方案：检查PAT是否有正确的作用域，确保选择了"所有可访问的组织"而不是特定组织

3. **错误："extension/package.json not found inside zip"**
   - 解决方案：确保扩展结构正确，package.json文件应位于extension目录内

4. **错误："The extension 'name' already exists in the Marketplace"**
   - 解决方案：修改扩展名称，或联系该扩展的发布者

## 资源

- [VS Code扩展发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce工具文档](https://github.com/microsoft/vscode-vsce)
- [VS Code插件市场发布者管理](https://marketplace.visualstudio.com/manage/publishers) 