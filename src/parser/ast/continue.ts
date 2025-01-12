import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTContinueStatementOptions extends ASTBaseOptions {
  iterator?: ASTBase;
}

export class ASTContinueStatement extends ASTBase {
  iterator?: ASTBase;

  constructor(options: ASTContinueStatementOptions) {
    super(ASTType.ContinueStatement, options);
    this.iterator = options.iterator;
  }

  toString(): string {
    return `ContinueStatement[${this.start}-${this.end}]`;
  }

  clone(): ASTContinueStatement {
    return new ASTContinueStatement({
      iterator: this.iterator?.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
