import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTComparisonGroupExpressionOptions extends ASTBaseOptions {
  operators: string[];
  expressions: ASTBase[];
}

export class ASTComparisonGroupExpression extends ASTBase {
  operators: string[];
  expressions: ASTBase[];

  constructor(options: ASTComparisonGroupExpressionOptions) {
    super(ASTType.ComparisonGroupExpression, options);
    this.operators = options.operators;
    this.expressions = options.expressions;
  }

  toString(): string {
    const group = [this.expressions[0].toString()];

    for (let index = 1; index < this.expressions.length; index++) {
      group.push(this.operators[index - 1], this.expressions[index].toString());
    }

    return `${this.type}[${this.start}-${this.end}][${group.join(' ')}]`;
  }

  clone(): ASTComparisonGroupExpression {
    return new ASTComparisonGroupExpression({
      operators: this.operators,
      expressions: this.expressions,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
