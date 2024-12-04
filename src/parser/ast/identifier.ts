import { ASTBase, ASTBaseOptions, ASTType } from './base';

export enum ASTIdentifierKind {
  Variable = 'variable',
  Argument = 'argument',
  ForInVariable = 'for-in-variable',
  ForInIdxVariable = 'for-in-idx-variable',
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
    super(ASTType.Identifier, options);
    this.name = options.name;
    this.kind = options.kind;
  }

  toString(): string {
    return `Identifier[${this.start}-${this.end}][${this.name}]`;
  }

  clone(): ASTIdentifier {
    return new ASTIdentifier({
      name: this.name,
      kind: this.kind,
      start: this.start,
      end: this.end,
      range: this.range,
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
    super(ASTType.MemberExpression, options);
    this.indexer = options.indexer;
    this.identifier = options.identifier;
    this.base = options.base;
  }

  toString(): string {
    return `MemberExpression[${this.start}-${this.end}][${this.base}.${this.identifier}]`;
  }

  clone(): ASTMemberExpression {
    return new ASTMemberExpression({
      indexer: this.indexer,
      identifier: this.identifier.clone(),
      base: this.base,
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}

export interface ASTIndexExpressionOptions extends ASTBaseOptions {
  base: ASTBase;
  index: ASTBase;
}

export class ASTIndexExpression extends ASTBase {
  base: ASTBase;
  index: ASTBase;

  constructor(options: ASTIndexExpressionOptions) {
    super(ASTType.IndexExpression, options);
    this.base = options.base;
    this.index = options.index;
  }

  toString(): string {
    return `IndexExpression[${this.start}-${this.end}][${this.base}[${this.index}]]`;
  }

  clone(): ASTIndexExpression {
    return new ASTIndexExpression({
      base: this.base.clone(),
      index: this.index.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
