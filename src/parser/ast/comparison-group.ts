import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTComparisonGroupExpressionOptions extends ASTBaseOptions {
  operators: string[];
  expressions: ASTBase[];
}

export class ASTComparisonGroupExpression extends ASTBase {
  operators: string[];
  expressions: ASTBase[];

  constructor(options: ASTComparisonGroupExpressionOptions) {
    super(ASTType.ComparisonGroupExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.operators = options.operators;
    this.expressions = options.expressions;
  }

  toString(): string {
    const group = [this.expressions[0].toString()];

    for (let index = 1; index < this.expressions.length; index++) {
      group.push(this.operators[index - 1], this.expressions[index].toString());
    }

    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${group.join(' ')}]`;
  }

  clone(): ASTComparisonGroupExpression {
    return new ASTComparisonGroupExpression({
      operators: this.operators,
      expressions: this.expressions,
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
