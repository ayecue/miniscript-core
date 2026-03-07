import { CharacterCode } from '../types/codes';
import { Keyword } from '../types/keywords';

export default class Validator {
  readonly isKeyword = Set.prototype.has.bind(
    new Set([
      Keyword.If,
      Keyword.In,
      Keyword.Or,
      Keyword.And,
      Keyword.Isa,
      Keyword.For,
      Keyword.Not,
      Keyword.New,
      Keyword.End,
      Keyword.EndFor,
      Keyword.EndWhile,
      Keyword.EndFunction,
      Keyword.EndIf,
      Keyword.Then,
      Keyword.Else,
      Keyword.Break,
      Keyword.While,
      Keyword.ElseIf,
      Keyword.Return,
      Keyword.Function,
      Keyword.Continue,
      Keyword.Repeat
    ])
  );

  isWhitespace(code: number): boolean {
    return CharacterCode.WHITESPACE === code || CharacterCode.TAB === code;
  }

  isEndOfLine(code: number): boolean {
    return (
      CharacterCode.NEW_LINE === code || CharacterCode.RETURN_LINE === code
    );
  }

  isComment(code: number, nextCode: number): boolean {
    return CharacterCode.SLASH === code && CharacterCode.SLASH === nextCode;
  }

  isIdentifierStart(code: number): boolean {
    return (
      ((code | CharacterCode.WHITESPACE) - 97) >>> 0 < 26 ||
      code === 95 ||
      code >= 128
    );
  }

  isIdentifierPart(code: number): boolean {
    return (
      ((code | CharacterCode.WHITESPACE) - 97) >>> 0 < 26 ||
      (code - 48) >>> 0 < 10 ||
      code === 95 ||
      code >= 128
    );
  }

  isDecDigit(code: number): boolean {
    return (code - 48) >>> 0 < 10;
  }

  isWinNewline(code: number, nextCode: number): boolean {
    return (
      (code ^ nextCode) === 7 &&
      (code === CharacterCode.NEW_LINE || code === CharacterCode.RETURN_LINE)
    );
  }
}
