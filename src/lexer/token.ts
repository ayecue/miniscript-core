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
  type: string;
  value: T;
  raw: string;
  line: number;
  lineStart: number;
  range: [number, number];
  lineRange: [number, number];
  afterSpace: boolean;

  // used for string literals
  lastLine?: number;
  lastLineStart?: number;

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
    const [start, end] = this.range;

    this.lineRange = [start - offset + 1, end - offset + 1];
  }

  getStart(): Position {
    return new Position(this.line, this.lineRange[0]);
  }

  getEnd(): Position {
    return new Position(this.lastLine || this.line, this.lineRange[1]);
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const [columLeft, columRight] = this.lineRange;
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
  constructor(options: TokenLiteralOptions) {
    super(options);
    this.raw = options.raw;
  }

  toString(): string {
    const startLine = this.line;
    const endLine = this.lastLine !== undefined ? this.lastLine : this.line;
    const [columLeft, columRight] = this.lineRange;
    const location = `${startLine}:${columLeft} - ${endLine}:${columRight}`;

    return `${this.type}[${location}: value = ${this.raw}]`;
  }
}
