import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTBreakStatementOptions extends ASTBaseOptions {
  iterator?: ASTBase;
}

export class ASTBreakStatement extends ASTBase {
  iterator?: ASTBase;

  constructor(options: ASTBreakStatementOptions) {
    super(ASTType.BreakStatement, options);
    this.iterator = options.iterator;
  }

  toString(): string {
    return `BreakStatement[${this.start}-${this.end}]`;
  }

  clone(): ASTBreakStatement {
    return new ASTBreakStatement({
      iterator: this.iterator?.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
