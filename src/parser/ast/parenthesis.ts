import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTParenthesisExpressionOptions extends ASTBaseOptions {
  expression: ASTBase;
}

export class ASTParenthesisExpression extends ASTBase {
  expression: ASTBase;

  constructor(options: ASTParenthesisExpressionOptions) {
    super(ASTType.ParenthesisExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.expression = options.expression;
  }

  toString(): string {
    return this.expression.toString();
  }

  clone(): ASTParenthesisExpression {
    return new ASTParenthesisExpression({
      expression: this.expression.clone(),
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
