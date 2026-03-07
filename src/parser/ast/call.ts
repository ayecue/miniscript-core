import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTCallStatementOptions extends ASTBaseOptions {
  expression: ASTBase;
}

export class ASTCallStatement extends ASTBase {
  expression: ASTBase;

  constructor(options: ASTCallStatementOptions) {
    super(ASTType.CallStatement, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.expression = options.expression;
  }

  toString(): string {
    return `CallStatment[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.expression}]`;
  }

  clone(): ASTCallStatement {
    return new ASTCallStatement({
      expression: this.expression,
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

export interface ASTCallExpressionOptions extends ASTBaseOptions {
  base: ASTBase;
  arguments?: ASTBase[];
}

export class ASTCallExpression extends ASTBase {
  base: ASTBase;
  arguments: ASTBase[];

  constructor(options: ASTCallExpressionOptions) {
    super(ASTType.CallExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.base = options.base;
    this.arguments = options.arguments || [];
  }

  toString(): string {
    return `CallExpression[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${
      this.base
    }(${this.arguments.map((item) => item.toString()).join(', ')})]`;
  }

  clone(): ASTCallExpression {
    return new ASTCallExpression({
      base: this.base.clone(),
      arguments: this.arguments.map((it) => it.clone()),
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
