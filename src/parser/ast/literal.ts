import { TokenType } from '../../lexer/token';
import { ASTBase, ASTBaseOptions, ASTType } from './base';

export abstract class ASTLiteral extends ASTBase {
  abstract value: number | string | boolean | null;
  abstract raw: string;
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
    super(TokenType.NumericLiteral, options);
    this.value = options.value;
    this.raw = options.raw;
    this.negated = false;
  }

  toString(): string {
    return `Literal[${this.start}-${this.end}][${this.negated ? '-' : ''}${this.value}]`;
  }

  clone(): ASTNumericLiteral {
    const cloned = new ASTNumericLiteral({
      value: this.value,
      raw: this.raw,
      start: this.start,
      end: this.end,
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
    super(TokenType.NumericLiteral, options);
    this.value = options.value;
    this.raw = options.raw;
    this.negated = false;
  }

  toString(): string {
    return `Literal[${this.start}-${this.end}][${this.negated ? '-' : ''}${this.value}]`;
  }

  clone(): ASTBooleanLiteral {
    const cloned = new ASTBooleanLiteral({
      value: this.value,
      raw: this.raw,
      start: this.start,
      end: this.end,
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
    super(ASTType.StringLiteral, options);
    this.value = options.value;
    this.raw = options.raw;
  }

  toString(): string {
    return `Literal[${this.start}-${this.end}][${this.value}]`;
  }

  clone(): ASTStringLiteral {
    return new ASTStringLiteral({
      value: this.value,
      raw: this.raw,
      start: this.start,
      end: this.end,
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
    super(ASTType.StringLiteral, options);
    this.value = options.value;
    this.raw = options.raw;
  }

  toString(): string {
    return `Literal[${this.start}-${this.end}][${this.value}]`;
  }

  clone(): ASTNilLiteral {
    return new ASTNilLiteral({
      value: this.value,
      raw: this.raw,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
