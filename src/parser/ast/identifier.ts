import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTIdentifierOptions extends ASTBaseOptions {
  name: string;
}

export class ASTIdentifier extends ASTBase {
  name: string;

  constructor(options: ASTIdentifierOptions) {
    super(ASTType.Identifier, options);
    this.name = options.name;
  }

  toString(): string {
    return `Identifier[${this.start}-${this.end}][${this.name}]`;
  }

  clone(): ASTIdentifier {
    return new ASTIdentifier({
      name: this.name,
      start: this.start,
      end: this.end,
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
      scope: this.scope
    });
  }
}
