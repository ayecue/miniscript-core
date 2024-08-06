import { Position } from '../types/position';

export enum TokenType {
  EOF = 'EOF',
  StringLiteral = 'StringLiteral',
  Keyword = 'Keyword',
  Identifier = 'Identifier',
  NumericLiteral = 'NumericLiteral',
  Punctuator = 'Punctuator',
  BooleanLiteral = 'BooleanLiteral',
  NilLiteral = 'NilLiteral',
  EOL = 'EOL',
  SliceOperator = 'SliceOperator',
  Comment = 'Comment',
  Invalid = 'Invalid'
}

export class BaseTokenOptions<T> {
  type: string;
  value: T;
  line: number;
  lineStart: number;
  range: [number, number];
  offset: number;
  afterSpace?: boolean;
  lastLine?: number;
  lastLineStart?: number;
}

export class BaseToken<T> {
  readonly type: string;
  readonly value: T;
  readonly line: number;
  readonly lineStart: number;
  readonly range: [number, number];
  readonly afterSpace: boolean;

  // used for literals
  raw: string;

  // used for string literals
  readonly lastLine?: number;
  readonly lastLineStart?: number;

  // position
  readonly start: Position;
  readonly end: Position;

  constructor(options: BaseTokenOptions<T>) {
    this.type = options.type;
    this.value = options.value;
    this.line = options.line;
    this.lineStart = options.lineStart;
    this.range = options.range;
    this.lastLine = options.lastLine;
    this.lastLineStart = options.lastLineStart;
    this.afterSpace = options.afterSpace;

    const offset = options.offset;
    const range = options.range;

    this.start = new Position(this.line, range[0] - offset + 1);
    this.end = new Position(this.lastLine || this.line, range[1] - offset + 1);
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const columLeft = this.start.character;
    const columRight = this.end.character;
    const location = `${startLine}:${columLeft} - ${endLine}:${columRight}`;

    return `${this.type}[${location}: value = '${this.value}']`;
  }
}

export class Token extends BaseToken<string> {}

export interface TokenLiteralOptions
  extends BaseTokenOptions<string | number | boolean> {
  raw: string;
}

export class LiteralToken extends BaseToken<string | number | boolean> {
  declare readonly raw: string;

  constructor(options: TokenLiteralOptions) {
    super(options);
    this.raw = options.raw;
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const columLeft = this.start.character;
    const columRight = this.end.character;
    const location = `${startLine}:${columLeft} - ${endLine}:${columRight}`;

    return `${this.type}[${location}: value = ${this.raw}]`;
  }
}
