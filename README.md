# miniscript-core

[![miniscript-core](https://circleci.com/gh/ayecue/miniscript-core.svg?style=svg)](https://circleci.com/gh/ayecue/miniscript-core)

Basic Lexer and Parser for MiniScript.

## Install

```bash
npm install --save miniscript-core
```

## Lexer

### Options

- `validator` - define custom validator
- `tabWidth` - define the used tab width in file
- `unsafe` - will parse invalid MiniScript without throwing (useful for debugging)

### Usage

```ts
const content = 'print "hello world"';
const lexer = new Lexer(content);
const parser = new Parser(content, { lexer });
const payload = parser.parseChunk(); // AST
```

## Parser 


### Options

- `validator` - define custom validator
- `astProvider` - define custom ast provider
- `lexer` - define custom lexer
- `tabWidth` - define the used tab width in file
- `unsafe` - will parse invalid MiniScript without throwing (useful for debugging)

### Usage

```ts
const content = 'print "hello world"';
const parser = new Parser(content);
const payload = parser.parseChunk(); // AST
```