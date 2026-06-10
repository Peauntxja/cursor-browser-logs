const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 定义路径
const baseDir = __dirname;
const tempDir = path.join(baseDir, '.vsix-temp');
const extensionDir = path.join(tempDir, 'extension');
const manifestPath = path.join(tempDir, 'extension.vsixmanifest');
const vsixPath = path.join(baseDir, 'cursor-browser-logs-MIZUKI.vsix');

// 创建 manifest 内容
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="cursor-browser-logs" Version="0.0.2" Publisher="CursorBrowserLogs" />
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
</PackageManifest>`;

// 清理和准备目录
try {
  console.log('清理和准备目录...');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extensionDir, { recursive: true });

  // 复制文件
  console.log('复制文件...');
  const copyFile = (src, dest) => {
    fs.copyFileSync(
      path.join(baseDir, src),
      path.join(extensionDir, dest || path.basename(src))
    );
  };

  // 复制目录
  const copyDir = (src, dest) => {
    const srcDir = path.join(baseDir, src);
    const destDir = path.join(extensionDir, dest || '');
    
    if (!fs.existsSync(srcDir)) {
      console.warn(`警告: 目录不存在 - ${srcDir}`);
      return;
    }
    
    if (!fs.existsSync(path.join(extensionDir, destDir))) {
      fs.mkdirSync(path.join(extensionDir, destDir), { recursive: true });
    }
    
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(extensionDir, destDir, file);
      
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        const subFiles = fs.readdirSync(srcPath);
        for (const subFile of subFiles) {
          fs.copyFileSync(
            path.join(srcPath, subFile),
            path.join(destPath, subFile)
          );
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyDir('out');
  copyDir('resources');
  copyFile('package.json');
  copyFile('icon.png');
  copyFile('LICENSE');
  copyFile('README.md');

  // 创建 manifest 文件
  console.log('创建 manifest 文件...');
  fs.writeFileSync(manifestPath, manifestContent);

  // 打包
  console.log('打包...');
  if (fs.existsSync(vsixPath)) {
    fs.unlinkSync(vsixPath);
  }
  
  process.chdir(tempDir);
  execSync(`zip -r "${vsixPath}" extension.vsixmanifest extension/`, { stdio: 'inherit' });
  
  // 清理
  console.log('清理...');
  process.chdir(baseDir);
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(`打包完成：${vsixPath}`);
} catch (error) {
  console.error('打包过程中出错:', error);
  process.exit(1);
} 