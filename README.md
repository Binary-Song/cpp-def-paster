# C++ Definition Paster

🌏 [中文](README.zh-CN.md) | [English](README.md)

## Usage

Select a function prototype from **RIGHT to LEFT**, then press `Ctrl`+`C` to copy its definition. If you select in the opposite direction, `Ctrl`+`C` will function normally.

![demo](img/magic-copy-demo.gif)

## Commands

| Command                  | Default Keybinding     | Description                                      |
|--------------------------|----------------|--------------------------------------------------|
| `cpp-def-paster.copyDefinition` | `Ctrl`+`Alt`+`C` | Copies function definition to the clipboard. |
| `cpp-def-paster.magicCopy` | `Ctrl`+`C` | Copies the function definition to the clipboard if the selection is made from right to left. |

## Tips

- You can stop the `Ctrl`+`C` from copying definitions by unchecking the `magicCopy.enabled` setting.
