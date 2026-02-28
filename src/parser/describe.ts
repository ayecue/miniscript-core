import { Token, TokenType } from '../lexer/token';
import { Selector } from '../types/selector';
import { ASTType } from './ast';

export function describeToken(token: Token): string {
  switch (token.type) {
    case TokenType.EOF: return `EOF('end of file')`;
    case TokenType.EOL: return `EOL('end of line')`;
    case TokenType.Keyword: return `Keyword('${token.value}')`;
    case TokenType.Identifier: return `Identifier('${token.value}')`;
    case TokenType.StringLiteral: return `String('${token.value}')`;
    case TokenType.NumericLiteral: return `Number(${token.value})`;
    case TokenType.BooleanLiteral: return `Boolean(${token.value})`;
    case TokenType.NilLiteral: return `Nil`;
    case TokenType.Punctuator: return `Punctuator('${token.value}')`;
    case TokenType.SliceOperator: return `SliceOperator('${token.value}')`;
    case TokenType.Comment: return `Comment`;
    case TokenType.Invalid: return `Unknown('${token.value}')`;
    default: return `'${token.value}'`;
  }
}

export function describeTokenRef(token: Token): string {
  return describeToken(token);
}

export function describeSelectorRef(selector: Selector): string {
  const type = selector.data.type;
  const value = selector.data.value;
  switch (type) {
    case TokenType.EOF: return `EOF('end of file')`;
    case TokenType.EOL: return `EOL('end of line')`;
    case TokenType.Keyword: return `Keyword('${value}')`;
    case TokenType.Identifier: return `Identifier('${value}')`;
    case TokenType.Punctuator: return `Punctuator('${value}')`;
    case TokenType.Comment: return `Comment`;
    default: return value !== undefined ? `${TokenType[type]}('${value}')` : `${TokenType[type]}`;
  }
}

export function joinWithOr(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1];
}

export function describeBlockType(type: string): string {
  switch (type) {
    case ASTType.IfStatement:
    case ASTType.IfShortcutStatement:
      return 'if';
    case ASTType.WhileStatement: return 'while';
    case ASTType.ForGenericStatement: return 'for';
    case ASTType.FunctionDeclaration: return 'function';
    default: return type;
  }
}
