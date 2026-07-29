# AI 划词翻译

基于 Chrome Extension (Manifest V3) 的划词翻译插件，支持 OpenAI 兼容 API 和 Claude API。

## 功能

- 选中文本即可触发翻译
- 支持句子和段落翻译
- 多配置管理（新建/切换/删除/导入/导出）
- 支持 OpenAI 兼容协议和 Claude API
- 一键测试连接，显示请求参数（可直接复制到控制台执行）
- 支持多种目标语言

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目目录

## 配置

1. 点击插件图标，打开设置面板
2. 填写 API Endpoint、API Key、模型名称
3. 选择 API 协议（OpenAI 兼容 / Claude）
4. 选择目标语言
5. 点击「测试」验证连接

### 获取模型列表

点击模型输入框右侧的刷新按钮，自动获取可用模型列表。

## 支持的 API

### OpenAI 兼容

- Endpoint: `https://api.openai.com/v1`
- 认证: `Authorization: Bearer <API Key>`
- 默认模型: `gpt-3.5-turbo`

### Claude API

- Endpoint: `https://api.anthropic.com/v1`
- 认证: `x-api-key: <API Key>`
- 默认模型: `claude-3-5-sonnet-20241022`

## 项目结构

```
├── background.js    # 后台脚本，处理 API 请求
├── content.js       # 内容脚本，处理划词交互
├── popup.html       # 设置页面
├── popup.js         # 设置页面逻辑
├── styles.css       # 样式
├── manifest.json    # 扩展配置
└── icons/           # 图标
```

## 隐私

所有配置仅存储在本地 `chrome.storage.local`，不会上传至任何服务器。
