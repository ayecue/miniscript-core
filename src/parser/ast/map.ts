import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTMapKeyStringOptions extends ASTBaseOptions {
  key: ASTBase;
  value: ASTBase;
}

export class ASTMapKeyString extends ASTBase {
  key: ASTBase;
  value: ASTBase;

  constructor(options: ASTMapKeyStringOptions) {
    super(ASTType.MapKeyString, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.key = options.key;
    this.value = options.value;
  }

  toString(): string {
    return `MapKeyString[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.key}: ${this.value}]`;
  }

  clone(): ASTMapKeyString {
    return new ASTMapKeyString({
      key: this.key.clone(),
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

export interface ASTMapConstructorExpressionOptions extends ASTBaseOptions {
  fields?: ASTMapKeyString[];
}

export class ASTMapConstructorExpression extends ASTBase {
  fields: ASTMapKeyString[];

  constructor(options: ASTMapConstructorExpressionOptions) {
    super(ASTType.MapConstructorExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.fields = options.fields || [];
  }

  toString(): string {
    if (this.fields.length === 0) {
      return `MapConstructor[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][]`;
    }

    const body = this.fields
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `MapConstructor[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][\n${body}\n]`;
  }

  clone(): ASTMapConstructorExpression {
    return new ASTMapConstructorExpression({
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
