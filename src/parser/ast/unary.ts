import { Operator } from '../../types/operators';
import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTUnaryExpressionOptions extends ASTBaseOptions {
  argument: ASTBase;
  operator?: string;
}

export class ASTUnaryExpression extends ASTBase {
  argument: ASTBase;
  operator?: string;

  static getUnaryType(
    operator: string
  ):
    | ASTType.NegationExpression
    | ASTType.BinaryNegatedExpression
    | ASTType.UnaryExpression {
    switch (operator) {
      case Operator.Not: {
        return ASTType.NegationExpression;
      }
      case Operator.Plus:
      case Operator.Minus: {
        return ASTType.BinaryNegatedExpression;
      }
      default: {
        return ASTType.UnaryExpression;
      }
    }
  }

  constructor(options: ASTUnaryExpressionOptions) {
    super(ASTUnaryExpression.getUnaryType(options.operator), options);
    this.argument = options.argument;
    this.operator = options.operator;
  }

  toString(): string {
    return `${this.type}[${this.start}-${this.end}][${this.operator} ${this.argument}]`;
  }

  clone(): ASTUnaryExpression {
    return new ASTUnaryExpression({
      argument: this.argument.clone(),
      operator: this.operator,
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
