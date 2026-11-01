# 附件预览验证记录

2026-11-01。测试均为本任务隔离测试版与开发模拟数据；图片/视频/PDF/模型是实际媒体字节，截图不含真实账号或任务内容。没有把原型截图作为运行证据。

## 实际运行

| 平台 | 实际路径与结果 | 证据 |
| --- | --- | --- |
| macOS Desktop | 原任务输入托盘添加 WebP / MP4 / PDF；视频真实解码 384×240，切到 PDF 完整适应 74%，关闭后待发附件仍在 | [视频](desktop-video.png)、[PDF](desktop-pdf.png) |
| iOS 27 / iPhone 18 Pro | 普通任务六项混合集合；图片→视频→PDF；视频比例正确、常显关闭/更多；关闭返回同一消息 | [视频](ios-video.jpg)、[PDF](ios-pdf.jpg)、[返回](ios-return.jpg) |
| Android API 36 / arm64 | 同一混合集合原生视频与 PDF；PDF 实际文字和七色方块；图片放大、画笔、未保存退出询问及放弃后原消息保留 | [PDF](android-pdf.jpg)、[图片](android-image.jpg)、[未保存保护](android-annotation.jpg) |
| iOS / Android 文件页 | 真实 PDF 缩放、原生/网页视频播放、离线 glTF 蓝色立方体、Mermaid；iOS 文本查找与两种主题 | [Android 模型](android-model.jpg) |

Desktop 使用本任务隔离 userData，CDP 9339；Mobile 使用本任务 Metro 8081，原生包 com.xd.cindy。iOS 使用与当前 native fingerprint 匹配的开发包；Android 从本工作树重新 prebuild / assembleDebug / 安装。运行后对源码标识重新核对；完整本地工具回执留在任务输出，不公开个人目录。

Desktop 单页检查采用真实 PreviewHeader / PreviewFooter 与主题组件，800×600、light/dark、zh-CN/en/de 共 6 场景通过。这一检查只证明公共外壳的布局，不冒充完整播放器或原生设备测试；完整 Desktop 操作由上表另行验证。

## 入口覆盖

| 消费者 | 实现 | 验证层次 |
| --- | --- | --- |
| 普通任务、伙伴复用的任务页 / 消息附件 | 公共集合和媒体/文件分派 | 三端任务实际运行；移动 117 条手势/标注回归、48 条消息集合回归 |
| 群主时间线、话题 / 服务器附件 | 同一群附件组件、每次来源授权、显式集合 | 22 条授权/加载/迟到结果回归；真实 Chat Server 账号来源补充验收未完成 |
| 新任务/已有任务待发附件 | 共用草稿预览，移除独立，图片保留标注 | Desktop 托盘实际运行；手机接线类型检查，完整发送/草稿跨页恢复补充验收未完成 |
| 文件浏览 / 伙伴成果 | 成果文件打开既有文件页；类型渲染器共享 | 手机文件页实际运行；伙伴成果远程任务数据补充验收未完成 |
| 插件媒体 / 富媒体 / 过程图片 | 保留来源授权，经已有媒体组件接标准外壳 | 插件画廊与媒体回归；真实插件授权资源补充验收未完成 |
| 远程电脑 / SSH | 保留既有来源解析与只读读取路径 | 源码追踪；双设备和 SSH 实际传输补充验收未完成 |

## 自动检查及测试价值

Desktop 116 条（媒体原件操作 50、PDF 15、图片标注 13、文本 32、行位置 6）通过；Mobile 206 条中首次 205 通过，新增集合测试误读字段后更正，48 条所在文件重新全过；后续群附件和 Android PDF 路由 23 条再次通过。Desktop / Mobile 类型检查、术语检查、测试卫生与 diff 空白检查记录在 PR。

- `lightboxMediaActions.test.ts`：真实媒体动作依赖注入，最小输入为非图片原件；保护保存 MIME/扩展名，不把文件改名成 PNG。单文件用例 16ms。
- `PdfPreview.test.tsx`：生产 PDF 组件，初始适应可用画布并保留读页/缩放；15 条 109ms。
- `ImageLightboxAnnotate.test.tsx`：生产灯箱，保留 Esc 未保存保护；13 条 709ms。
- `textLightbox.test.ts`：移除被公共外壳替代的私有卡片源码断言，保留只读、路径、截断行为约束；32 条 4ms。
- `imageLightboxInteraction.test.tsx`：真实生产交互处理器，更新标准工具栏选择器并保护原缩放/拖动/标注；117 条 442ms。
- `botGroupAttachmentLightbox.test.tsx`：生产群附件，最小失败输入包括授权拒绝、旧返回、PDF；新分派保持逐次授权；22 条 147ms。
- `messageGallery.test.ts`：图片 + PDF + MP4 的实际规范化消息，证明集合包含该消息不同类型且顺序稳定；48 条 22ms。
- `filePreviewAndroidPdf.test.tsx`：生产 Android 文件路由实际选择内嵌 PDF，原件仍可分享；WebView 解码由设备实测覆盖，路由测试不伪装解码。1 条 31ms。
- `pdfPreviewSource.test.ts` / `pdfSystemOpen.test.ts`：本地原件准备、取消、释放与系统后备策略；共享缓存/临时文件生命周期，不增加同实现常量镜像。

以上时间为已运行文件的测试用例耗时，启动/编译由批次共用；完整套件交 CI。

## 补充验收边界

尚未完成 Windows、iPad/Android 平板、横屏/大字/读屏全矩阵、真实跨设备/SSH/Chat Server/插件账号闭环，以及全部格式的损坏/密码/超大文件设备样本。代码路径存在不等于这些场景已验收；这些补充项约束整体发布/结案，不在本 PR 中删除或改列非目标。不得把当前核心通过说成全平台全来源已验收。
