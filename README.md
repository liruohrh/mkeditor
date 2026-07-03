# Markdown Editor

## 功能

- 源码模式、实时渲染模式
- themes
  - [cursor-dark](https://github.com/CedricVerlinden/cursor-dark)
  - Material Themes
  - [theme-factory](https://github.com/anthropics/skills/blob/main/skills/theme-factory/SKILL.md)
- 配置（用户缓存目录/io.liruohrh.mdeditor）
  - themes: 用户主题，themes/xxgroup/xxx.css, group=xxgroup，而themes/xxx.css，group=默认（就不需要组名，用分割线隔开在最后显示）
  - config.json: 需要有设置界面，需要有合适的schema进行校验，不同值有不同输入方法，比如数字用输入框，布尔用复选框，字符串用下拉选择框
  - 设置中添加文件过滤器，避免加载不必要的文件，默认仅 .md、图片、视频
  - 图片处理
    - 默认路径：文档目录、指定目录、文档目录下的指定子目录，默认绝对路径/URL
    - 图片上传：暂不支持
- 存储
  - 目录、单文件、内存存储
  - 关闭未保持文件时提示是否保存当前文档
  - 支持当前文档自动保存，{enable: false, interval: {default: 5, min: 5}}，切换到其他文档时自动保存
  - 支持自动保存历史，{enable: false, interval: {default: 30, min: 30}, maxHistory:{default: 30, max: 30}}
  - 记录打开的文件、目录

## 主要的界面布局

- 顶部菜单栏（icon+tip）
  - 收起侧栏栏
  - 文件：最近打开
  - 主题切换按、亮色模式按钮(dark/light)
  - 设置按钮
- 底部状态栏
  - 左边：编辑模式(source/render)icon+名称
  - 右边：行、词、字符
- 中间
  - 右边：编辑界面
    - 顶部：打开的文档标签栏，当前文档需要用激活状态（上边框要有特殊颜色）
    - 其他：内容界面
  - 左边：侧边栏，顶部水平滑动切换按钮，包含文件树、文档大纲、文件历史、搜索，感觉可以类似vscode的侧边栏布局

- 文件树
  - 顶部菜单栏左边显示目录名，右边显示刷新按钮、打开文件或者目录按钮
  - 右键文件树的item需要显示创建/删除文件、创建/删除目录、复制路径、在系统文件管理器打开其目录

## 快捷键

- 保存=Ctrl+S
- 重命名=F2
- 删除=delete

## Libs

- markdown editor lib: https://github.com/Milkdown/milkdown
- shadcn/ui: https://github.com/shadcn-ui/ui

## TODO

- 支持markdown更多语法，特别是链接，现在写链接无法实时渲染为链接，需要在源码里写才能渲染为链接
- 图片处理有问题，路径是一个blob，不是文件路径。
- 图片和链接一样，无法直接写markdown来添加，需要在源码里写才能渲染
  - 链接即便是增加了linkInputRule，但是有点小问题，体验也不太好

- 在源码模式下依然进行渲染但是保持源码

# TOFIX
