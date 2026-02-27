import { Token, TokenType } from '../lexer/token';
import { ASTType } from './ast';

export function describeToken(token: Token): string {
  switch (token.type) {
    case TokenType.EOF: return 'end of file';
    case TokenType.EOL: return 'end of line';
    default: return `'${token.value}'`;
  }
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
