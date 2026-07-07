# AI 一人公司生存地图

用一张可交互地图，把普通人、职场人、小老板、自由职业者、创作者和转型者在 AI 时代的位置放到同一张图里。

<p align="center">
  <a href="https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/">
    <img alt="在线体验" src="https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%93%E9%AA%8C-%E6%89%93%E5%BC%80%E7%94%9F%E5%AD%98%E5%9C%B0%E5%9B%BE-facc15?style=for-the-badge&labelColor=111827">
  </a>
  <a href="https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/#survey">
    <img alt="立即试用" src="https://img.shields.io/badge/%E7%AB%8B%E5%8D%B3%E8%AF%95%E7%94%A8-%E7%94%9F%E6%88%90%E6%88%91%E7%9A%84%E6%8A%A5%E5%91%8A-f97316?style=for-the-badge&labelColor=111827">
  </a>
</p>

## 在线体验

- 在线体验：[打开 AI 一人公司生存地图](https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/)
- 立即试用：[生成我的 AI 生存报告](https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/#survey)
- 查看案例：[进入案例库](https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/#cases)

## 这是什么

《AI 一人公司生存地图》是一个面向大众的 AI 生存观察模型。

它不是单纯讨论“AI 会不会替代你”，而是把问题拆成更具体的几个判断：

- 你所在的行业和岗位，哪些工作正在被 AI 重新定价？
- 你现在是靠人力硬扛，还是已经开始用 AI 形成系统？
- 你有没有稳定的客户入口、流程资产和长期现金流？
- 如果要补一个 AI 员工，最应该先补哪一个？

网站包含三部分：

- AI 生存地图：用大大小小的方块展示不同人群、行业和岗位的 AI 化状态。
- 3 分钟生存体检：回答 10 个问题，生成一份个人 AI 生存体检报告。
- 案例库：把不同类型的一人公司、个体户和职场人的 AI 化路径放在一起对比。

## 如何使用

1. 打开上方“在线体验”。
2. 在首页查看 AI 生存地图，鼠标悬停或点击任意方块，可以查看对应模式详情。
3. 点击“生成我的报告”，按真实情况完成 10 道题。
4. 查看个人体检报告，重点看“AI 重构压力”“每周重复劳动”“最该补的 AI 员工”。
5. 生成朋友圈海报或进入案例库，对照自己的行业和工作方式继续研究。

## 数据来源

当前版本是 MVP，数据用于观察、演示和产品体验，不是国家统计报告，也不是收入承诺。

数据主要来自：

- 公开行业分类、职业名称、岗位样本和常见工作流整理。
- 全网公开的一人公司、自由职业、小微企业、内容创作者和 AI 工具使用案例。
- @陈磊历险记 在 AI 一人公司相关课程、直播和业务实践中的脱敏复盘。
- 后续用户自愿提交的样本和案例补充。

后续计划逐步补齐：

- 真实案例来源链接
- 案例采集表单
- AI 化程度评分规则
- 收入和时间字段估算规则
- 每月更新日志

## 本地运行

### 方法一：双击启动

适合不想敲命令的用户。

在 macOS 上，直接双击项目里的：

```text
启动本地网站.command
```

脚本会自动启动本地网站，并打开：

```text
http://localhost:5173/
```

关闭脚本打开的终端窗口后，本地网站也会停止。

### 方法二：命令行启动

适合开发者。

```bash
npm install
npm run dev
```

然后打开：

```text
http://localhost:5173/
```

构建静态文件：

```bash
npm run build
```

## 部署方式

这是一个纯前端项目，不需要后端服务，也不需要配置 API Key。

仓库已经配置 GitHub Pages 自动部署。代码推送到 `main` 分支后，会自动发布到：

```text
https://chenleiai.github.io/AI-One-Person-Company-Survival-Map/
```

## 技术栈

- React
- TypeScript
- Vite
- d3-hierarchy
- lucide-react
