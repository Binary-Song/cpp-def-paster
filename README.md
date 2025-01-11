# C++ Definition Paster

🌏 [中文](#c-定义粘贴器) | [English](#c-definition-paster)

## Usage

Select a function prototype then press `Ctrl`+`Alt`+`C` to copy its definition. 

![demo](img/demo.gif)

## Commands and Settings

| Command                  | Default Keybinding     | Description                                      |
|--------------------------|----------------|--------------------------------------------------|
| `cpp-def-paster.copyDefinition` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> | Copies function definition to the clipboard. |
| `cpp-def-paster.magicCopy` | <kbd>Ctrl</kbd>+<kbd>C</kbd> | Magic Copy: Copies the function definition to the clipboard only if the selection is made from right to left. Otherwise, fallback to normal copy. |

On Mac, <kbd>Ctrl</kbd> is the <kbd>Cmd</kbd> key, and <kbd>Alt</kbd> is the <kbd>Option</kbd> key.

If you prefer not to use the Magic Copy, you can disable it in `Settings` -> `Magic Copy: Enabled`.

Several settings are available to customize the generated definition. For more details, search for `cpp-def-paster.definition` in Settings and refer to the descriptions provided there.

PRs are welcome!

# C++ 定义粘贴器

🌏 [中文](#c-定义粘贴器) | [English](#c-definition-paster)

## 使用方法

**从右到左**选择一个函数原型，然后按 `Ctrl`+`Alt`+`C` 复制其定义。

![demo](img/demo.gif)


## 命令和设置

| 命令                  | 默认键绑定     | 描述                                      |
|--------------------------|----------------|--------------------------------------------------|
| `cpp-def-paster.copyDefinition` | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> | 将函数定义复制到剪贴板。 |
| `cpp-def-paster.magicCopy` | <kbd>Ctrl</kbd>+<kbd>C</kbd> | “魔法复制”：从右到左选择时，将函数定义复制到剪贴板。否则，正常复制。 |

在 Mac 上，<kbd>Ctrl</kbd> 是 <kbd>Cmd</kbd> 键，<kbd>Alt</kbd> 是 <kbd>Option</kbd> 键。

如果不想使用魔法复制，可以禁用设置中的 "Magic Copy: Enabled"。

可以在设置中配置如何生成函数定义。详情请在设置中搜索“cpp-def-paster.definition”，并参阅相关选项的描述。

欢迎 PR!

