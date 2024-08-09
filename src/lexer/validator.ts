import { CharacterCode } from '../types/codes';
import { Keyword } from '../types/keywords';

export default class Validator {
  isKeyword = Set.prototype.has.bind(new Set(Object.values(Keyword)));

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
      ((code | 32) >= 97 && (code | 32) <= 122) || // a-z or A-Z
      code >= 128 || // extended ASCII
      code === 95 // _
    );
  }

  isIdentifierPart(code: number): boolean {
    return (
      ((code | 32) >= 97 && (code | 32) <= 122) || // a-z or A-Z
      (code >= 48 && code <= 57) || // 0-9
      code >= 128 || // extended ASCII
      code === 95 // _
    );
  }

  isDecDigit(code: number): boolean {
    return code >= CharacterCode.NUMBER_0 && code <= CharacterCode.NUMBER_9;
  }

  isWinNewline(code: number, nextCode: number) {
    switch (code) {
      case CharacterCode.RETURN_LINE:
        return CharacterCode.NEW_LINE === nextCode;
      case CharacterCode.NEW_LINE:
        return CharacterCode.RETURN_LINE === nextCode;
    }
    return false;
  }
}
