# C++ Definition Paster README

A simple tool to help you generate c++ definitions.

## Usage

1. Place your text cursor inside a c++ **member function declaration**.

1. Press `ctrl+alt+c` to copy **the definition** for that member function. 

1. You can now press `ctrl+v` to paste it whereever you like.

You can also use the 'Copy definition' command accessible from the Command Palette. 

If you want to change the key bindings, go to File - Preferences - Keyboard Shortcuts and search for `cpp-def-paster.copyDefinition`.

This extension is still in early development; any feedback would be greatly appreciated!

## Known Issues

- For nested classes or classes within a namespace, only the innermost class name will be included in the copied definition.
