import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTLogicalExpressionOptions extends ASTBaseOptions {
  operator: string;
  left: ASTBase;
  right: ASTBase;
}

export class ASTLogicalExpression extends ASTBase {
  operator: string;
  left: ASTBase;
  right: ASTBase;

  constructor(options: ASTLogicalExpressionOptions) {
    super(ASTType.LogicalExpression, options);
    this.operator = options.operator;
    this.left = options.left;
    this.right = options.right;
  }

  toString(): string {
    return `${this.type}[${this.start}-${this.end}][${this.left} ${this.operator} ${this.right}]`;
  }

  clone(): ASTLogicalExpression {
    return new ASTLogicalExpression({
      operator: this.operator,
      left: this.left.clone(),
      right: this.right.clone(),
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
