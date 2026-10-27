# AI Assistant Rules

## General Rules

- When encountering something that is not clear, do not act freely. You should ask for confirmation.
- Always consider the code based on its purpose, and if there is a simpler solution it should be proposed.
- Only deal with scenarios that have a practical basis; do not add defensive logic or unnecessary complexity for situations that will not occur
- Entire file should have consistent style
- Use modern Web APIs or ES standards
- When referencing other files, do not write code with the same issues
- Do not significantly increase the complexity of the code for the sake of testing.

## Gem Element Development

Files in `elements` folder are for Gem elements. One file contains one or more elements. Filename is the prefix-less element name. Gem elements extend GemElement or its derived classes.

Gem syntax and best practices: @packages/gem/AGENTS.md
