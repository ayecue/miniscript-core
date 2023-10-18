import { ASTBase, ASTBaseBlock, ASTBaseBlockOptions, ASTType } from './base';

export interface ASTForGenericStatementOptions extends ASTBaseBlockOptions {
  variable: ASTBase;
  iterator: ASTBase;
}

export class ASTForGenericStatement extends ASTBaseBlock {
  variable: ASTBase;
  iterator: ASTBase;

  constructor(options: ASTForGenericStatementOptions) {
    super(ASTType.ForGenericStatement, options);
    this.variable = options.variable;
    this.iterator = options.iterator;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `${this.type}[${this.start}-${this.end}][${this.variable} in ${this.iterator}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `For[${this.start}-${this.end}][${this.variable} in ${this.iterator}\n${body}\n]`;
  }
}
