import {
  ASTBase,
  ASTBaseBlock,
  ASTBaseBlockOptions,
  ASTBaseOptions,
  ASTType
} from './base';

export class ASTClause extends ASTBaseBlock {}

export interface ASTIfStatementOptions extends ASTBaseOptions {
  clauses?: ASTClause[];
}

export class ASTIfStatement extends ASTBase {
  clauses: ASTClause[];

  constructor(
    type: ASTType.IfShortcutStatement | ASTType.IfStatement,
    options: ASTIfStatementOptions
  ) {
    super(type, options);
    this.clauses = options.clauses || [];
  }

  toString(): string {
    if (this.clauses.length === 0) {
      return `IfStatement[${this.start}-${this.end}][]`;
    }

    const clauses = this.clauses
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `IfStatement[${this.start}-${this.end}][\n${clauses}\n]`;
  }
}

export interface ASTIfClauseOptions extends ASTBaseBlockOptions {
  condition: ASTBase;
}

export class ASTIfClause extends ASTClause {
  condition: ASTBase;

  constructor(
    type:
      | ASTType.IfShortcutClause
      | ASTType.ElseifShortcutClause
      | ASTType.IfClause
      | ASTType.ElseifClause,
    options: ASTIfClauseOptions
  ) {
    super(type, options);
    this.condition = options.condition;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `${this.type}[${this.start}-${this.end}][${this.condition}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `${this.type}[${this.start}-${this.end}][${this.condition}\n${body}\n]`;
  }
}

export class ASTElseClause extends ASTClause {
  constructor(
    type: ASTType.ElseShortcutClause | ASTType.ElseClause,
    options: ASTBaseBlockOptions
  ) {
    super(type, options);
  }

  toString(): string {
    if (this.body.length === 0) {
      return `${this.type}[]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `${this.type}[${this.start}-${this.end}][\n${body}\n}]`;
  }
}
