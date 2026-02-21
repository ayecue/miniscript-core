import { ASTIdentifier, ASTMemberExpression } from './identifier';

export enum ASTType {
  BreakStatement = 'BreakStatement',
  ContinueStatement = 'ContinueStatement',
  ReturnStatement = 'ReturnStatement',
  IfShortcutStatement = 'IfShortcutStatement',
  IfShortcutClause = 'IfShortcutClause',
  ElseifShortcutClause = 'ElseifShortcutClause',
  ElseShortcutClause = 'ElseShortcutClause',
  IfStatement = 'IfStatement',
  IfClause = 'IfClause',
  ElseifClause = 'ElseifClause',
  ElseClause = 'ElseClause',
  WhileStatement = 'WhileStatement',
  AssignmentStatement = 'AssignmentStatement',
  CallStatement = 'CallStatement',
  FunctionDeclaration = 'FunctionDeclaration',
  ForGenericStatement = 'ForGenericStatement',
  Chunk = 'Chunk',
  Identifier = 'Identifier',
  StringLiteral = 'StringLiteral',
  NumericLiteral = 'NumericLiteral',
  BooleanLiteral = 'BooleanLiteral',
  NilLiteral = 'NilLiteral',
  Unknown = 'Unknown',
  MemberExpression = 'MemberExpression',
  CallExpression = 'CallExpression',
  NegationExpression = 'NegationExpression',
  BinaryNegatedExpression = 'BinaryNegatedExpression',
  UnaryExpression = 'UnaryExpression',
  MapKeyString = 'MapKeyString',
  MapValue = 'MapValue',
  MapConstructorExpression = 'MapConstructorExpression',
  MapCallExpression = 'MapCallExpression',
  ListValue = 'ListValue',
  ListConstructorExpression = 'ListConstructorExpression',
  EmptyExpression = 'EmptyExpression',
  IndexExpression = 'IndexExpression',
  BinaryExpression = 'BinaryExpression',
  LogicalExpression = 'LogicalExpression',
  IsaExpression = 'IsaExpression',
  SliceExpression = 'SliceExpression',
  ImportCodeExpression = 'ImportCodeExpression',
  InvalidCodeExpression = 'InvalidCodeExpression',
  ParenthesisExpression = 'ParenthesisExpression',
  ComparisonGroupExpression = 'ComparisonGroupExpression',
  NoopStatement = 'NoopStatement'
}

export interface ASTBaseOptions extends CallArgs {
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  rangeStart: number;
  rangeEnd: number;
  scope?: ASTBaseBlockWithScope;
}

export class ASTBase {
  readonly type: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  rangeStart: number;
  rangeEnd: number;
  scope?: ASTBaseBlockWithScope;
  leadingComments?: string[];
  trailingComments?: string[];

  constructor(type: string, options: ASTBaseOptions) {
    this.type = type;
    this.startLine = options.startLine;
    this.startChar = options.startChar;
    this.endLine = options.endLine;
    this.endChar = options.endChar;
    this.rangeStart = options.rangeStart;
    this.rangeEnd = options.rangeEnd;
    this.scope = options.scope || null;
  }

  toString(): string {
    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][]`;
  }

  clone(): ASTBase {
    return new ASTBase(this.type, {
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

export interface ASTBaseBlockOptions extends ASTBaseOptions {
  body?: ASTBase[];
}

export class ASTBaseBlock extends ASTBase {
  body: ASTBase[];

  constructor(type: string, options: ASTBaseBlockOptions) {
    super(type, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.body = options.body || [];
  }

  toString(): string {
    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `${this.type}[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][${body.length > 0 ? `\n${body}\n` : ''
      }]`;
  }

  clone(): ASTBaseBlock {
    return new ASTBaseBlock(this.type, {
      body: this.body.map((it) => it.clone()),
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

export type ASTScopeNamespace = ASTIdentifier | ASTMemberExpression;

/**
 * Contains items which in someway define variables available within the scope. Includes:
 * - ASTAssignmentStatement
 * - ASTForGenericStatement
 */
export type ASTScopeDefinition = ASTBase;

export interface ASTBaseBlockWithScopeOptions extends ASTBaseBlockOptions {
  definitions?: ASTScopeDefinition[];
  returns?: ASTBase[];
  namespaces?: ASTScopeNamespace[];
  parent?: ASTBaseBlockWithScope;
}

export class ASTBaseBlockWithScope extends ASTBaseBlock {
  definitions: ASTScopeDefinition[];
  returns: ASTBase[];
  namespaces: ASTScopeNamespace[];

  constructor(type: string, options: ASTBaseBlockWithScopeOptions) {
    super(type, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.namespaces = options.namespaces || [];
    this.definitions = options.definitions || [];
    this.returns = options.returns || [];
  }

  clone(): ASTBaseBlockWithScope {
    return new ASTBaseBlockWithScope(this.type, {
      namespaces: this.namespaces,
      definitions: this.definitions.map((it) => it.clone()),
      returns: this.returns.map((it) => it.clone()),
      body: this.body.map((it) => it.clone()),
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
