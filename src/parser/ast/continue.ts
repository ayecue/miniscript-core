import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTContinueStatementOptions extends ASTBaseOptions {
  iterator?: ASTBase;
}

export class ASTContinueStatement extends ASTBase {
  iterator?: ASTBase;

  constructor(options: ASTContinueStatementOptions) {
    super(ASTType.ContinueStatement, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.iterator = options.iterator;
  }

  toString(): string {
    return `ContinueStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}]`;
  }

  clone(): ASTContinueStatement {
    return new ASTContinueStatement({
      iterator: this.iterator?.clone(),
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
