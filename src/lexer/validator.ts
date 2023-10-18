import { CharacterCode } from '../types/codes';
import { Keyword } from '../types/keywords';

export default class Validator {
  getKeywords(index: number): string[] {
    switch (index) {
      case 2:
        return [Keyword.If, Keyword.In, Keyword.Or];
      case 3:
        return [
          Keyword.And,
          Keyword.End,
          Keyword.For,
          Keyword.Not,
          Keyword.New,
          Keyword.Isa
        ];
      case 4:
        return [Keyword.Else, Keyword.Then];
      case 5:
        return [Keyword.Break, Keyword.While];
      case 6:
        return [Keyword.Return];
      case 8:
        return [Keyword.Function, Keyword.Continue];
      default:
        return [];
    }
  }

  isKeyword(value: string): boolean {
    const length = value.length;
    const keywords = this.getKeywords(length);

    return keywords.indexOf(value) !== -1;
  }

  isWhiteSpace(code: CharacterCode): boolean {
    return CharacterCode.WHITESPACE === code || CharacterCode.TAB === code;
  }

  isEndOfLine(code: CharacterCode): boolean {
    return (
      CharacterCode.NEW_LINE === code || CharacterCode.RETURN_LINE === code
    );
  }

  isComment(code: CharacterCode, nextCode: CharacterCode): boolean {
    return CharacterCode.SLASH === code && CharacterCode.SLASH === nextCode;
  }

  isIdentifierStart(code: number): boolean {
    return (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95 ||
      code >= 128
    );
  }

  isIdentifierPart(code: number): boolean {
    return (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95 ||
      (code >= 48 && code <= 57) ||
      code >= 128
    );
  }

  isDecDigit(code: CharacterCode): boolean {
    return code >= CharacterCode.NUMBER_0 && code <= CharacterCode.NUMBER_9;
  }
}
