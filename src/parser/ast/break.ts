import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTBreakStatementOptions extends ASTBaseOptions {
  iterator?: ASTBase;
}

export class ASTBreakStatement extends ASTBase {
  iterator?: ASTBase;

  constructor(options: ASTBreakStatementOptions) {
    super(ASTType.BreakStatement, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.iterator = options.iterator;
  }

  toString(): string {
    return `BreakStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}]`;
  }

  clone(): ASTBreakStatement {
    return new ASTBreakStatement({
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
