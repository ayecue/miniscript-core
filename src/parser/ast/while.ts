import { ASTBase, ASTBaseBlock, ASTBaseBlockOptions, ASTType } from './base';

export interface ASTWhileStatementOptions extends ASTBaseBlockOptions {
  condition: ASTBase;
}

export class ASTWhileStatement extends ASTBaseBlock {
  condition: ASTBase;

  constructor(options: ASTWhileStatementOptions) {
    super(ASTType.WhileStatement, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.condition = options.condition;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `WhileStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.condition}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `WhileStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.condition}\n${body}\n]`;
  }

  clone(): ASTWhileStatement {
    return new ASTWhileStatement({
      condition: this.condition.clone(),
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
