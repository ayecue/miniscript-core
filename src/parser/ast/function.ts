import {
  ASTBase,
  ASTBaseBlockWithScope,
  ASTBaseBlockWithScopeOptions,
  ASTType
} from './base';

export interface ASTFunctionStatementOptions
  extends ASTBaseBlockWithScopeOptions {
  parameters?: ASTBase[];
  assignment: ASTBase;
}

export class ASTFunctionStatement extends ASTBaseBlockWithScope {
  parameters: ASTBase[];
  assignment: ASTBase;

  constructor(options: ASTFunctionStatementOptions) {
    super(ASTType.FunctionDeclaration, options);
    this.parameters = options.parameters || [];
    this.assignment = options.assignment;
  }

  toString(): string {
    const args = this.parameters.map((item) => item).join(', ');

    if (this.body.length === 0) {
      return `${this.type}[${this.start}-${this.end}][${args}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `Function[${this.start}-${this.end}][${args} =>\n${body}\n]`;
  }

  clone(): ASTFunctionStatement {
    return new ASTFunctionStatement({
      parameters: this.parameters.map((it) => it.clone()),
      assignment: this.assignment.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
