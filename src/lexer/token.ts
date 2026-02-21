import { resolveSelector } from '../utils/selector-registry';

export enum TokenType {
  EOF = 1000,
  EOL = 1010,
  StringLiteral = 2000,
  NumericLiteral = 2010,
  BooleanLiteral = 2020,
  NilLiteral = 2030,
  Keyword = 3000,
  Identifier = 3010,
  Punctuator = 4000,
  SliceOperator = 4010,
  Comment = 5000,
  Invalid = 9000,
}

export interface BaseTokenOptions<T> extends CallArgs {
  type: number;
  value: T;
  line: number;
  rangeStart: number;
  rangeEnd: number;
  offsetStart: number;
  offsetEnd: number;
  afterSpace: boolean;
  lastLine?: number;
}

export class BaseToken<T> {
  readonly type: number;
  readonly value: T;
  readonly line: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly afterSpace: boolean;

  // selector bitmask fields
  readonly selectorId: number;
  readonly groupBits: number;

  // used for string literals
  readonly lastLine?: number;
  readonly endLine: number;

  readonly startChar: number;
  readonly endChar: number;

  constructor(options: BaseTokenOptions<T>) {
    this.type = options.type;
    this.value = options.value;
    this.line = options.line;
    this.rangeStart = options.rangeStart;
    this.rangeEnd = options.rangeEnd;
    this.lastLine = options.lastLine;
    this.endLine = options.lastLine || options.line;
    this.afterSpace = options.afterSpace;
    this.startChar = options.rangeStart - options.offsetStart + 1;
    this.endChar = options.rangeEnd - options.offsetEnd + 1;

    const sel = resolveSelector(this.type, this.value);
    this.selectorId = sel.selectorId;
    this.groupBits = sel.groupBits;
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const columLeft = this.startChar;
    const columRight = this.endChar;
    const location = `${startLine}:${columLeft} - ${endLine}:${columRight}`;

    return `${TokenType[this.type]}[${location}: value = '${this.value}']`;
  }
}

export interface TokenOptions extends CallArgs {
  type: number;
  value: string;
  line: number;
  rangeStart: number;
  rangeEnd: number;
  offsetStart: number;
  offsetEnd: number;
  afterSpace: boolean;
  lastLine?: number;
}

export class Token extends BaseToken<string> {
  constructor(options: TokenOptions) {
    super({ type: options.type, value: options.value, line: options.line, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, offsetStart: options.offsetStart, offsetEnd: options.offsetEnd, afterSpace: options.afterSpace, lastLine: options.lastLine });
  }
}

export interface LiteralTokenOptions extends CallArgs {
  type: number;
  value: string | number | boolean;
  raw: string;
  line: number;
  rangeStart: number;
  rangeEnd: number;
  offsetStart: number;
  offsetEnd: number;
  afterSpace: boolean;
  lastLine?: number;
}

export class LiteralToken extends BaseToken<string | number | boolean> {
  readonly raw: string;

  constructor(options: LiteralTokenOptions) {
    super({ type: options.type, value: options.value, line: options.line, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, offsetStart: options.offsetStart, offsetEnd: options.offsetEnd, afterSpace: options.afterSpace, lastLine: options.lastLine });
    this.raw = options.raw;
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const columLeft = this.startChar;
    const columRight = this.endChar;
    const location = `${startLine}:${columLeft} - ${endLine}:${columRight}`;

    return `${TokenType[this.type]}[${location}: value = ${this.raw}]`;
  }
}
