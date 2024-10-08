import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTMapKeyStringOptions extends ASTBaseOptions {
  key: ASTBase;
  value: ASTBase;
}

export class ASTMapKeyString extends ASTBase {
  key: ASTBase;
  value: ASTBase;

  constructor(options: ASTMapKeyStringOptions) {
    super(ASTType.MapKeyString, options);
    this.key = options.key;
    this.value = options.value;
  }

  toString(): string {
    return `MapKeyString[${this.start}-${this.end}][${this.key}: ${this.value}]`;
  }

  clone(): ASTMapKeyString {
    return new ASTMapKeyString({
      key: this.key.clone(),
      value: this.value.clone(),
      start: this.start,
      end: this.end,
      range: this.range,
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
    super(ASTType.MapConstructorExpression, options);
    this.fields = options.fields || [];
  }

  toString(): string {
    if (this.fields.length === 0) {
      return `MapConstructor[${this.start}-${this.end}][]`;
    }

    const body = this.fields
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `MapConstructor[${this.start}-${this.end}][\n${body}\n]`;
  }

  clone(): ASTMapConstructorExpression {
    return new ASTMapConstructorExpression({
      fields: this.fields.map((it) => it.clone()),
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
