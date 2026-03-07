import { ASTBase, ASTBaseOptions, ASTType } from './base';

export abstract class ASTLiteral extends ASTBase {
  abstract value: number | string | boolean | null;
  abstract raw: string;
  abstract clone(): ASTLiteral;
}

export interface ASTLiteralOptions<T> extends ASTBaseOptions {
  value: T;
  raw: string;
}

export class ASTNumericLiteral extends ASTLiteral {
  value: number;
  raw: string;
  negated: boolean;

  constructor(
    options: ASTLiteralOptions<number>
  ) {
    super(ASTType.NumericLiteral, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.value = options.value;
    this.raw = options.raw;
    this.negated = false;
  }

  toString(): string {
    return `Literal[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.negated ? '-' : ''}${this.value}]`;
  }

  clone(): ASTNumericLiteral {
    const cloned = new ASTNumericLiteral({
      value: this.value,
      raw: this.raw,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });

    cloned.negated = this.negated;

    return cloned;
  }
}

export class ASTBooleanLiteral extends ASTLiteral {
  value: boolean;
  raw: string;
  negated: boolean;

  constructor(
    options: ASTLiteralOptions<boolean>
  ) {
    super(ASTType.BooleanLiteral, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.value = options.value;
    this.raw = options.raw;
    this.negated = false;
  }

  toString(): string {
    return `Literal[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.negated ? '-' : ''}${this.value}]`;
  }

  clone(): ASTBooleanLiteral {
    const cloned = new ASTBooleanLiteral({
      value: this.value,
      raw: this.raw,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });

    cloned.negated = this.negated;

    return cloned;
  }
}

export class ASTStringLiteral extends ASTLiteral {
  value: string;
  raw: string;

  constructor(
    options: ASTLiteralOptions<string>
  ) {
    super(ASTType.StringLiteral, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.value = options.value;
    this.raw = options.raw;
  }

  toString(): string {
    return `Literal[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.value}]`;
  }

  clone(): ASTStringLiteral {
    return new ASTStringLiteral({
      value: this.value,
      raw: this.raw,
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

export class ASTNilLiteral extends ASTLiteral {
  value: null;
  raw: string;

  constructor(
    options: ASTLiteralOptions<null>
  ) {
    super(ASTType.NilLiteral, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.value = options.value;
    this.raw = options.raw;
  }

  toString(): string {
    return `Literal[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.value}]`;
  }

  clone(): ASTNilLiteral {
    return new ASTNilLiteral({
      value: this.value,
      raw: this.raw,
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
