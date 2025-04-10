#!/bin/bash

# 清理和准备目录
rm -rf .vsix-temp
mkdir -p .vsix-temp/extension

# 复制文件
cp -r out/* .vsix-temp/extension/
cp -r resources/* .vsix-temp/extension/
cp package.json .vsix-temp/extension/
cp icon.png .vsix-temp/extension/
cp LICENSE .vsix-temp/extension/
cp README.md .vsix-temp/extension/

# 创建 manifest 文件
cat > .vsix-temp/extension.vsixmanifest << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="cursor-browser-logs" Version="0.0.1" Publisher="CursorBrowserLogs" />
    <DisplayName>Cursor Browser Logs Analyzer</DisplayName>
    <Description xml:space="preserve">在Cursor中集成浏览器日志分析工具</Description>
    <Tags>cursor,browser,logs,analyzer,debug</Tags>
    <Categories>Other</Categories>
    <Icon>extension/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>
EOF

# 打包
cd .vsix-temp
rm -f ../cursor-browser-logs-MIZUKI.vsix
zip -r ../cursor-browser-logs-MIZUKI.vsix extension.vsixmanifest extension/

# 清理
cd ..
rm -rf .vsix-temp

echo "打包完成：cursor-browser-logs-MIZUKI.vsix" 