import { TokenType } from '../lexer/token';

export default class Validator {
  isNonNilLiteral = Set.prototype.has.bind(
    new Set([
      TokenType.StringLiteral,
      TokenType.NumericLiteral,
      TokenType.BooleanLiteral
    ])
  );

  isLiteral = Set.prototype.has.bind(
    new Set([
      TokenType.StringLiteral,
      TokenType.NumericLiteral,
      TokenType.BooleanLiteral,
      TokenType.NilLiteral
    ])
  );

  isComment(type: string) {
    return type === TokenType.Comment;
  }
}
