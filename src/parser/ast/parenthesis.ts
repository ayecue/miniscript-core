import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTParenthesisExpressionOptions extends ASTBaseOptions {
  expression: ASTBase;
}

export class ASTParenthesisExpression extends ASTBase {
  expression: ASTBase;

  constructor(options: ASTParenthesisExpressionOptions) {
    super(ASTType.ParenthesisExpression, options);
    this.expression = options.expression;
  }

  toString(): string {
    return this.expression.toString();
  }
}
