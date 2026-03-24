# Changelog

## [0.0.3] - 2026-03-24

### Refactored
- 全面重构扩展架构，提升类型安全与代码质量
- 新增统一类型系统 (`types.ts`)，消除全局 `any` 泛滥
- 合并浏览器连接器中 4 个重复的轮询方法为单一通用方法
- 消除 `logsAnalyzer` 与 `analysisProvider` 中的重复函数
- 修复日志刷新竞态条件（先获取数据再通知 UI）

### Added
- 状态栏连接指示器：实时显示浏览器连接状态
- Welcome View 空状态引导：视图无数据时显示操作入口
- 日志按级别分组展示（错误/警告/信息/调试）
- 日志缓存上限保护（`maxLogs` 配置项，默认 5000 条）
- API 请求超时保护（10 秒自动中断）
- 注册 `applySuggestion` 命令（点击建议复制到剪贴板）
- 所有侧栏命令新增图标（刷新/清除/分析/配置）

### Fixed
- 修复 `startOnPort` 失败时 HTTP Server 实例未清理的问题
- 修复无日志时反复弹出烦人的信息提示

### Changed
- `@types/cors` 和 `@types/express` 从 dependencies 移至 devDependencies
- 删除未使用的 `axios` 依赖
- 精简 `activationEvents`，引擎版本升至 `^1.74.0`
- `configurator` 去除冗余的双重配置存储，统一使用 `workspace.getConfiguration`

## [0.0.2] - 2026-03-23

### Added
- 浏览器连接功能（Chrome/Firefox/Edge/Safari）
- 日志分析功能与修复建议生成
- 配置面板（浏览器类型/URL/端口选择）

## [0.0.1] - 2026-03-22

### Added
- 初始版本：基础日志捕获与显示
