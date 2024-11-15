# C++ 定义粘贴器

🌏 [中文](README.zh-CN.md) | [English](README.md)

## 使用方法

**从右到左**选择一个函数原型，然后按 `Ctrl`+`C` 复制其定义。如果从左到右选择，`Ctrl`+`C` 将正常复制。

![demo](img/magic-copy-demo.gif)

## 命令

| 命令                          | 默认键绑定           | 描述                                               |
|-------------------------------|----------------------|----------------------------------------------------|
| `cpp-def-paster.copyDefinition` | `Ctrl`+`Alt`+`C`     | 将函数定义复制到剪贴板。                           |
| `cpp-def-paster.magicCopy`     | `Ctrl`+`C`           | 如果从右到左选择，则将函数定义复制到剪贴板。       |

## 提示

- 如果不想要 `Ctrl`+`C` 复制定义，可以禁用 `magicCopy.enabled`。
