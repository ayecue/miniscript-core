# miniscript-core

[![miniscript-core](https://circleci.com/gh/ayecue/miniscript-core.svg?style=svg)](https://circleci.com/gh/ayecue/miniscript-core)

A lexer and parser for [MiniScript](https://miniscript.org) written in TypeScript. It produces an AST and is designed to serve as a foundation for language supersets such as [greybel-core](../greybel-core) and [greyscript-core](../greyscript-core).

## Features

* Produces a full AST from MiniScript source code
* Pratt parser with O(1) operator dispatch via precomputed selector IDs
* Rich error reporting; exceptions include message, source range, error code, and an optional hint
* Unsafe mode via `UnsafeLexer` and `UnsafeParser` for error recovery without throwing
* Fully extensible through custom operator tables, keyword handlers, selectors, and AST providers
* Written in TypeScript with type definitions included

## Install

```
npm install miniscript-core
```

## Usage

```ts
import { Parser } from 'miniscript-core';

const chunk = new Parser('print "hello world"').parseChunk();
console.log(chunk.toString());
```

## Extending

miniscript-core is built to be extended without forking. The parser accepts custom operator tables (`prefixOps`, `infixOps`, `atomOps`, `keywordOps`) that control how every expression, statement, atom, and keyword is parsed. You can start from the default behavior using the provided builders — `default*OpBuilder()` and `defaultKeywordHandlerBuilder()` — and then add or replace individual entries.

Token matching uses `Selector` objects with precomputed `selectorId` values for fast dispatch. New selectors can be created with `createSelector` and grouped with `createSelectorGroup`.

When building a custom subclass of `Lexer` or `Parser`, wrap it with `UnsafeLexerMixin` or `UnsafeParserMixin` to gain the same error-recovery behavior as the built-in unsafe variants.

## Testing

The test suite can be run from the command line with:

```
npm test
```
