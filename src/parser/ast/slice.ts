import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTSliceExpressionOptions extends ASTBaseOptions {
  base: ASTBase;
  left: ASTBase;
  right: ASTBase;
}

export class ASTSliceExpression extends ASTBase {
  base: ASTBase;
  left: ASTBase;
  right: ASTBase;

  constructor(options: ASTSliceExpressionOptions) {
    super(ASTType.SliceExpression, options);
    this.left = options.left;
    this.right = options.right;
    this.base = options.base;
  }

  toString(): string {
    return `SliceExpression[${this.start}-${this.end}][${this.base}[${this.left}:${this.right}]]`;
  }
}
