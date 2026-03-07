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
    super(ASTUnaryExpression.getUnaryType(options.operator), { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.argument = options.argument;
    this.operator = options.operator;
  }

  toString(): string {
    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.operator} ${this.argument}]`;
  }

  clone(): ASTUnaryExpression {
    return new ASTUnaryExpression({
      argument: this.argument.clone(),
      operator: this.operator,
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
