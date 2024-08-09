import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTBinaryExpressionOptions extends ASTBaseOptions {
  operator: string;
  left: ASTBase;
  right: ASTBase;
}

export class ASTBinaryExpression extends ASTBase {
  operator: string;
  left: ASTBase;
  right: ASTBase;

  constructor(options: ASTBinaryExpressionOptions) {
    super(ASTType.BinaryExpression, options);
    this.operator = options.operator;
    this.left = options.left;
    this.right = options.right;
  }

  toString(): string {
    return `${this.type}[${this.start}-${this.end}][${this.left} ${this.operator} ${this.right}]`;
  }

  clone(): ASTBinaryExpression {
    return new ASTBinaryExpression({
      operator: this.operator,
      left: this.left.clone(),
      right: this.right.clone(),
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
