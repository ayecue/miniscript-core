import { TokenType } from '../lexer/token';

export default class Validator {
  getNonNilLiterals(): TokenType[] {
    return [
      TokenType.StringLiteral,
      TokenType.NumericLiteral,
      TokenType.BooleanLiteral
    ];
  }

  getLiterals(): TokenType[] {
    return [...this.getNonNilLiterals(), TokenType.NilLiteral];
  }

  isNonNilLiteral(type: TokenType): boolean {
    return this.getNonNilLiterals().indexOf(type) !== -1;
  }

  isLiteral(type: TokenType): boolean {
    return this.getLiterals().indexOf(type) !== -1;
  }
}
