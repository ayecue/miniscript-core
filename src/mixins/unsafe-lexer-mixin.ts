import { Token, TokenType } from '../lexer/token';
import { ErrorCode, LexerException } from '../types/errors';
import { LexerShape } from '../types/lexer';
import { Range } from '../types/range';

type LexerConstructor<T extends LexerShape> = new (...args: any[]) => T;

export default function UnsafeLexerMixin<T extends LexerConstructor<LexerShape>>(Base: T) {
  return class UnsafeLexer extends Base {
    _savedIndex: number = 0;
    _savedLine: number = 1;
    _savedLineStart: number = 0;
    _savedOffset: number = 0;

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
      const err = new LexerException(message, range, code, hint);
      this.errors.push(err);

      return new Token({
        type: TokenType.Invalid,
        value: '',
        line: this.line,
        rangeStart: this.tokenStart,
        rangeEnd: this.index,
        offsetStart: this.offset,
        offsetEnd: this.offset,
        afterSpace: false
      });
    }
  };
}
