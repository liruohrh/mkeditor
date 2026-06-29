export const sampleContent = `# Material Markdown

一个基于 [Milkdown](https://milkdown.dev) 的所见即所得 Markdown 编辑器，内置 15 套主题（4 套 Material + 1 套 Cursor Dark + 10 套 Factory），每套均同时支持深色 / 浅色模式。试试右上角切换主题与模式，或在「实时渲染 / 源码」之间切换编辑模式。

## 文本样式

支持 **加粗**、*斜体*、~~删除线~~、\`行内代码\` 以及 [超链接](https://milkdown.dev)。

> 引用块：简单、克制、留白，是 Material 设计的语言。
>
> —— 第二段引用

## 列表

- 无序列表项一
- 无序列表项二
  - 嵌套子项
- 无序列表项三

1. 有序列表项一
2. 有序列表项二
3. 有序列表项三

- [x] 已完成任务
- [ ] 未完成任务
- [ ] 未完成任务

## 代码块

\`\`\`js
// Fibonacci 数列
function fib(n) {
  if (n < 2) return n;
  let [a, b] = [0, 1];
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

console.log(fib(10)); // 55
\`\`\`

## 表格

| 主题                | 模式    | 主色调   |
| ------------------- | ------- | -------- |
| Material Ocean      | 深 / 浅 | 青色     |
| Material Palenight  | 深 / 浅 | 紫色     |
| Material Darker     | 深 / 浅 | 琥珀     |
| Material Deep Ocean | 深 / 浅 | 青绿     |
| Cursor Dark         | 深 / 浅 | 青色     |
| Ocean Depths        | 深 / 浅 | 青绿     |
| Sunset Boulevard    | 深 / 浅 | 橙红     |
| Forest Canopy       | 深 / 浅 | 橄榄     |
| Modern Minimalist   | 深 / 浅 | 钢灰     |
| Golden Hour         | 深 / 浅 | 芥末黄   |
| Arctic Frost        | 深 / 浅 | 钢蓝     |
| Desert Rose         | 深 / 浅 | 灰玫瑰   |
| Tech Innovation     | 深 / 浅 | 电蓝     |
| Botanical Garden    | 深 / 浅 | 蕨绿     |
| Midnight Galaxy     | 深 / 浅 | 薰衣草紫 |

## 分隔线

---

在源码模式下可以直接编辑 Markdown 原文，切换回实时渲染即可看到效果。
`;
