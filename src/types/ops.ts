import type { Token } from '../lexer/token';
import type Parser from '../parser';
import type { ASTBase } from '../parser/ast';

export interface PrefixOp {
  match(parser: Parser): boolean;
  threshold: number;
  selectorId: number;
  parse(
    parser: Parser,
    startToken: Token,
    asLval: boolean,
    statementStart: boolean
  ): ASTBase;
}

export interface InfixOp {
  match(parser: Parser, asLval: boolean, statementStart: boolean): boolean;
  precedence: number;
  selectorId: number;
  parse(
    parser: Parser,
    left: ASTBase,
    startToken: Token,
    asLval: boolean,
    statementStart: boolean
  ): ASTBase;
}

export interface PrefixOpLevel {
  threshold: number;
  ops: PrefixOp[];
  next: PrefixOpLevel | null;
}

export interface InfixOpLevel {
  precedence: number;
  ops: InfixOp[];
  next: InfixOpLevel | null;
}

export interface AtomOp {
  match(parser: Parser): boolean;
  selectorId: number;
  parse(parser: Parser, asLval: boolean, statementStart: boolean): ASTBase;
}

export interface KeywordOp {
  selectorId: number;
  parse(parser: Parser): void;
}

export type KeywordStatementHandler = (parser: Parser) => void;
