import { BaseToken, LiteralToken, Token, TokenType } from './lexer/token';
import Validator from './lexer/validator';
import { CharacterCode } from './types/codes';
import { LexerException } from './types/errors';
import { Keyword } from './types/keywords';
import { Literal } from './types/literals';
import { Operator } from './types/operators';
import { Position } from './types/position';
import { Range } from './types/range';
import Queue from './utils/queue';

export interface LexerOptions {
  validator?: Validator;
  unsafe?: boolean;
  tabWidth?: number;
}

function defaultScanHandler(this: Lexer, afterSpace: boolean) {
  const value = this.content[this.index];
  this.index += value.length;
  return this.createPunctuator(value, afterSpace);
}

export default class Lexer {
  content: string;
  length: number;
  index: number;
  tokenStart: number | null;
  line: number;
  lineStart: number;
  offset: number;
  tabWidth: number;

  validator: Validator;
  unsafe: boolean;
  errors: Error[];

  backlog: Queue<Token>;
  snapshot: Queue<Token>;

  constructor(content: string, options: LexerOptions = {}) {
    const me = this;

    me.content = content;
    me.length = content.length;
    me.index = 0;
    me.tokenStart = null;
    me.tabWidth = options.tabWidth || 1;
    me.line = 1;
    me.lineStart = 0;
    me.offset = 0;
    me.validator = options.validator || new Validator();
    me.unsafe = options.unsafe;
    me.errors = [];
    me.backlog = new Queue();
    me.snapshot = new Queue();
  }

  private static scanHandlers: Record<string, (this: Lexer, afterSpace: boolean) => BaseToken<any> | null> = {
    [CharacterCode.QUOTE]: function quoteHandler(this, afterSpace) {
      return this.scanStringLiteral(afterSpace);
    },
    [CharacterCode.DOT]: function dotHandler(this, afterSpace) {
      if (this.validator.isDecDigit(this.codeAt(1)))
        return this.scanNumericLiteral(afterSpace);
      this.index++;
      return this.createPunctuator(Operator.Member, afterSpace);
    },
    [CharacterCode.EQUAL]: function equalHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1)) {
        return this.scanPunctuator(Operator.Equal, afterSpace);
      }
      return this.scanPunctuator(Operator.Assign, afterSpace);
    },
    [CharacterCode.ARROW_LEFT]: function arrowLeftHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.LessThanOrEqual, afterSpace);
      return this.scanPunctuator(Operator.LessThan, afterSpace);
    },
    [CharacterCode.ARROW_RIGHT]: function arrowRightHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.GreaterThanOrEqual, afterSpace);
      return this.scanPunctuator(Operator.GreaterThan, afterSpace);
    },
    [CharacterCode.EXCLAMATION_MARK]: function exclamationMarkHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.NotEqual, afterSpace);
      this.index++;
      return null;
    },
    [CharacterCode.MINUS]: function minusHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.SubtractShorthand, afterSpace);
      return this.scanPunctuator(Operator.Minus, afterSpace);
    },
    [CharacterCode.PLUS]: function plusHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.AddShorthand, afterSpace);
      return this.scanPunctuator(Operator.Plus, afterSpace);
    },
    [CharacterCode.ASTERISK]: function asteriskHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.MultiplyShorthand, afterSpace);
      return this.scanPunctuator(Operator.Asterik, afterSpace);
    },
    [CharacterCode.SLASH]: function slashHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.DivideShorthand, afterSpace);
      return this.scanPunctuator(Operator.Slash, afterSpace);
    },
    [CharacterCode.COLON]: function colonHandler(this, afterSpace) {
      this.index++;
      return this.createSlice(afterSpace);
    },
    [CharacterCode.CARET]: function caretHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.PowerShorthand, afterSpace);
      return this.scanPunctuator(Operator.Power, afterSpace);
    },
    [CharacterCode.PERCENT]: function percentHandler(this, afterSpace) {
      if (CharacterCode.EQUAL === this.codeAt(1))
        return this.scanPunctuator(Operator.ModuloShorthand, afterSpace);
      return this.scanPunctuator(Operator.Modulo, afterSpace);
    },
    [CharacterCode.SEMICOLON]: function semicolonHandler(this, afterSpace) {
      this.index++;
      return this.createEOL(afterSpace);
    },
    [CharacterCode.COMMA]: defaultScanHandler,
    [CharacterCode.CURLY_BRACKET_LEFT]: defaultScanHandler,
    [CharacterCode.CURLY_BRACKET_RIGHT]: defaultScanHandler,
    [CharacterCode.SQUARE_BRACKETS_LEFT]: defaultScanHandler,
    [CharacterCode.SQUARE_BRACKETS_RIGHT]: defaultScanHandler,
    [CharacterCode.PARENTHESIS_LEFT]: defaultScanHandler,
    [CharacterCode.PARENTHESIS_RIGHT]: defaultScanHandler,
    [CharacterCode.AT_SIGN]: defaultScanHandler
  };

  scan(
    code: number,
    afterSpace: boolean
  ): BaseToken<any> | null {
    const handler = Lexer.scanHandlers[code];

    if (handler) return handler.call(this, afterSpace);
    if (this.validator.isDecDigit(code)) return this.scanNumericLiteral(afterSpace);

    this.index++;
    return null;
  }

  isAtWhitespace(): boolean {
    return this.validator.isWhitespace(this.codeAt())
  }

  codeAt(offset: number = 0): number {
    const index = this.index + offset;
    if (index < this.length) return <CharacterCode>this.content.charCodeAt(index);
    return 0;
  }

  createEOL(afterSpace: boolean): Token {
    const me = this;
    const token = new Token({
      type: TokenType.EOL,
      value: Operator.EndOfLine,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(token);

    return token;
  }

  createIdentifier(value: string, afterSpace: boolean) {
    const me = this;
    const token = new Token({
      type: TokenType.Identifier,
      value,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(token);

    return token;
  }

  createEOF(afterSpace: boolean) {
    const me = this;
    const token = new Token({
      type: TokenType.EOF,
      value: Operator.EndOfFile,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.index, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(token);

    return token;
  }

  createBoolean(value: string, afterSpace: boolean) {
    const me = this;
    const literalToken = new LiteralToken({
      type: TokenType.BooleanLiteral,
      value: value === Literal.True,
      raw: value,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(literalToken as Token);

    return literalToken;
  }

  createNull(afterSpace: boolean) {
    const me = this;
    const literalToken = new LiteralToken({
      type: TokenType.NilLiteral,
      value: null,
      raw: Literal.Null,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(literalToken as Token);

    return literalToken;
  }

  createSlice(afterSpace: boolean) {
    const token = new Token({
      type: TokenType.SliceOperator,
      value: Operator.SliceSeperator,
      line: this.line,
      lineStart: this.lineStart,
      range: [this.tokenStart, this.index],
      offsetRange: [this.offset, this.offset],
      afterSpace
    });

    this.snapshot.enqueue(token);

    return token;
  }

  createPunctuator(value: string, afterSpace: boolean) {
    const token = new Token({
      type: TokenType.Punctuator,
      value,
      line: this.line,
      lineStart: this.lineStart,
      range: [this.tokenStart, this.index],
      offsetRange: [this.offset, this.offset],
      afterSpace
    });

    this.snapshot.enqueue(token);

    return token;
  }

  createNumericLiteral(value: number, raw: string, afterSpace: boolean) {
    const literalToken = new LiteralToken({
      type: TokenType.NumericLiteral,
      value: value,
      raw: raw,
      line: this.line,
      lineStart: this.lineStart,
      range: [this.tokenStart, this.index],
      offsetRange: [this.offset, this.offset],
      afterSpace
    });

    this.snapshot.enqueue(literalToken as Token);

    return literalToken;
  }

  scanStringLiteral(afterSpace: boolean): LiteralToken {
    const me = this;
    const validator = me.validator;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;
    const strStart = me.index;
    const strStartOffset = me.offset;
    let endOffset = me.offset;
    let closed = false;

    while (me.index < me.length) {
      me.index++;

      const code = me.codeAt();

      if (me.validator.isEndOfLine(code)) {
        if (validator.isWinNewline(code, me.codeAt(1))) me.index++;
        me.line++;
        endOffset = me.index + 1;
      } else if (CharacterCode.QUOTE === code) {
        if (CharacterCode.QUOTE !== me.codeAt(1)) {
          closed = true;
          break;
        }
        me.index++;
      }
    }

    if (!closed) {
      return me.raise(
        `Unexpected string end of file.`,
        new Range(
          new Position(beginLine, strStart - strStartOffset + 1),
          new Position(me.line, me.index - endOffset + 2)
        )
      );
    }

    me.index++;
    const rawString = me.content.slice(me.tokenStart, me.index);
    const string = rawString
      .slice(1, -1)
      .replace(/""/g, Operator.Escape);

    const literalToken = new LiteralToken({
      type: TokenType.StringLiteral,
      value: string,
      raw: rawString,
      line: beginLine,
      lineStart: beginLineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [strStartOffset, endOffset],
      afterSpace,
      lastLine: me.line,
      lastLineStart: me.lineStart
    });

    me.offset = endOffset;
    me.snapshot.enqueue(literalToken as Token);

    return literalToken;
  }

  scanComment(afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;

    for (; this.index < this.length && !validator.isEndOfLine(me.codeAt()); me.index++);

    if (validator.isWinNewline(me.codeAt(), me.codeAt(1))) me.index++;

    const value = me.content.slice(me.tokenStart + 2, me.index);
    const token = new Token({
      type: TokenType.Comment,
      value,
      line: beginLine,
      lineStart: beginLineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(token);

    return token;
  }

  scanNumericLiteral(afterSpace: boolean): Token {
    const validator = this.validator;
    let previous;
    let current;

    while (this.index < this.length) {
      previous = current;
      current = this.codeAt();

      if (
        validator.isDecDigit(current) ||
        CharacterCode.DOT === current ||
        CharacterCode.LETTER_E === current ||
        CharacterCode.LETTER_e === current ||
        ((CharacterCode.MINUS === current || CharacterCode.PLUS === current) && (CharacterCode.LETTER_E === previous ||
          CharacterCode.LETTER_e === previous))
      ) {
        this.index++;
      } else {
        break;
      }
    }

    const raw = this.content.slice(this.tokenStart, this.index);
    const value = Number(raw);

    if (isNaN(value)) {
      return this.raise(
        `Invalid numeric literal: ${raw}`,
        new Range(
          new Position(this.line, this.tokenStart - this.offset + 1),
          new Position(this.line, this.index - this.offset + 1)
        )
      );
    }

    return this.createNumericLiteral(value, raw, afterSpace) as Token;
  }

  scanPunctuator(value: string, afterSpace: boolean) {
    this.index += value.length;
    return this.createPunctuator(value, afterSpace);
  }

  skipWhiteSpace() {
    const me = this;

    for (; me.index < me.length; me.index++) {
      const code = me.content[me.index];
      if (code === '\t') {
        me.offset -= me.tabWidth - 1;
      } else if (code !== ' ') {
        return;
      }
    }
  }

  scanKeyword(keyword: string, afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;
    let value = keyword;

    switch (keyword) {
      case Keyword.End: {
        me.index++;

        for (; validator.isIdentifierPart(me.codeAt()); me.index++);
        value = me.content.slice(me.tokenStart, me.index);
        break;
      }
      case Keyword.Else: {
        const elseIfStatement = me.content.slice(me.tokenStart, me.index + 3);
        if (elseIfStatement === Keyword.ElseIf) {
          me.index += 3;
          value = elseIfStatement;
        }
        break;
      }
    }

    const token = new Token({
      type: TokenType.Keyword,
      value,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offsetRange: [me.offset, me.offset],
      afterSpace
    });

    me.snapshot.enqueue(token);

    return token;
  }

  scanIdentifierOrKeyword(afterSpace: boolean): BaseToken<any> {
    const me = this;
    const validator = me.validator;

    me.index++;

    for (; validator.isIdentifierPart(me.codeAt()); me.index++);

    const value: string = me.content.slice(me.tokenStart, me.index);

    if (validator.isKeyword(value)) return me.scanKeyword(value, afterSpace);

    switch (value) {
      case Literal.True:
      case Literal.False: {
        return me.createBoolean(value, afterSpace);
      }
      case Literal.Null: {
        return me.createNull(afterSpace);
      }
    }

    return me.createIdentifier(value, afterSpace);
  }

  next(): BaseToken<any> {
    const me = this;

    if (me.backlog.size) {
      return me.backlog.dequeue();
    }

    const oldPosition = me.index;
    me.skipWhiteSpace();
    const afterSpace = oldPosition < me.index;

    const code = me.codeAt();

    if (me.validator.isComment(code, me.codeAt(1))) {
      me.tokenStart = me.index;
      return me.scanComment(afterSpace);
    }

    if (this.index >= this.length) {
      return me.createEOF(afterSpace);
    }

    me.tokenStart = me.index;

    if (me.validator.isEndOfLine(code)) {
      if (me.validator.isWinNewline(code, me.codeAt(1))) me.index++;

      const token = me.createEOL(afterSpace);

      me.line++;
      me.offset = me.index + 1;
      me.lineStart = ++me.index;

      return token;
    }

    if (me.validator.isIdentifierStart(code))
      return me.scanIdentifierOrKeyword(afterSpace);

    const beginLine = me.line;
    const item = me.scan(code, afterSpace);

    if (item) return item;

    return me.raise(
      `Invalid character ${code} (Code: ${String.fromCharCode(code)})`,
      new Range(
        new Position(beginLine, me.tokenStart - me.offset + 1),
        new Position(me.line, me.index - me.offset + 1)
      )
    );
  }

  recordSnapshot() {
    this.snapshot.clear();
  }

  recoverFromSnapshot() {
    this.backlog.copyInto(this.snapshot);
  }

  raise(message: string, range: Range): Token {
    const me = this;
    const err = new LexerException(message, range);

    me.errors.push(err);

    if (me.unsafe) {
      return new Token({
        type: TokenType.Invalid,
        value: '',
        line: me.line,
        lineStart: me.lineStart,
        range: [me.tokenStart, me.index],
        offsetRange: [me.offset, me.offset],
      });
    }

    throw err;
  }
}
