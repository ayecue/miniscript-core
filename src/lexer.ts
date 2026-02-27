import { BaseToken, LiteralToken, Token, TokenType } from './lexer/token';
import Validator from './lexer/validator';
import { CharacterCode } from './types/codes';
import { ErrorCode, LexerException } from './types/errors';
import { Keyword } from './types/keywords';
import { Literal } from './types/literals';
import { Operator } from './types/operators';
import { Range } from './types/range';

export interface LexerOptions {
  validator?: Validator;
  unsafe?: boolean;
  tabWidth?: number;
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

  private _savedIndex: number = 0;
  private _savedLine: number = 1;
  private _savedLineStart: number = 0;
  private _savedOffset: number = 0;

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
  }

  scan(
    code: number,
    afterSpace: boolean
  ): BaseToken<any> | null {
    switch (code) {
      case CharacterCode.QUOTE:
        return this.scanStringLiteral(afterSpace);
      case CharacterCode.DOT:
        if (this.validator.isDecDigit(this.codeAt(1)))
          return this.scanNumericLiteral(afterSpace);
        this.index++;
        return this.createPunctuator(Operator.Member, afterSpace);
      case CharacterCode.EQUAL:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.Equal, afterSpace);
        return this.scanPunctuator(Operator.Assign, afterSpace);
      case CharacterCode.ARROW_LEFT:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.LessThanOrEqual, afterSpace);
        return this.scanPunctuator(Operator.LessThan, afterSpace);
      case CharacterCode.ARROW_RIGHT:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.GreaterThanOrEqual, afterSpace);
        return this.scanPunctuator(Operator.GreaterThan, afterSpace);
      case CharacterCode.EXCLAMATION_MARK:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.NotEqual, afterSpace);
        this.index++;
        return null;
      case CharacterCode.MINUS:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.SubtractShorthand, afterSpace);
        return this.scanPunctuator(Operator.Minus, afterSpace);
      case CharacterCode.PLUS:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.AddShorthand, afterSpace);
        return this.scanPunctuator(Operator.Plus, afterSpace);
      case CharacterCode.ASTERISK:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.MultiplyShorthand, afterSpace);
        return this.scanPunctuator(Operator.Asterik, afterSpace);
      case CharacterCode.SLASH:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.DivideShorthand, afterSpace);
        return this.scanPunctuator(Operator.Slash, afterSpace);
      case CharacterCode.COLON:
        this.index++;
        return this.createSlice(afterSpace);
      case CharacterCode.CARET:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.PowerShorthand, afterSpace);
        return this.scanPunctuator(Operator.Power, afterSpace);
      case CharacterCode.PERCENT:
        if (CharacterCode.EQUAL === this.codeAt(1))
          return this.scanPunctuator(Operator.ModuloShorthand, afterSpace);
        return this.scanPunctuator(Operator.Modulo, afterSpace);
      case CharacterCode.SEMICOLON:
        this.index++;
        return this.createEOL(afterSpace);
      case CharacterCode.COMMA:
        this.index++;
        return this.createPunctuator(Operator.Comma, afterSpace);
      case CharacterCode.CURLY_BRACKET_LEFT:
        this.index++;
        return this.createPunctuator(Operator.CLBracket, afterSpace);
      case CharacterCode.CURLY_BRACKET_RIGHT:
        this.index++;
        return this.createPunctuator(Operator.CRBracket, afterSpace);
      case CharacterCode.SQUARE_BRACKETS_LEFT:
        this.index++;
        return this.createPunctuator(Operator.SLBracket, afterSpace);
      case CharacterCode.SQUARE_BRACKETS_RIGHT:
        this.index++;
        return this.createPunctuator(Operator.SRBracket, afterSpace);
      case CharacterCode.PARENTHESIS_LEFT:
        this.index++;
        return this.createPunctuator(Operator.LParenthesis, afterSpace);
      case CharacterCode.PARENTHESIS_RIGHT:
        this.index++;
        return this.createPunctuator(Operator.RParenthesis, afterSpace);
      case CharacterCode.AT_SIGN:
        this.index++;
        return this.createPunctuator(Operator.Reference, afterSpace);
      default:
        if (this.validator.isDecDigit(code)) return this.scanNumericLiteral(afterSpace);
        this.index++;
        return null;
    }
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
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

    return token;
  }

  createIdentifier(value: string, afterSpace: boolean) {
    const me = this;
    const token = new Token({
      type: TokenType.Identifier,
      value,
      line: me.line,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

    return token;
  }

  createEOF(afterSpace: boolean) {
    const me = this;
    const token = new Token({
      type: TokenType.EOF,
      value: Operator.EndOfFile,
      line: me.line,
      rangeStart: me.index,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

    return token;
  }

  createBoolean(value: string, afterSpace: boolean) {
    const me = this;
    const literalToken = new LiteralToken({
      type: TokenType.BooleanLiteral,
      value: value === Literal.True,
      raw: value,
      line: me.line,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

    return literalToken;
  }

  createNull(afterSpace: boolean) {
    const me = this;
    const literalToken = new LiteralToken({
      type: TokenType.NilLiteral,
      value: null,
      raw: Literal.Null,
      line: me.line,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

    return literalToken;
  }

  createSlice(afterSpace: boolean) {
    const token = new Token({
      type: TokenType.SliceOperator,
      value: Operator.SliceSeperator,
      line: this.line,
      rangeStart: this.tokenStart,
      rangeEnd: this.index,
      offsetStart: this.offset,
      offsetEnd: this.offset,
      afterSpace
    });

    return token;
  }

  createPunctuator(value: string, afterSpace: boolean) {
    const token = new Token({
      type: TokenType.Punctuator,
      value,
      line: this.line,
      rangeStart: this.tokenStart,
      rangeEnd: this.index,
      offsetStart: this.offset,
      offsetEnd: this.offset,
      afterSpace
    });

    return token;
  }

  createNumericLiteral(value: number, raw: string, afterSpace: boolean) {
    const literalToken = new LiteralToken({
      type: TokenType.NumericLiteral,
      value,
      raw,
      line: this.line,
      rangeStart: this.tokenStart,
      rangeEnd: this.index,
      offsetStart: this.offset,
      offsetEnd: this.offset,
      afterSpace
    });

    return literalToken;
  }

  scanStringLiteral(afterSpace: boolean): LiteralToken | Token {
    const me = this;
    const validator = me.validator;
    const beginLine = me.line;
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
        `Unterminated string literal`,
        new Range(
          [beginLine, strStart - strStartOffset + 1],
          [me.line, me.index - endOffset + 2]
        ),
        ErrorCode.UnexpectedStringEOF,
        `Add a closing quote to terminate the string`
      );
    }

    me.index++;
    const rawString = me.content.slice(me.tokenStart, me.index);
    const inner = rawString.length > 2 ? rawString.slice(1, -1) : '';
    const string = inner.indexOf('""') !== -1
      ? inner.replace(/""/g, Operator.Escape)
      : inner;

    const literalToken = new LiteralToken({
      type: TokenType.StringLiteral,
      value: string,
      raw: rawString,
      line: beginLine,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: strStartOffset,
      offsetEnd: endOffset,
      afterSpace,
      lastLine: me.line
    });

    me.offset = endOffset;

    return literalToken;
  }

  scanComment(afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;
    const beginLine = me.line;

    for (; this.index < this.length && !validator.isEndOfLine(me.codeAt()); me.index++);

    if (validator.isWinNewline(me.codeAt(), me.codeAt(1))) me.index++;

    const value = me.content.slice(me.tokenStart + 2, me.index);
    const token = new Token({
      type: TokenType.Comment,
      value,
      line: beginLine,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

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
        `Invalid numeric literal '${raw}'`,
        new Range(
          [this.line, this.tokenStart - this.offset + 1],
          [this.line, this.index - this.offset + 1]
        ),
        ErrorCode.InvalidNumericLiteral
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
      const code = me.content.charCodeAt(me.index);
      if (code === CharacterCode.TAB) {
        me.offset -= me.tabWidth - 1;
      } else if (code !== CharacterCode.WHITESPACE) {
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
        // Byte-level lookahead: check " if" without allocating a string slice
        const remaining = me.length - me.index;
        if (
          remaining >= 3 &&
          me.content.charCodeAt(me.index) === CharacterCode.WHITESPACE &&
          me.content.charCodeAt(me.index + 1) === CharacterCode.LETTER_i && // 'i'
          me.content.charCodeAt(me.index + 2) === CharacterCode.LETTER_f && // 'f'
          (me.index + 3 >= me.length || !validator.isIdentifierPart(me.content.charCodeAt(me.index + 3)))
        ) {
          me.index += 3;
          value = Keyword.ElseIf;
        }
        break;
      }
    }

    const token = new Token({
      type: TokenType.Keyword,
      value,
      line: me.line,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: me.offset,
      offsetEnd: me.offset,
      afterSpace
    });

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
      `Invalid character '${String.fromCharCode(code)}'`,
      new Range(
        [beginLine, me.tokenStart - me.offset + 1],
        [me.line, me.index - me.offset + 1]
      ),
      ErrorCode.InvalidCharacter
    );
  }

  recordSnapshot() {
    this._savedIndex = this.index;
    this._savedLine = this.line;
    this._savedLineStart = this.lineStart;
    this._savedOffset = this.offset;
  }

  recoverFromSnapshot() {
    this.index = this._savedIndex;
    this.line = this._savedLine;
    this.lineStart = this._savedLineStart;
    this.offset = this._savedOffset;
  }

  raise(message: string, range: Range, code: ErrorCode = ErrorCode.Unknown, hint?: string): Token {
    const me = this;
    const err = new LexerException(message, range, code, hint);

    me.errors.push(err);

    if (me.unsafe) {
      return new Token({
        type: TokenType.Invalid,
        value: '',
        line: me.line,
        rangeStart: me.tokenStart,
        rangeEnd: me.index,
        offsetStart: me.offset,
        offsetEnd: me.offset,
        afterSpace: false
      });
    }

    throw err;
  }
}
