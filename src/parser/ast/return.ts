import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTReturnStatementOptions extends ASTBaseOptions {
  argument?: ASTBase;
}

export class ASTReturnStatement extends ASTBase {
  argument?: ASTBase;

  constructor(options: ASTReturnStatementOptions) {
    super(ASTType.ReturnStatement, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.argument = options.argument;
  }

  toString(): string {
    return `ReturnStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.argument}]`;
  }

  clone(): ASTReturnStatement {
    return new ASTReturnStatement({
      argument: this.argument.clone(),
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
