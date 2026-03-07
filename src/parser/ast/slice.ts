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
    super(ASTType.SliceExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.left = options.left;
    this.right = options.right;
    this.base = options.base;
  }

  toString(): string {
    return `SliceExpression[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.base}[${this.left}:${this.right}]]`;
  }

  clone(): ASTSliceExpression {
    return new ASTSliceExpression({
      base: this.base.clone(),
      left: this.left.clone(),
      right: this.right.clone(),
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
