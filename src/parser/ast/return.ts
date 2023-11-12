import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTReturnStatementOptions extends ASTBaseOptions {
  argument?: ASTBase;
}

export class ASTReturnStatement extends ASTBase {
  argument?: ASTBase;

  constructor(options: ASTReturnStatementOptions) {
    super(ASTType.ReturnStatement, options);
    this.argument = options.argument;
  }

  toString(): string {
    return `ReturnStatement[${this.start}-${this.end}][${this.argument}]`;
  }

  clone(): ASTReturnStatement {
    return new ASTReturnStatement({
      argument: this.argument.clone(),
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
