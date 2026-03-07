import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTListValueOptions extends ASTBaseOptions {
  value: ASTBase;
}

export class ASTListValue extends ASTBase {
  value: ASTBase;

  constructor(options: ASTListValueOptions) {
    super(ASTType.ListValue, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.value = options.value;
  }

  toString(): string {
    return `ListValue[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.value}]`;
  }

  clone(): ASTListValue {
    return new ASTListValue({
      value: this.value.clone(),
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

export interface ASTListConstructorExpressionOptions extends ASTBaseOptions {
  fields?: ASTListValue[];
}

export class ASTListConstructorExpression extends ASTBase {
  fields: ASTListValue[];

  constructor(options: ASTListConstructorExpressionOptions) {
    super(ASTType.ListConstructorExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.fields = options.fields || [];
  }

  toString(): string {
    if (this.fields.length === 0) {
      return `ListConstructor[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][]`;
    }

    const body = this.fields
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `ListConstructor[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][\n${body}\n]`;
  }

  clone(): ASTListConstructorExpression {
    return new ASTListConstructorExpression({
      fields: this.fields.map((it) => it.clone()),
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
