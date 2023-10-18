import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTAssignmentStatementOptions extends ASTBaseOptions {
  variable: ASTBase;
  init: ASTBase;
}

export class ASTAssignmentStatement extends ASTBase {
  variable: ASTBase;
  init: ASTBase;

  constructor(options: ASTAssignmentStatementOptions) {
    super(ASTType.AssignmentStatement, options);
    this.variable = options.variable;
    this.init = options.init;
  }

  toString(): string {
    return `AssignmentStatement[${this.start}-${this.end}][${this.variable} = ${this.init}]`;
  }
}
