import { BaseToken, LiteralToken, Token, TokenType } from './lexer/token';
import Validator from './lexer/validator';
import { CharacterCode } from './types/codes';
import { LexerException } from './types/errors';
import { Keyword } from './types/keywords';
import { Literal } from './types/literals';
import { Operator } from './types/operators';
import { Position } from './types/position';
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
    code: CharacterCode,
    nextCode: CharacterCode | undefined,
    lastCode: CharacterCode | undefined,
    afterSpace: boolean
  ): BaseToken<any> | null {
    const me = this;
    const validator = me.validator;

    switch (code) {
      case CharacterCode.QUOTE:
        return me.scanStringLiteral(afterSpace);
      case CharacterCode.DOT:
        if (validator.isDecDigit(nextCode))
          return me.scanNumericLiteral(afterSpace);
        return me.scanPunctuator(Operator.Member, afterSpace);
      case CharacterCode.EQUAL:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.Equal, afterSpace);
        return me.scanPunctuator(Operator.Assign, afterSpace);
      case CharacterCode.ARROW_LEFT:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.LessThanOrEqual, afterSpace);
        if (CharacterCode.ARROW_LEFT === nextCode)
          return me.scanPunctuator(Operator.LeftShift, afterSpace);
        return me.scanPunctuator(Operator.LessThan, afterSpace);
      case CharacterCode.ARROW_RIGHT:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.GreaterThanOrEqual, afterSpace);
        if (CharacterCode.ARROW_RIGHT === nextCode) {
          if (CharacterCode.ARROW_RIGHT === lastCode)
            return me.scanPunctuator(Operator.UnsignedRightShift, afterSpace);
          return me.scanPunctuator(Operator.RightShift, afterSpace);
        }
        return me.scanPunctuator(Operator.GreaterThan, afterSpace);
      case CharacterCode.EXCLAMATION_MARK:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.NotEqual, afterSpace);
        return null;
      case CharacterCode.MINUS:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.SubtractShorthand, afterSpace);
        return me.scanPunctuator(Operator.Minus, afterSpace);
      case CharacterCode.PLUS:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.AddShorthand, afterSpace);
        return me.scanPunctuator(Operator.Plus, afterSpace);
      case CharacterCode.ASTERISK:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.MultiplyShorthand, afterSpace);
        return me.scanPunctuator(Operator.Asterik, afterSpace);
      case CharacterCode.SLASH:
        if (CharacterCode.EQUAL === nextCode)
          return me.scanPunctuator(Operator.DivideShorthand, afterSpace);
        return me.scanPunctuator(Operator.Slash, afterSpace);
      case CharacterCode.COLON:
        return me.scanSliceOperator(afterSpace);
      case CharacterCode.CARET:
      case CharacterCode.PERCENT:
      case CharacterCode.COMMA:
      case CharacterCode.CURLY_BRACKET_LEFT:
      case CharacterCode.CURLY_BRACKET_RIGHT:
      case CharacterCode.SQUARE_BRACKETS_LEFT:
      case CharacterCode.SQUARE_BRACKETS_RIGHT:
      case CharacterCode.PARENTHESIS_LEFT:
      case CharacterCode.PARENTHESIS_RIGHT:
      case CharacterCode.AT_SIGN:
      case CharacterCode.AMPERSAND:
      case CharacterCode.VERTICAL_LINE:
        return me.scanPunctuator(String.fromCharCode(code), afterSpace);
      case CharacterCode.NUMBER_0:
      case CharacterCode.NUMBER_1:
      case CharacterCode.NUMBER_2:
      case CharacterCode.NUMBER_3:
      case CharacterCode.NUMBER_4:
      case CharacterCode.NUMBER_5:
      case CharacterCode.NUMBER_6:
      case CharacterCode.NUMBER_7:
      case CharacterCode.NUMBER_8:
      case CharacterCode.NUMBER_9:
        return me.scanNumericLiteral(afterSpace);
      case CharacterCode.SEMICOLON:
        me.nextIndex();
        return me.createEOL(afterSpace);
      default:
        return null;
    }
  }

  isNotEOF(): boolean {
    const me = this;
    return me.index < me.length;
  }

  nextIndex(value: number = 1): number {
    const me = this;
    me.index = me.index + value;
    return me.index;
  }

  codeAt(offset: number = 0): CharacterCode {
    const me = this;
    return <CharacterCode>me.content.charCodeAt(me.index + offset);
  }

  nextLine(): number {
    const me = this;
    me.line = me.line + 1;
    return me.line;
  }

  isStringEscaped(): boolean {
    return CharacterCode.QUOTE === this.codeAt(1);
  }

  createEOL(afterSpace: boolean): Token {
    const me = this;

    return new Token({
      type: TokenType.EOL,
      value: Operator.EndOfLine,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  scanStringLiteral(afterSpace: boolean): LiteralToken {
    const me = this;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;
    const stringStart = me.index + 1;
    let tempOffset = 0;
    let endOffset = me.offset;

    while (true) {
      me.nextIndex();

      const code = me.codeAt();

      if (me.validator.isEndOfLine(code)) {
        if (me.isWinNewline()) me.nextIndex();
        me.nextLine();
        tempOffset = me.index + 1 - me.offset;
        endOffset = me.index + 1;
      } else if (CharacterCode.QUOTE === code) {
        if (me.isStringEscaped()) {
          me.nextIndex();
        } else {
          break;
        }
      } else if (!me.isNotEOF()) {
        return me.raise(
          `Unexpected string end of file.`,
          new Range(
            new Position(beginLine, beginLineStart - endOffset),
            new Position(me.line, me.index - endOffset)
          )
        );
      }
    }

    me.nextIndex();
    const string = me.content
      .slice(stringStart, me.index - 1)
      .replace(/""/g, Operator.Escape);
    const rawString = me.content.slice(me.tokenStart, me.index);

    const token = new LiteralToken({
      type: TokenType.StringLiteral,
      value: string,
      raw: rawString,
      line: beginLine,
      lineStart: beginLineStart,
      range: [me.tokenStart, me.index - tempOffset],
      offset: me.offset,
      afterSpace,
      lastLine: me.line,
      lastLineStart: me.lineStart
    });

    me.offset = endOffset;

    return token;
  }

  scanComment(afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;

    while (me.isNotEOF()) {
      if (validator.isEndOfLine(me.codeAt())) break;
      me.nextIndex();
    }

    if (me.isWinNewline()) {
      me.nextIndex();
    }

    const value = me.content.slice(me.tokenStart + 2, me.index);

    return new Token({
      type: TokenType.Comment,
      value,
      line: beginLine,
      lineStart: beginLineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  readDecLiteral(): {
    value: number;
    raw: string;
    hasFractionPart: boolean;
  } {
    const me = this;
    const validator = me.validator;

    while (validator.isDecDigit(me.codeAt())) me.nextIndex();

    let foundFraction = false;
    if (CharacterCode.DOT === me.codeAt()) {
      foundFraction = true;
      me.nextIndex();
      while (validator.isDecDigit(me.codeAt())) me.nextIndex();
    }

    const notation = me.codeAt();
    if (
      CharacterCode.LETTER_E === notation ||
      CharacterCode.LETTER_e === notation
    ) {
      me.nextIndex();
      const operation = me.codeAt();
      if (CharacterCode.MINUS === operation || CharacterCode.PLUS === operation)
        me.nextIndex();
      while (validator.isDecDigit(me.codeAt())) me.nextIndex();
    }

    const raw = me.content.slice(me.tokenStart, me.index);

    return {
      value: parseFloat(raw),
      raw,
      hasFractionPart: foundFraction
    };
  }

  scanNumericLiteral(afterSpace: boolean): LiteralToken {
    const me = this;
    const literal = me.readDecLiteral();

    return new LiteralToken({
      type: TokenType.NumericLiteral,
      value: literal.value,
      raw: literal.raw,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  scanPunctuator(value: string, afterSpace: boolean): Token {
    const me = this;

    me.index = me.index + value.length;

    return new Token({
      type: TokenType.Punctuator,
      value,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  scanSliceOperator(afterSpace: boolean): Token {
    const me = this;

    me.index++;

    return new Token({
      type: TokenType.SliceOperator,
      value: Operator.SliceSeperator,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  isWinNewline() {
    const me = this;
    const code = me.codeAt();
    const nextCode = me.codeAt(1);

    return (
      (CharacterCode.RETURN_LINE === code &&
        CharacterCode.NEW_LINE === nextCode) ||
      (CharacterCode.NEW_LINE === code &&
        CharacterCode.RETURN_LINE === nextCode)
    );
  }

  skipToNextLine() {
    const me = this;
    let code = me.codeAt();

    while (!me.validator.isEndOfLine(code) && me.isNotEOF()) {
      me.nextIndex();
      code = me.codeAt();
    }

    if (me.isWinNewline()) me.nextIndex();

    me.nextLine();
    me.offset = me.index;

    return me.next();
  }

  skipWhiteSpace() {
    const me = this;

    while (me.isNotEOF()) {
      const code = me.codeAt();
      if (code === CharacterCode.WHITESPACE) {
        me.nextIndex();
      } else if (code === CharacterCode.TAB) {
        me.offset -= me.tabWidth - 1;
        me.nextIndex();
      } else {
        break;
      }
    }
  }

  scanIdentifierOrKeyword(afterSpace: boolean): BaseToken<any> {
    const me = this;
    const validator = me.validator;

    me.nextIndex();

    while (validator.isIdentifierPart(me.codeAt())) {
      me.nextIndex();
    }

    let value: any = me.content.slice(me.tokenStart, me.index);

    if (validator.isKeyword(value)) {
      if (value === Keyword.End) {
        me.nextIndex();

        while (validator.isIdentifierPart(me.codeAt())) {
          me.nextIndex();
        }
        value = me.content.slice(me.tokenStart, me.index);
      } else if (value === Keyword.Else) {
        const elseIfStatement = me.content.slice(me.tokenStart, me.index + 3);
        if (elseIfStatement === Keyword.ElseIf) {
          me.nextIndex(3);
          value = elseIfStatement;
        }
      }

      return new Token({
        type: TokenType.Keyword,
        value,
        line: me.line,
        lineStart: me.lineStart,
        range: [me.tokenStart, me.index],
        offset: me.offset,
        afterSpace
      });
    } else if (value === Literal.True || value === Literal.False) {
      return new LiteralToken({
        type: TokenType.BooleanLiteral,
        value: value === Literal.True,
        raw: value,
        line: me.line,
        lineStart: me.lineStart,
        range: [me.tokenStart, me.index],
        offset: me.offset,
        afterSpace
      });
    } else if (value === Literal.Null) {
      return new LiteralToken({
        type: TokenType.NilLiteral,
        value: null,
        raw: value,
        line: me.line,
        lineStart: me.lineStart,
        range: [me.tokenStart, me.index],
        offset: me.offset,
        afterSpace
      });
    }

    return new Token({
      type: TokenType.Identifier,
      value,
      line: me.line,
      lineStart: me.lineStart,
      range: [me.tokenStart, me.index],
      offset: me.offset,
      afterSpace
    });
  }

  next(): BaseToken<any> {
    const me = this;
    const validator = me.validator;

    const oldPosition = me.index;
    me.skipWhiteSpace();

    const afterSpace = oldPosition < me.index;

    if (validator.isComment(me.codeAt(), me.codeAt(1))) {
      me.tokenStart = me.index;
      return me.scanComment(afterSpace);
    }

    if (!me.isNotEOF()) {
      return new Token({
        type: TokenType.EOF,
        value: Operator.EndOfFile,
        line: me.line,
        lineStart: me.lineStart,
        range: [me.index, me.index],
        offset: me.offset,
        afterSpace
      });
    }

    const code = me.codeAt();
    const nextCode = me.codeAt(1);
    const lastCode = me.codeAt(2);

    me.tokenStart = me.index;

    if (validator.isEndOfLine(code)) {
      if (me.isWinNewline()) me.nextIndex();

      const token = me.createEOL(afterSpace);

      me.nextLine();
      me.offset = me.index + 1;
      me.lineStart = me.nextIndex();

      return token;
    }

    if (validator.isIdentifierStart(code))
      return me.scanIdentifierOrKeyword(afterSpace);

    const item = me.scan(code, nextCode, lastCode, afterSpace);

    if (item) return item;

    return me.raise(
      `Invalid character ${code} (Code: ${String.fromCharCode(code)})`,
      new Range(
        new Position(me.lineStart, me.tokenStart - me.offset),
        new Position(me.line, me.index - me.offset)
      )
    );
  }

  raise(message: string, range: Range): Token {
    const me = this;
    const err = new LexerException(message, range);

    me.errors.push(err);

    if (me.unsafe) {
      me.skipToNextLine();
      return me.next();
    }

    throw err;
  }
}
