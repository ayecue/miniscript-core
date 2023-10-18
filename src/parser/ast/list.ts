import { ASTBase, ASTBaseOptions, ASTType } from './base';

export interface ASTListValueOptions extends ASTBaseOptions {
  value: ASTBase;
}

export class ASTListValue extends ASTBase {
  value: ASTBase;

  constructor(options: ASTListValueOptions) {
    super(ASTType.ListValue, options);
    this.value = options.value;
  }

  toString(): string {
    return `ListValue[${this.start}-${this.end}][${this.value}]`;
  }
}

export interface ASTListConstructorExpressionOptions extends ASTBaseOptions {
  fields?: ASTListValue[];
}

export class ASTListConstructorExpression extends ASTBase {
  fields: ASTListValue[];

  constructor(options: ASTListConstructorExpressionOptions) {
    super(ASTType.ListConstructorExpression, options);
    this.fields = options.fields || [];
  }

  toString(): string {
    if (this.fields.length === 0) {
      return `ListConstructor[${this.start}-${this.end}][]`;
    }

    const body = this.fields
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `ListConstructor[${this.start}-${this.end}][\n${body}\n]`;
  }
}
