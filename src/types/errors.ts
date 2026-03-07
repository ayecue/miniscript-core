import { Range } from './range';

export enum ErrorCode {
  Unknown = 0,

  // Lexer errors (1xxx)
  InvalidCharacter = 1001,
  UnexpectedStringEOF = 1002,
  InvalidNumericLiteral = 1003,
  InvalidEndKeyword = 1004,

  // Parser errors — unexpected (2xxx)
  UnexpectedToken = 2001,
  UnexpectedKeyword = 2002,

  // Parser errors — expected (3xxx)
  ExpectedToken = 3001,
  ExpectedExpression = 3002,
  ExpectedCondition = 3003,

  // Parser errors — block structure (4xxx)
  NoMatchingBlock = 4001,
  UnclosedBlock = 4002,

  // Parser errors — context (5xxx)
  BreakOutsideLoop = 5001,
  ContinueOutsideLoop = 5002,
  InvalidDefaultValue = 5003,
  TrailingCommaInParams = 5004
}

export class LexerException extends Error {
  code: ErrorCode;
  range: Range;
  hint: string | null;

  constructor(
    message: string,
    range: Range,
    code: ErrorCode = ErrorCode.Unknown,
    hint?: string
  ) {
    super(message);
    this.code = code;
    this.range = range;
    this.hint = hint ?? null;
  }
}

export class ParserException extends Error {
  code: ErrorCode;
  range: Range;
  hint: string | null;

  constructor(
    message: string,
    range: Range,
    code: ErrorCode = ErrorCode.Unknown,
    hint?: string
  ) {
    super(message);
    this.code = code;
    this.range = range;
    this.hint = hint ?? null;
  }
}
