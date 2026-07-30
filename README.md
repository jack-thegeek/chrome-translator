# AI 划词翻译

基于 Chrome Extension (Manifest V3) 的划词翻译插件，支持必应词典查词、OpenAI 兼容 API 和 Claude API。

## 功能

- 选中文本即可触发翻译，智能贴合选区右侧显示
- **必应词典**：单字划词自动触发必应词典查询，展示音标、发音、词性释义、词形变化及双语例句
- **AI 翻译**：支持句子和段落的长文本翻译，支持多种目标语言
- **多配置管理**：新建/切换/删除/导入/导出多组 API 配置
- **API 协议适配**：支持 OpenAI 兼容协议和 Claude API
- **一键测试连接**：显示完整请求参数（可直接复制到控制台执行）
- **无缝回退**：词典查词结果页可一键切换为 AI 翻译

## 必应词典查词

划词选中单个英文单词时，插件将优先调用必应词典查词：

- **发音与音标**：提供英音/美音标准音标，搭配行内小喇叭按钮，点击即可直接播放真人发音。
- **详细释义**：清晰排版各词性（n./v./adj.等）对应释义及衍生词形（复数、时态等）。
- **双语例句**：显示丰富的双语对照例句（支持容器限高与滚动阅读），英文原句后附有例句朗读播放。
- **快速切换**：底部提供「改用 AI 翻译」按钮与外链跳转至必应词典网页版。

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

### Google 翻译

- Endpoint: `https://translate.googleapis.com` (可免费直连或自建代理服务)
- 认证: 无需 API Key
- 特点: 响应极其迅速，无需配置 API Key，开箱即用

### Claude API

- Endpoint: `https://api.anthropic.com/v1`
- 认证: `x-api-key: <API Key>`
- 默认模型: `claude-3-5-sonnet-20241022`

## 项目结构

```
├── background.js    # 后台脚本，处理 API 请求与必应词典查询
├── content.js       # 内容脚本，处理划词交互与弹窗定位
├── popup.html       # 设置页面
├── popup.js         # 设置页面逻辑
├── styles.css       # 样式
├── manifest.json    # 扩展配置
└── icons/           # 图标
```

## 隐私

所有配置仅存储在本地 `chrome.storage.local`，不会上传至任何服务器。
