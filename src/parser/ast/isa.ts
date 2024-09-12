import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTIsaExpressionOptions extends ASTBaseOptions {
  operator: string;
  left: ASTBase;
  right: ASTBase;
}

export class ASTIsaExpression extends ASTBase {
  operator: string;
  left: ASTBase;
  right: ASTBase;

  constructor(options: ASTIsaExpressionOptions) {
    super(ASTType.IsaExpression, options);
    this.operator = options.operator;
    this.left = options.left;
    this.right = options.right;
  }

  toString(): string {
    return `${this.type}[${this.start}-${this.end}][${this.left} ${this.operator} ${this.right}]`;
  }

  clone(): ASTIsaExpression {
    return new ASTIsaExpression({
      operator: this.operator,
      left: this.left.clone(),
      right: this.right.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
