import { ASTBase, ASTBaseOptions, ASTType } from './base';

export enum ASTIdentifierKind {
  Variable = 'variable',
  Argument = 'argument',
  ForInVariable = 'for-in-variable',
  Property = 'property',
}

export interface ASTIdentifierOptions extends ASTBaseOptions {
  name: string;
  kind: ASTIdentifierKind;
}

export class ASTIdentifier extends ASTBase {
  name: string;
  kind: ASTIdentifierKind;

  constructor(options: ASTIdentifierOptions) {
    super(ASTType.Identifier, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.name = options.name;
    this.kind = options.kind;
  }

  toString(): string {
    return `Identifier[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.name}]`;
  }

  clone(): ASTIdentifier {
    return new ASTIdentifier({
      name: this.name,
      kind: this.kind,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });
  }
}

export interface ASTMemberExpressionOptions extends ASTBaseOptions {
  indexer: string;
  identifier: ASTBase;
  base: ASTBase;
}

export class ASTMemberExpression extends ASTBase {
  indexer: string;
  identifier: ASTBase;
  base: ASTBase;

  constructor(options: ASTMemberExpressionOptions) {
    super(ASTType.MemberExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.indexer = options.indexer;
    this.identifier = options.identifier;
    this.base = options.base;
  }

  toString(): string {
    return `MemberExpression[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.base}.${this.identifier}]`;
  }

  clone(): ASTMemberExpression {
    return new ASTMemberExpression({
      indexer: this.indexer,
      identifier: this.identifier.clone(),
      base: this.base,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });
  }
}

export interface ASTIndexExpressionOptions extends ASTBaseOptions {
  base: ASTBase;
  index: ASTBase;
  isStatementStart: boolean;
}

export class ASTIndexExpression extends ASTBase {
  base: ASTBase;
  index: ASTBase;
  isStatementStart: boolean;

  constructor(options: ASTIndexExpressionOptions) {
    super(ASTType.IndexExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.base = options.base;
    this.index = options.index;
    this.isStatementStart = options.isStatementStart;
  }

  toString(): string {
    return `IndexExpression[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}]${this.isStatementStart ? '[isStatementStart]' : ''}[${this.base}[${this.index}]]`;
  }

  clone(): ASTIndexExpression {
    return new ASTIndexExpression({
      base: this.base.clone(),
      index: this.index.clone(),
      isStatementStart: this.isStatementStart,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });
  }
}
