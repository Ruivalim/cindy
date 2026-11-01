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


## PR #8356 审查修复（2026-11-01）

5 条意见均核对为可达的实质回归，并在同一批修复：

- 已标注图片切回时：集合仍以烧录图定位，但使用原图和矢量笔迹编辑；原图读取失败才退回烧录图。回归实际切换集合、撤销旧笔迹并检查原图仍在。
- 直接音频：HTTPS 和 `data:audio/` 不再送入只接受宿主资源的 resolver；保留音频类型，标题没有扩展名也使用播放器。单测执行生产 resolver，确认直接源不取件，宿主源仍授权并传取消信号。此轮没有在设备上播放直接音频，播放器沿用既有实现；不将 resolver 单测说成音频设备实测。
- 图表未完成/语法错误：保留文档外壳；测试分别让 Mermaid 停在 parse 和拒绝 parse，Esc / 关闭均能退出。Desktop 实际读取错误 `.mmd`、点关闭并验证焦点返回：[截图](review-mermaid-error.png)。
- 行号文件引用：集合传入起始行，关闭后由查看器焦点作用域返回原入口，不返回已经卸载的前一个附件。Desktop 当前代码实际滚到第 70 行（scrollTop 1682），切错误图表后关闭，焦点返回成功。
- PDF 适配：初次读取、缩放复位和尺寸变化统一按可用宽高计算，保留页面比例。iOS 与 Android 的实际混合消息 PDF 横屏查看、放大再适配均完整显示：[iOS](review-ios-landscape.jpg)、[Android](review-android-landscape.jpg)。

最小失败复验：暂时恢复上述错误分支后，Desktop 新增用例 4 个失败、Mobile 4 个失败；恢复修复后 Desktop 56 条 / Mobile 34 条定向回归通过。Desktop / Mobile 类型检查通过。测试卫生通过；设计台账由正式生成器更新。

新增/扩展测试价值：

| 文件 | 最小输入与可观察结果 | 缺口 / tier / 单文件耗时 |
| --- | --- | --- |
| `TextLightboxInteraction.test.tsx` | 两文件集合 + 第 3 行引用；切文件后关闭返回按钮；Mermaid pending / invalid 仍可关闭 | 原文本测试只覆盖静态合同和行锚辅助函数；新增真实组件 DOM 生命周期，unit；2.59 秒 |
| `ImageLightboxAnnotate.test.tsx` | 从另一图切回带旧笔迹的图片，原图显示，撤销后旧笔迹消失 | 原测试仅直接打开单图，补生产集合入口；unit；2.98 秒 |
| `messagePayload.test.ts` | HTTPS/data 音频直接返回；宿主音频继续 resolver + AbortSignal | 原测试只格式化 payload；补生产来源分派，unit；0.919 秒 |
| `pdfWebViewHtml.test.ts` | 390×640 和 760×240 的竖版 PDF；完整适配、放大后复位、resize 后重新适配 | 路由/缓存测试不执行 WebView 文档；生产 HTML 在 VM 执行，引擎注入，unit；0.211 秒 |
| `scripts/__tests__/design-inventory.test.mjs` 的圆角用例 | 独立 JSX 样本含一个 class 和一个内联圆角、一个注释；生产生成器数为 2 | CI 两个失败 job 均因固定旧 ImageLightbox 圆角数量；改为验证统计规则，不固定产品几何数量，integration 定向用例；0.046 秒 |

独立样本替代旧界面圆角计数不修改扫描器、台账口径或测试基线。没有扩展到与本目标无关的功能。

## CI 分片修复（2026-11-01，继 c49c27d6）

回读旧 head e57cc5e6 的完整 Linux/Windows 四分片：附件相关失败命中 20 个测试文件；另有 Windows agent-island 三个 60 秒超时，代码未被本 PR 改动、范围外，另开 [#8361](https://github.com/makecindy/cindy/issues/8361)，未弱化其断言或延长超时。Desktop Git integration / verify-checks / Windows runner and database checks 的同一个 design-inventory 固定旧圆角数量问题已由 c49c27d6 修复。

本轮保留批准的应用内 PDF、更多菜单、主题背板和焦点约束；更新旧行为断言及 Node 环境的原生预览替身。复制、标注烧录顺序、本地/远程/SSH 来源、错误分类、菜单键盘、群聊草稿、缓存页索引、可见性取件和重新授权断言仍验证实际生产调用。

发现并修复的实质问题：

- 图表打开时先聚焦公共外壳，避免自动聚焦工具按钮后 Tooltip 消耗第一次 Esc。桌面实际生产组件打开图表，确认焦点在外壳，一次 Esc 即关闭。
- 文本公共阅读器保留原 JSON 的 10,000 行、100,000 字符、单行 4,096 字符预算；截断提示可见，复制仍取完整原文。禁用预算后，三个原有截断用例均失败。
- 长文档匹配跳转：RN FlatList 将跳转钳制在已量出的尾部，实测查找 9999 却停在前面行。改用项目已有的 LegendList，以估高与实际行高定位，保留虚拟化、换行和行号；删除失败滚动重试路径。
- 电脑群附件缺少 url/path 时恢复原有明确提示；集合切换到同一类条目也保留提示与当前预览。直接相关群聊测试通过；没有真实账号群的设备实测，不把这项说成已实测。
- 移动端图标 20px 改用现有 iconSize.action（数值不变）。两处原表达式仅恢复格式；没有改变任务行为。

设备证据：Desktop 图表与 iOS 浅色 / Android 深色源阅读器均在本工作树的隔离测试版运行。手机使用开发 mock 中 10,001 行的 large.json；验证截断、查找第 10,000 行、滚动与关闭，测试数据不写正式库。其它 Windows、平板和真实远程/SSH/ChatServer/插件账号的补充验收缺口沿用前文，不宣称整体可合并。

测试价值（复用原有文件，不新增基线豁免）：BotGroupTextAttachmentPreview 的预算用例原本验证旧专用阅读器，现在经公共生产阅读器；256,000 字符一行仍只能显示 4,096 字符但复制完整原文。新增一个 unit 用例验证查找 9999 到生产列表调用 index=9999，实际滚动由两端截图验证。文件单独运行 1.21 秒（19 个用例，测试执行 0.087 秒）。其它修改均为已有场景的交互契约/平台替身更新，保留原风险断言。

本轮直接验证合计：Desktop 6 文件 287 用例；Mobile 14 文件 450 用例；两个包 typecheck、design-inventory 生成检查与定向生成器测试、test-hygiene、DCO 均通过。没有运行无关全量。静态接线检查只容忍等价换行/括号，未放松调用顺序与条件。

截图：[Desktop 图表初始焦点](ci-desktop-mermaid-focus.png)、[iOS 截断](ci-ios-text-cap.jpg)、[iOS 第 10,000 行](ci-ios-text-search.jpg)、[Android 截断](ci-android-text-cap.jpg)、[Android 第 10,000 行](ci-android-text-search.jpg)。iOS 浅色、Android 深色；这不等于所有端/主题的完整矩阵均已实测。测试实例退出并保留隔离数据与登录态，本轮仅使用合成 mock 任务，未新增真实伙伴、真实任务或群记录。

已有失败文件的定向执行记录（复用原文件，无新文件）：

| 文件 | 原风险/保留的入口 | 测试执行耗时 |
| --- | --- | --- |
| `src/__tests__/BotGroupChatScreen.test.tsx`（146 例） | 真实群屏与取件回调，包含缺地址反馈、视口取件与按 ID 授权 | 1399ms |
| `src/__tests__/BotGroupMessageAttachments.test.tsx`（14 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 105ms |
| `src/__tests__/BotGroupTextAttachmentPreview.test.tsx`（19 例） | 公共源阅读器预算、原文复制、远行查找；unit 最小输入见上文 | 90ms |
| `src/__tests__/blurBackdropScrim.test.ts`（5 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 41ms |
| `src/__tests__/chatFileChipMenuModel.test.ts`（6 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 4ms |
| `src/__tests__/designTokenDiscipline.test.ts`（3 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 790ms |
| `src/__tests__/fileChipNameWidth.test.tsx`（7 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 39ms |
| `src/__tests__/filePreviewCacheRendering.test.tsx`（4 例） | 缓存页面与公共集合栏索引，刷新/失败仍保留选择 | 32ms |
| `src/__tests__/messageMediaThumbnailWiring.test.ts`（12 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 46ms |
| `src/__tests__/messageSourceLabelsRender.test.tsx`（37 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 255ms |
| `src/__tests__/newSession.test.ts`（173 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 525ms |
| `src/__tests__/pluginAttachmentBubble.test.tsx`（16 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 174ms |
| `src/__tests__/sessionComposerDesktopFirst.test.ts`（7 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 49ms |
| `src/renderer/__tests__/chatImageView.test.ts`（38 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 309ms |
| `src/renderer/__tests__/chatMediaLightboxFocus.test.ts`（3 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 604ms |
| `src/renderer/__tests__/chatVideoView.test.ts`（3 例） | 已有场景按统一预览的入口/原生边界更新，保留原行为断言 | 217ms |
| `src/renderer/__tests__/openPathFeedback.test.ts`（5 例） | 生产 IPC 错误分类与应用内 PDF 分派 | 3ms |
| `src/renderer/components/chat/__tests__/imageClipboardInteractions.test.tsx`（20 例） | 真实更多菜单触发复制/保存/外部打开，保留原件与标注顺序 | 1025ms |
| `src/renderer/features/bots/__tests__/BotGroupChatView.test.tsx`（218 例） | 真实群聊外壳的 Esc、焦点、草稿与 PDF 分派；原文件较大，未新增等待 | 17580ms |


## verify-checks 守卫补充（2026-11-01，继 98d47ccc76）

回读 c49c27d6 的 run 41318261982 / job 124882829110，新增失败来自 Desktop `unsupportedTextPreview` 与 Mobile `filePreviewPagerWiring`、`historyWindowBackfillWiring` 三个旧守卫文件。当前 head 定向复现后采纳：

- Desktop 保留“非文本不能当文本解码”的分类与全部入口检查；把已退役的“PDF/图片/压缩包自动离开 Cindy”源码断言改为执行生产分派，确认非空文件进入应用内、空地址拒绝、不调用系统打开。
- 文本浏览补回既有 `filePreview.sourceReady` 自动验收标记，只交给已加载且可见的公共阅读器；加载、失败、屏外预取页均不满足该标记。仅增加 testID，没有改变读取、布局或用户操作，沿用本轮之前的两端阅读器实测，不重新启动设备。
- PDF 稳定性守卫移到实际 PDF.js 公共组件，继续约束文档来源/重试身份以及普通翻页、缩放不能改变文档生成；HTML/Markdown 的手势归属断言保留，在前面增加模型/图表手势保护后不再按旧整行字符串误报。
- 三处原有表达式/类型仅恢复等价格式（历史补齐 seq 清理、状态类型、HTML 手势页 key），保留所有取消、互斥与授权守卫，不改变历史补齐行为。

定向验证：Desktop 3 用例（文件运行 0.419 秒 / 测试执行 0.006 秒）、Mobile 50 用例（两文件运行 1.98 秒 / 测试执行 0.111 秒）通过。只复用原有测试，不新增 guard 文件或基线豁免；测试依据分别是已批准的应用内附件预览、Maestro 就绪协议、PDF 手势稳定与历史补齐既有不变量。未运行无关全量，也未重开测试实例。

两个受影响包 typecheck、test-hygiene、design-inventory 检查均通过；当前批次自审无未处置问题。

## verify-checks 等价格式恢复（2026-11-01，继 aceaa390）

当前 head 的 run 41322360581 / job 124895184630 中，Mobile guard 共 483 例，仅 3 例失败，涉及 `messageNativeLifecycleContracts` 与 `optimisticSessionComposer`。本地同样复现 3 失败、26 通过。原因是精确源码检查与原有表达式的括号/换行格式不一致：正文可选择判断的外层括号、恢复同步状态的单行类型、草稿回收回调的单参数写法。

恢复这三处等价的原写法，不修改测试、不删除断言、不改变可选择条件、同步退避或后续消息回收。两个原有文件定向复验 29 例全通过（总运行 0.591 秒，测试执行 0.180 秒）；Mobile typecheck 通过，diff 自检通过。未运行无关全量。此次仅恢复等价格式，没有运行行为或 UI 变化，沿用前述实测证据，不重启 Desktop 或模拟器；原补充验收缺口保持明确。
