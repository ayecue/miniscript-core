import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTAssignmentStatementOptions extends ASTBaseOptions {
  variable: ASTBase;
  init: ASTBase;
}

export class ASTAssignmentStatement extends ASTBase {
  variable: ASTBase;
  init: ASTBase;

  constructor(options: ASTAssignmentStatementOptions) {
    super(ASTType.AssignmentStatement, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.variable = options.variable;
    this.init = options.init;
  }

  toString(): string {
    return `AssignmentStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.variable} = ${this.init}]`;
  }

  clone(): ASTAssignmentStatement {
    return new ASTAssignmentStatement({
      variable: this.variable.clone(),
      init: this.init.clone(),
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
