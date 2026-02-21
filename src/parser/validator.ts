import { TokenType } from '../lexer/token';

export default class Validator {
  isNonNilLiteral(tokenType: number): boolean {
    return TokenType.StringLiteral <= tokenType && tokenType <= TokenType.BooleanLiteral;
  }

  isLiteral(tokenType: number): boolean {
    return TokenType.StringLiteral <= tokenType && tokenType <= TokenType.NilLiteral;
  }
}
