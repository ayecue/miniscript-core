import { Operator } from '../../types/operators';
import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTEvaluationExpressionOptions extends ASTBaseOptions {
  operator: Operator;
  left: ASTBase;
  right: ASTBase;
}

export class ASTEvaluationExpression extends ASTBase {
  operator: Operator;
  left: ASTBase;
  right: ASTBase;

  static getExpressionType(
    operator: Operator
  ):
    | ASTType.BinaryExpression
    | ASTType.LogicalExpression
    | ASTType.IsaExpression {
    switch (operator) {
      case Operator.Isa:
        return ASTType.IsaExpression;
      case Operator.And:
      case Operator.Or: {
        return ASTType.LogicalExpression;
      }
      default: {
        return ASTType.BinaryExpression;
      }
    }
  }

  constructor(options: ASTEvaluationExpressionOptions) {
    super(ASTEvaluationExpression.getExpressionType(options.operator), options);
    this.operator = options.operator;
    this.left = options.left;
    this.right = options.right;
  }

  toString(): string {
    return `${this.type}[${this.start}-${this.end}][${this.left} ${this.operator} ${this.right}]`;
  }
}
