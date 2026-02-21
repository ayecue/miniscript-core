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
    super(ASTType.FunctionDeclaration, { definitions: options.definitions, returns: options.returns, namespaces: options.namespaces, parent: options.parent, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.parameters = options.parameters || [];
    this.assignment = options.assignment;
  }

  toString(): string {
    const args = this.parameters.map((item) => item).join(', ');

    if (this.body.length === 0) {
      return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${args}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `Function[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${args} =>\n${body}\n]`;
  }

  clone(): ASTFunctionStatement {
    return new ASTFunctionStatement({
      parameters: this.parameters.map((it) => it.clone()),
      assignment: this.assignment.clone(),
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
