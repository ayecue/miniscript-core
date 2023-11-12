import { ASTBase, ASTBaseBlock, ASTBaseBlockOptions, ASTType } from './base';

export interface ASTWhileStatementOptions extends ASTBaseBlockOptions {
  condition: ASTBase;
}

export class ASTWhileStatement extends ASTBaseBlock {
  condition: ASTBase;

  constructor(options: ASTWhileStatementOptions) {
    super(ASTType.WhileStatement, options);
    this.condition = options.condition;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `WhileStatement[${this.start}-${this.end}][${this.condition}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `WhileStatement[${this.start}-${this.end}][${this.condition}\n${body}\n]`;
  }

  clone(): ASTWhileStatement {
    return new ASTWhileStatement({
      condition: this.condition.clone(),
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
