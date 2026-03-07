import { ASTBase, ASTBaseBlock, ASTBaseBlockOptions, ASTType } from './base';
import { ASTIdentifier } from './identifier';

export interface ASTForGenericStatementOptions extends ASTBaseBlockOptions {
  variable: ASTIdentifier;
  iterator: ASTBase;
}

export class ASTForGenericStatement extends ASTBaseBlock {
  variable: ASTIdentifier;
  iterator: ASTBase;

  constructor(options: ASTForGenericStatementOptions) {
    super(ASTType.ForGenericStatement, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.variable = options.variable;
    this.iterator = options.iterator;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.variable} in ${this.iterator}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `For[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.variable} in ${this.iterator}\n${body}\n]`;
  }

  clone(): ASTForGenericStatement {
    return new ASTForGenericStatement({
      variable: this.variable.clone(),
      iterator: this.iterator.clone(),
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
