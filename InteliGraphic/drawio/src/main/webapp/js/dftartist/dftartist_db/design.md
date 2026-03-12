可以，下面我直接给你一版**可落地的设计结构**，专门对应你现在要做的目标：

* 基于现有 `app.min.js` 改
* 先重构 **UI 外壳**
* 把界面拆成独立模块
* 后续方便替换、扩展、维护

我分成 4 部分给你：

1. **模块类设计图**
2. **容器层级图**
3. **状态结构定义**
4. **模块间事件流与生命周期**

---

# 一、总体架构

建议采用 **“壳层 + 模块层 + 适配层 + 内核层”** 四层结构。

## 1）四层职责

### A. 壳层（Layout Shell）

负责：

* 创建总布局
* 管理各区域尺寸
* 管理折叠/展开
* 管理布局预设
* 驱动统一 refresh

这是整个 UI 的“总控层”。

---

### B. 模块层（UI Modules）

就是你要拆开的 5 个区域：

* FlowNavigatorModule
* ProjectExplorerModule
* WorkspaceModule
* ContextPanelModule
* BottomDockModule

每个模块都独立挂载、独立刷新、独立销毁。

---

### C. 适配层（Legacy Adapters）

用来接你们现有能力，避免重写：

* LegacyGraphAdapter（接现有画布/EditorUi/Graph）
* LegacyFormatAdapter（接原属性面板）
* LegacySidebarAdapter（接原 Sidebar/IP 面板）

这样可以做到：
**旧能力继续用，新布局先搭起来。**

---

### D. 内核层（Existing Core）

尽量不动：

* EditorUi
* Editor
* Graph
* mxGraph
* 原有项目数据逻辑
* 原有 IP 注册逻辑

---

# 二、模块类设计图

下面这个是推荐的类关系图（逻辑结构，不是代码）：

```text
PatchedEditorUi
└── LayoutShell
    ├── LayoutStateStore
    ├── LayoutPresetManager
    ├── SplitManager
    ├── EventBus
    ├── FlowNavigatorModule
    ├── ProjectExplorerModule
    ├── WorkspaceModule
    ├── ContextPanelModule
    └── BottomDockModule

WorkspaceModule
└── LegacyGraphAdapter
    └── Existing Graph / Editor / mxGraph

ContextPanelModule
├── LegacyFormatAdapter
│   └── Existing Format
├── LegacySidebarAdapter
│   └── Existing Sidebar
└── IPLibraryView（后续可替换掉 LegacySidebar 的纯 UI）

ProjectExplorerModule
├── SourcesTreeView
├── HierarchyTreeView
├── FilesView
└── RunsView

BottomDockModule
├── TerminalView
├── OutputView
├── MessagesView
├── ReportsView
└── JobsView
```

---

## 1）PatchedEditorUi

这是你现在实际入口的角色。

### 作用

* 覆写 `createDivs`
* 覆写 `createUi`
* 覆写 `refresh`
* 挂载 `LayoutShell`

### 它只做两件事

1. 兼容原来的启动流程
2. 把控制权交给 `LayoutShell`

也就是说，以后界面布局不要再散在 `EditorUi` 里写，统一由 `LayoutShell` 管。

---

## 2）LayoutShell

这是新架构的核心。

### 职责

* 创建主容器和子容器
* 创建 5 个模块实例
* 统一计算布局尺寸
* 控制 split bar
* 处理布局预设切换
* 调用各模块 `resize()`
* 最后触发 `graph.sizeDidChange()`

### 它不做

* 不做具体业务
* 不管 IP 细节
* 不管项目树数据
* 不管终端命令逻辑

---

## 3）LayoutStateStore

这是整个布局可维护的关键。

### 职责

统一保存：

* 各区域宽高
* 折叠状态
* 当前 tab
* 当前布局模式
* 上一次用户自定义尺寸

### 原则

* 所有模块都读它
* 所有尺寸变化都先改它
* 然后 `LayoutShell.refreshLayout()`

---

## 4）EventBus

模块间通信，不直接互相调用。

### 作用

例如：

* Flow 点击 “Synthesis”
* 发 `flow:navigate`
* ProjectExplorer 切到 Runs
* BottomDock 切到 Output
* ContextPanel 切到 Reports 或 Properties

这样模块不会互相耦死。

---

## 5）SplitManager

专门处理拖拽分隔条。

### 管理的分隔条

* Flow 与 Explorer 之间（可选）
* Explorer 与 Workspace 之间
* Workspace 与 Context 之间
* Workspace 与 Dock 之间（纵向）

### 职责

* 拖拽开始/移动/结束
* 更新 `LayoutStateStore`
* 节流 refresh
* 限制最小/最大尺寸

---

## 6）LayoutPresetManager

负责布局模式切换。

### 建议预设

* `default`
* `ip-integration`
* `floorplan`
* `run-debug`

### 作用

切换时不直接改 DOM，只改 state：

* 宽度
* 默认 tab
* 折叠状态
* Dock 高度

---

# 三、5 个主模块的详细结构

---

## 1）FlowNavigatorModule

### 定位

左 1：固定流程栏

### 职责

* 显示设计流程阶段
* 显示每个阶段的状态
* 点击触发跳转/布局切换/动作执行

### 推荐内部结构

```text
FlowNavigatorModule
├── FlowHeaderView
├── FlowStageListView
│   ├── Project Manager
│   ├── Design Entry
│   ├── IP Integration
│   ├── Constraints
│   ├── Simulation
│   ├── Synthesis
│   ├── Floorplan / P&R
│   ├── Timing / DRC / Power
│   └── Signoff / Debug
└── FlowStatusBadgeRenderer
```

### 输入

* 当前工程状态
* 当前阶段状态
* 当前活动阶段

### 输出事件

* `flow:selectStage`
* `flow:runStage`
* `flow:openPanel`

### 不该放在这里的东西

* 文件树
* IP 列表
* 属性面板

---

## 2）ProjectExplorerModule

### 定位

左 2：工程内容区

### 职责

* 展示 Sources
* 展示 Hierarchy
* 展示 Files
* 展示 Runs

### 推荐内部结构

```text
ProjectExplorerModule
├── ExplorerTabBar
├── SourcesTreeView
├── HierarchyTreeView
├── FilesTreeView
└── RunsListView
```

### 推荐 tab

* Sources
* Hierarchy
* Files
* Runs

### 输入

* 工程文件树
* 模块/实例层级
* 运行任务列表

### 输出事件

* `project:openFile`
* `project:selectNode`
* `project:focusObject`
* `run:open`

### 后续可扩展

* Bookmarks
* Search Result
* Recent Files

---

## 3）WorkspaceModule

### 定位

中间主工作区

### 职责

* 承载画布 / 编辑器
* 承载欢迎页 / 空态
* 后续支持多标签/分屏

### 推荐内部结构

```text
WorkspaceModule
├── WorkspaceHeaderBar（可选）
├── WorkspaceTabManager（后续）
├── WorkspaceViewport
│   └── LegacyGraphAdapter
└── WorkspaceOverlayLayer
    ├── EmptyStateView
    ├── LoadingMask
    └── HintOverlay
```

### 为什么要单独有 OverlayLayer

以后你会需要：

* 无项目提示
* 加载遮罩
* 模式引导提示
* 报错覆盖层

这些不要直接塞进 graph DOM。

### 输出事件

* `workspace:selectionChanged`
* `workspace:viewModeChanged`
* `workspace:graphResized`

---

## 4）ContextPanelModule

### 定位

右侧上下文区

### 核心原则

**默认是上下文面板，不是固定 IP 面板。**

### 推荐内部结构

```text
ContextPanelModule
├── ContextTabBar
├── PropertiesPanel
│   └── LegacyFormatAdapter
├── InspectorPanel
├── IPLibraryPanel
│   ├── IPSearchBar
│   ├── IPCategoryTree
│   ├── IPListGrid
│   └── IPQuickActions
├── LayersPanel
└── SearchPanel
```

### 推荐 tab 顺序

* Properties（默认）
* Inspector
* IP Library
* Layers / View
* Search

### 为什么这样设计

* 用户平时更多是看“当前对象属性”
* IP 是阶段性高频，不是全程高频
* 右侧应该是“上下文区”

### 现阶段怎么落地

* `PropertiesPanel` 先接旧 `Format`
* `IPLibraryPanel` 先接旧 `Sidebar`
* 后续再把 IP UI 独立出来，改成注册表驱动

### 输出事件

* `context:tabChanged`
* `context:propertyChanged`
* `ip:create`
* `ip:openConfig`

---

## 5）BottomDockModule

### 定位

底部结果区（属于中间列，不是全局底部）

### 职责

* 显示命令行
* 显示输出日志
* 显示错误/警告
* 显示报告
* 显示任务队列

### 推荐内部结构

```text
BottomDockModule
├── DockTabBar
├── TerminalView
├── OutputLogView
├── MessagesView
├── ReportsView
└── JobsView
```

### 推荐 tab

* Terminal
* Output
* Messages
* Reports
* Jobs

### 输出事件

* `dock:tabChanged`
* `dock:openMessage`
* `dock:openReport`
* `dock:clearLog`

### 与状态栏分工

* **状态栏**：轻量状态（当前项目、缩放、后台任务数）
* **BottomDock**：详细反馈（日志、错误、报告）

---

# 四、适配层设计（关键，避免重写）

这是保证你“先改布局、后改功能”的关键。

---

## 1）LegacyGraphAdapter

### 作用

把现有画布逻辑封装成一个标准模块接口。

### 对外暴露

* `mount(container)`
* `resize(rect)`
* `focus()`
* `destroy()`

### 它内部接

* 现有 `diagramContainer`
* 现有 graph 初始化
* `graph.sizeDidChange()`

### 意义

以后即使换画布实现，外层 `WorkspaceModule` 不用改。

---

## 2）LegacyFormatAdapter

### 作用

把现有 `Format` 包成 `PropertiesPanel`

### 对外暴露

* `mount(container)`
* `showSelection(cell)`
* `refresh()`
* `destroy()`

### 意义

现有属性编辑能力继续用，但不再直接等于页面左/右布局。

---

## 3）LegacySidebarAdapter

### 作用

把现有 `Sidebar` 包成 `IPLibraryPanel` 的临时实现

### 对外暴露

* `mount(container)`
* `filter(query)`
* `refresh()`
* `destroy()`

### 后续替换方向

将来用真正的 `IPLibraryPanel` 替换掉这个 Adapter，但 `ContextPanelModule` 外部不变。

---

# 五、容器层级图（DOM 结构）

这是你最需要提前定死的部分。
建议 DOM 结构如下：

```text
RootContainer
├── menubarContainer
├── toolbarContainer
└── workbenchContainer
    ├── flowNavContainer
    ├── explorerContainer
    ├── centerColumn
    │   ├── workspaceContainer
    │   └── dockContainer
    └── contextContainer
```

---

## 1）推荐的视觉关系

```text
┌──────────────────────────────────────────────────────────────┐
│ Menu Bar                                                     │
├──────────────────────────────────────────────────────────────┤
│ Toolbar / Quick Search / Run Control                         │
├───────┬───────────────┬───────────────────────┬──────────────┤
│ Flow  │ Project       │ Workspace             │ Context      │
│ Nav   │ Explorer      │                       │ Panel        │
│       │ (Sources/...) │                       │              │
│       │               │                       │              │
│       │               ├───────────────────────┤              │
│       │               │ Bottom Dock           │              │
│       │               │ Terminal/Output/...   │              │
├───────┴───────────────┴───────────────────────┴──────────────┤
│ Status Bar                                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2）为什么 Dock 要放在 centerColumn 里

因为它只应该影响：

* 中间工作区的垂直空间

而不应该影响：

* 左侧流程栏的高度逻辑
* 右侧上下文栏的滚动行为

这样布局才稳定。

---

## 3）建议的容器尺寸策略

### 宽度建议

* FlowNav：`200~220`
* Explorer：`260~320`
* Context：`300~360`
* Workspace：自适应剩余宽度
* Dock：高度 `180~240`（默认）

### 折叠策略

* FlowNav：支持折叠成图标栏
* Explorer：支持完全折叠
* Context：支持完全折叠
* Dock：支持折叠到底部条

---

# 六、状态结构定义（核心）

这是整个系统是否“后面方便改”的关键。
建议把状态拆成 5 类：

1. `layout`
2. `panels`
3. `tabs`
4. `workflow`
5. `runtime`

---

## 1）总状态结构图

```text
UIState
├── layout
├── panels
├── tabs
├── workflow
├── runtime
└── userPrefs
```

---

## 2）layout：布局尺寸状态

```text
layout
├── preset                 // default / ip-integration / floorplan / run-debug
├── windowWidth
├── windowHeight
├── flowNavWidth
├── explorerWidth
├── contextWidth
├── dockHeight
├── minFlowNavWidth
├── minExplorerWidth
├── minContextWidth
└── minDockHeight
```

### 作用

只存“几何尺寸”。

---

## 3）panels：面板可见性状态

```text
panels
├── flowNavCollapsed
├── explorerCollapsed
├── contextCollapsed
├── dockCollapsed
├── statusBarVisible
├── toolbarVisible
└── menuBarVisible
```

### 作用

只存“显示/折叠”。

---

## 4）tabs：各区域当前 tab

```text
tabs
├── projectActiveTab       // sources / hierarchy / files / runs
├── contextActiveTab       // properties / inspector / ip / layers / search
├── dockActiveTab          // terminal / output / messages / reports / jobs
└── workspaceActiveView    // canvas / text / report / waveform（后续）
```

### 作用

所有 tab 切换都只改这里。

---

## 5）workflow：流程状态

```text
workflow
├── currentStage
├── stageStatusMap
│   ├── project
│   ├── designEntry
│   ├── ipIntegration
│   ├── constraints
│   ├── simulation
│   ├── synthesis
│   ├── floorplan
│   ├── implementation
│   ├── timing
│   └── signoff
└── suggestedNextStage
```

### 每个阶段状态建议

* `idle`
* `ready`
* `running`
* `success`
* `warning`
* `error`
* `disabled`

---

## 6）runtime：运行时状态

```text
runtime
├── currentProjectId
├── currentSelection
├── currentFile
├── activeRunId
├── backgroundJobsCount
├── messagesCount
├── warningsCount
├── errorsCount
├── isBusy
└── lastFocusedRegion
```

### 作用

给各模块做联动显示。

---

## 7）userPrefs：用户偏好状态

```text
userPrefs
├── rememberLayout
├── lastPreset
├── lastProjectTab
├── lastContextTab
├── lastDockTab
├── autoOpenDockOnError
├── autoSwitchToPropertiesOnSelect
└── collapseFlowNavInCompactMode
```

### 作用

后面做“保存用户布局”非常好用。

---

# 七、模块统一接口（很重要）

为了后续好维护，建议所有模块都实现同一套接口。

```text
ModuleInterface
├── init(context)
├── mount(container)
├── resize(layoutRect)
├── activate()
├── deactivate()
├── handleEvent(event)
└── destroy()
```

---

## 每个接口的职责

### `init(context)`

初始化依赖：

* ui
* stateStore
* eventBus
* services

### `mount(container)`

只负责渲染和挂载。

### `resize(layoutRect)`

只负责根据外部传入尺寸调整自己。

### `activate() / deactivate()`

给 tab 切换、模式切换用。

### `handleEvent(event)`

接收总线事件，做局部响应。

### `destroy()`

移除监听、释放 DOM、清理引用。

---

# 八、模块间事件流（推荐）

不要让模块互相直接调方法。统一走事件总线。

---

## 1）核心事件列表

### 流程相关

* `flow:stageSelected`
* `flow:runRequested`
* `flow:openRecommendedPanel`

### 工程内容相关

* `project:fileOpened`
* `project:nodeSelected`
* `project:runSelected`

### 工作区相关

* `workspace:selectionChanged`
* `workspace:viewChanged`
* `workspace:objectFocused`

### 右侧上下文相关

* `context:tabChanged`
* `context:propertyEdited`
* `ip:createRequested`

### 底部输出相关

* `dock:tabChanged`
* `dock:messageOpen`
* `dock:reportOpen`

### 布局相关

* `layout:resized`
* `layout:presetChanged`
* `layout:panelCollapsed`

---

## 2）典型联动示例

### 场景 A：用户点了 Flow 里的 Synthesis

```text
FlowNavigatorModule
→ emit(flow:stageSelected, synthesis)

LayoutShell / Controller
→ 切 preset 为 run-debug
→ tabs.projectActiveTab = runs
→ tabs.dockActiveTab = output
→ refreshLayout()

ProjectExplorerModule
→ 切到 Runs

BottomDockModule
→ 打开 Output
```

---

### 场景 B：用户在画布选中一个 IP

```text
WorkspaceModule
→ emit(workspace:selectionChanged, node)

ContextPanelModule
→ 自动切到 Properties
→ 刷新 Inspector / Properties
```

---

### 场景 C：后台运行报错

```text
RunService
→ emit(run:error)

BottomDockModule
→ 自动切到 Messages

ContextPanelModule
→ 可选切换到 Inspector（显示错误对象）
```

---

# 九、布局预设设计（推荐）

建议从一开始就把“布局模式”做成标准能力。

---

## 1）default

适合日常编辑。

* FlowNav：展开
* Explorer：展开
* Context：展开
* Dock：折叠或较小
* Context 默认 tab：Properties

---

## 2）ip-integration

适合拼 IP / 画连接。

* FlowNav：展开
* Explorer：中等
* Context：展开
* Context 默认 tab：IP Library
* Dock：折叠

---

## 3）floorplan

适合大画布。

* FlowNav：折叠或窄化
* Explorer：保留但变窄
* Workspace：最大
* Context：显示 Layers + Properties
* Dock：折叠

---

## 4）run-debug

适合看日志和报告。

* FlowNav：展开
* Explorer：切到 Runs
* Dock：展开
* Dock 默认 tab：Output / Messages
* Context：可缩窄

---

# 十、推荐的实际落地顺序

你现在先别急着做“功能完整”，按这个顺序最稳：

---

## Phase 1：先搭骨架

只做：

* LayoutShell
* 容器层级
* LayoutStateStore
* 5 个空模块（先能显示边框和标题）

目标：
**先把 5 区结构稳定下来。**

---

## Phase 2：接旧能力

* Workspace 接现有画布
* Context 的 Properties 接现有 Format
* Context 的 IP 接现有 Sidebar
* ProjectExplorer 先接现有项目树（哪怕简单）
* Dock 先做静态 tab 和简单日志容器

目标：
**旧功能换新位置。**

---

## Phase 3：做联动和状态

* tab 切换
* split 拖拽
* 折叠/展开
* 预设切换
* 事件总线

目标：
**让结构真正“活起来”。**

---

## Phase 4：模块内逐步替换

* IP Library 改成注册表驱动
* ProjectExplorer 改成真正的数据树
* Dock 接真正的运行日志/报告系统

目标：
**逐步摆脱 legacy 面板。**

---

# 十一、你这次重构最该“先定死”的东西

如果你现在让我只挑最关键的 3 件事，我会建议你先定死这三个：

## 1）容器层级

也就是上面那棵 DOM 树。
这个一旦定了，后面所有模块都能稳。

## 2）状态结构

尤其是：

* 尺寸
* 折叠
* 当前 tab
* preset

这是后续所有交互的基础。

## 3）模块统一接口

所有模块都遵守同一套生命周期，后面替换才不会痛苦。

---

# 十二、最终建议的设计结构（一句话版本）

**用 `PatchedEditorUi` 挂一个 `LayoutShell`，由 `LayoutShell` 管 5 个独立模块（Flow / Explorer / Workspace / Context / Dock），统一通过 `LayoutStateStore + EventBus` 管理尺寸、折叠、tab 和联动；旧的 `Graph / Format / Sidebar` 不直接作为页面结构存在，而是通过 Adapter 接入 Workspace 和 Context，逐步迁移。**

这就是最稳、最适合你们当前阶段的结构。

---

如果你愿意，我下一步可以继续直接给你两份更具体的内容：

1. **页面级线框图（把每个区域内部按钮、tab、分割线也画出来）**
2. **按 `app.min.js` 的改造清单（先改哪几个函数、各函数负责什么、风险点在哪）**

你如果要，我建议下一步先做第 2 个。
