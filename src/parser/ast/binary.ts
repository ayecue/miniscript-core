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
    super(ASTType.BinaryExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.operator = options.operator;
    this.left = options.left;
    this.right = options.right;
  }

  toString(): string {
    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.left} ${this.operator} ${this.right}]`;
  }

  clone(): ASTBinaryExpression {
    return new ASTBinaryExpression({
      operator: this.operator,
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
