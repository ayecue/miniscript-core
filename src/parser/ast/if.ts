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
    super(type, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.clauses = options.clauses || [];
  }

  toString(): string {
    if (this.clauses.length === 0) {
      return `IfStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][]`;
    }

    const clauses = this.clauses
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `IfStatement[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][\n${clauses}\n]`;
  }

  clone(): ASTIfStatement {
    return new ASTIfStatement(this.type as ASTType.IfShortcutStatement | ASTType.IfStatement, {
      clauses: this.clauses.map((it) => it.clone()),
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
    super(type, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.condition = options.condition;
  }

  toString(): string {
    if (this.body.length === 0) {
      return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.condition}]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${this.condition}\n${body}\n]`;
  }

  clone(): ASTIfClause {
    return new ASTIfClause(this.type as ASTType.IfShortcutClause
      | ASTType.ElseifShortcutClause
      | ASTType.IfClause
      | ASTType.ElseifClause, {
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

export class ASTElseClause extends ASTClause {
  constructor(
    type: ASTType.ElseShortcutClause | ASTType.ElseClause,
    options: ASTBaseBlockOptions
  ) {
    super(type, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
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

    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][\n${body}\n}]`;
  }

  clone(): ASTElseClause {
    return new ASTElseClause(this.type as ASTType.ElseShortcutClause | ASTType.ElseClause, {
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
