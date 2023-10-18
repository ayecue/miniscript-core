import Lexer from './lexer';
import { Token, TokenType } from './lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTChunk,
  ASTClause,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIfStatement,
  ASTListValue,
  ASTLiteral,
  ASTMapKeyString,
  ASTProvider,
  ASTReturnStatement,
  ASTWhileStatement
} from './parser/ast';
import Validator from './parser/validator';
import { ParserException } from './types/errors';
import { Keyword } from './types/keywords';
import { Operator } from './types/operators';
import { Position as ASTPosition, Position } from './types/position';
import { Range } from './types/range';
import { Selector, Selectors } from './types/selector';

export interface ParserOptions {
  validator?: Validator;
  astProvider?: ASTProvider;
  lexer?: Lexer;
  unsafe?: boolean;
  tabWidth?: number;
}

export default class Parser {
  // runtime
  history: Token[];
  prefetchedTokens: Token[];
  token: Token | null;
  previousToken: Token | null;
  currentBlock: ASTBase[];
  currentScope: ASTBaseBlockWithScope;
  outerScopes: ASTBaseBlockWithScope[];
  currentAssignment: ASTAssignmentStatement;

  // helper
  literals: ASTBase[];
  scopes: ASTBaseBlockWithScope[];
  lines: Map<number, ASTBase[]>;

  // settings
  content: string;
  lexer: Lexer;
  validator: Validator;
  astProvider: ASTProvider;
  unsafe: boolean;
  errors: Error[];

  constructor(content: string, options: ParserOptions = {}) {
    const me = this;

    me.content = content;
    me.lexer =
      options.lexer ||
      new Lexer(content, {
        unsafe: options.unsafe,
        tabWidth: options.tabWidth
      });
    me.history = [];
    me.prefetchedTokens = [];
    me.token = null;
    me.previousToken = null;
    me.lines = new Map<number, ASTBase[]>();
    me.scopes = [];
    me.currentBlock = null;
    me.currentScope = null;
    me.currentAssignment = null;
    me.outerScopes = [];
    me.literals = [];
    me.validator = options.validator || new Validator();
    me.astProvider = options.astProvider || new ASTProvider();
    me.unsafe = options.unsafe || false;
    me.errors = [];
  }

  next(): Parser {
    const me = this;

    if (me.previousToken) {
      me.history.push(me.previousToken);
    }

    me.previousToken = me.token;
    me.token = me.fetch();

    return me;
  }

  isType(type: TokenType): boolean {
    const me = this;
    return me.token !== null && type === me.token.type;
  }

  is(selector: Selector): boolean {
    const me = this;
    return selector.is(me.token);
  }

  isOneOf(...selectors: Selector[]): boolean {
    const me = this;
    if (me.token == null) return false;
    for (let index = selectors.length - 1; index >= 0; index--) {
      const selector = selectors[index];
      if (selector.is(me.token)) return true;
    }
    return false;
  }

  consume(selector: Selector): boolean {
    const me = this;

    if (this.is(selector)) {
      me.next();
      return true;
    }

    return false;
  }

  consumeMany(...selectors: Selector[]): boolean {
    const me = this;

    if (me.isOneOf(...selectors)) {
      me.next();
      return true;
    }

    return false;
  }

  requireType(type: TokenType, from?: ASTPosition): Token | null {
    const me = this;
    const token = me.token;

    if (me.token.type !== type) {
      me.raise(
        `got ${me.token} where ${type} is required`,
        new Range(
          from || new Position(me.token.line, me.token.lineRange[0]),
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        )
      );
      return null;
    }

    me.next();
    return token;
  }

  requireToken(selector: Selector, from?: ASTPosition): Token | null {
    const me = this;
    const token = me.token;

    if (!selector.is(me.token)) {
      me.raise(
        `got ${me.token} where "${selector.value}" is required`,
        new Range(
          from || new Position(me.token.line, me.token.lineRange[0]),
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        )
      );
      return null;
    }

    me.next();
    return token;
  }

  requireTokenOfAny(selectors: Selector[], from?: ASTPosition): Token | null {
    const me = this;
    const token = me.token;

    for (let index = 0; index < selectors.length; index++) {
      const selector = selectors[index];

      if (selector.is(token)) {
        me.next();
        return token;
      }
    }

    me.raise(
      `got ${me.token} where any of ${selectors
        .map((selector: Selector) => `"${selector.value}"`)
        .join(', ')} is required`,
      new Range(
        from || new Position(me.token.line, me.token.lineRange[0]),
        new Position(me.token.lastLine ?? me.token.line, me.token.lineRange[1])
      )
    );

    return null;
  }

  fetch(): Token {
    const me = this;
    return me.prefetch() && me.prefetchedTokens.shift();
  }

  prefetch(offset: number = 1): Token {
    const me = this;
    const offsetIndex = offset - 1;

    while (me.prefetchedTokens.length < offset) {
      const next = me.lexer.next();
      if (!next) break;
      me.prefetchedTokens.push(next);
      if (next.type === TokenType.EOF) break;
    }

    return me.prefetchedTokens[offsetIndex];
  }

  addLine(item: ASTBase) {
    const me = this;
    const startLine = item.start.line;
    const endLine = item.end.line;

    for (let line = startLine; line <= endLine; line++) {
      if (!me.lines.has(line)) {
        me.lines.set(line, []);
      }

      const statements = me.lines.get(line);
      statements.push(item);
    }
  }

  skipNewlines() {
    const me = this;
    while (me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      if (me.is(Selectors.Comment)) {
        const comment = me.astProvider.comment({
          value: me.token.value,
          start: me.token.getStart(),
          end: me.token.getEnd(),
          scope: me.currentScope
        });

        me.currentBlock.push(comment);
        me.addLine(comment);
      }

      me.next();
    }
  }

  pushScope(scope: ASTBaseBlockWithScope) {
    const me = this;

    if (me.currentScope !== null) {
      me.scopes.push(scope);
      me.outerScopes.push(me.currentScope);
    }

    me.currentScope = scope;
  }

  popScope() {
    const me = this;
    me.currentScope = me.outerScopes.pop();
  }

  parseBlock(...endSelector: Selector[]): ASTBase[] {
    const me = this;
    const block: ASTBase[] = [];
    const previousBlock = me.currentBlock;

    me.currentBlock = block;

    while (!me.isOneOf(Selectors.EndOfFile, ...endSelector)) {
      me.skipNewlines();

      if (me.isOneOf(Selectors.EndOfFile, ...endSelector)) break;

      const statement = me.parseStatement();

      if (statement) {
        me.addLine(statement);
        block.push(statement);
      }
    }

    me.currentBlock = previousBlock;

    return block;
  }

  parseChunk(): ASTChunk | ASTBase {
    const me = this;

    me.next();

    const start = me.token.getStart();
    const chunk = me.astProvider.chunk({ start, end: null });
    const block: ASTBase[] = [];

    me.currentBlock = block;

    me.pushScope(chunk);

    while (!me.is(Selectors.EndOfFile)) {
      me.skipNewlines();

      if (me.is(Selectors.EndOfFile)) break;

      const statement = me.parseStatement();

      if (statement) {
        me.addLine(statement);
        block.push(statement);
      }
    }

    me.popScope();

    chunk.body = block;
    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lines;
    chunk.end = me.token.getEnd();

    me.currentBlock = null;

    return chunk;
  }

  parseStatement() {
    const me = this;

    if (TokenType.Keyword === me.token.type && Keyword.Not !== me.token.value) {
      const value = me.token.value;

      switch (value) {
        case Keyword.Return:
          me.next();
          return me.parseReturnStatement();
        case Keyword.If:
          me.next();
          return me.parseIfStatement();
        case Keyword.While:
          me.next();
          return me.parseWhileStatement();
        case Keyword.For:
          me.next();
          return me.parseForStatement();
        case Keyword.Continue:
          me.next();
          return me.astProvider.continueStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
        case Keyword.Break:
          me.next();
          return me.astProvider.breakStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
        default:
          return me.raise(
            `unexpected keyword ${me.token} at start of line`,
            new Range(
              new Position(me.token.line, me.token.lineRange[0]),
              new Position(
                me.token.lastLine ?? me.token.line,
                me.token.lineRange[1]
              )
            )
          );
      }
    } else {
      return me.parseAssignment();
    }
  }

  parseAssignment(): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const expr = me.parseExpr(true, true);

    if (
      me.isOneOf(
        Selectors.EndOfFile,
        Selectors.EndOfLine,
        Selectors.Comment,
        Selectors.Else
      )
    ) {
      return expr;
    }

    if (me.is(Selectors.Assign)) {
      me.next();

      const assignmentStatement = me.astProvider.assignmentStatement({
        variable: expr,
        init: null,
        start,
        end: null,
        scope: me.currentScope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      assignmentStatement.init = me.parseExpr();
      assignmentStatement.end = me.previousToken.getEnd();

      me.currentAssignment = previousAssignment;

      me.currentScope.assignments.push(assignmentStatement);

      return assignmentStatement;
    } else if (
      me.isOneOf(
        Selectors.AddShorthand,
        Selectors.SubtractShorthand,
        Selectors.MultiplyShorthand,
        Selectors.DivideShorthand
      )
    ) {
      const op = me.token;

      me.next();

      const assignmentStatement = me.astProvider.assignmentStatement({
        variable: expr,
        init: null,
        start,
        end: null,
        scope: me.currentScope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      const binaryExpressionStart = me.token.getStart();
      const operator = <Operator>op.value.charAt(0);
      const right = me.parseExpr();

      assignmentStatement.init = me.astProvider.binaryExpression({
        operator,
        left: expr,
        right,
        start: binaryExpressionStart,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
      assignmentStatement.end = me.previousToken.getEnd();

      me.currentAssignment = previousAssignment;

      me.currentScope.assignments.push(assignmentStatement);

      return assignmentStatement;
    }

    const expressions = [];

    while (!me.is(Selectors.EndOfFile)) {
      const arg = me.parseExpr();
      expressions.push(arg);

      if (me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) break;
      if (me.is(Selectors.Else)) break;
      if (me.is(Selectors.ArgumentSeperator)) {
        me.next();
        me.skipNewlines();
        continue;
      }

      const requiredToken = me.requireTokenOfAny(
        [Selectors.ArgumentSeperator, Selectors.EndOfLine, Selectors.EndOfFile],
        start
      );

      if (
        Selectors.EndOfLine.is(requiredToken) ||
        Selectors.EndOfFile.is(requiredToken)
      )
        break;
    }

    if (expressions.length === 0) {
      return me.astProvider.callStatement({
        expression: expr,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return me.astProvider.callExpression({
      base: expr,
      arguments: expressions,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseReturnStatement(): ASTReturnStatement {
    const me = this;
    const start = me.previousToken.getStart();
    let expression = null;

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      expression = me.parseExpr();
    }

    const returnStatement = me.astProvider.returnStatement({
      argument: expression,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.currentScope.returns.push(returnStatement);

    return returnStatement;
  }

  parseIfStatement(): ASTBase {
    const me = this;
    const clauses: ASTClause[] = [];
    const start = me.previousToken.getStart();
    const ifStatement = me.astProvider.ifStatement({
      clauses,
      start,
      end: null,
      scope: me.currentScope
    });
    const ifStatementStart = start;
    const ifCondition = me.parseExpr();

    me.addLine(ifCondition);
    me.requireToken(Selectors.Then, start);

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      return me.parseIfShortcutStatement(ifCondition, start);
    }

    me.skipNewlines();

    const ifBody: ASTBase[] = me.parseBlock(
      Selectors.ElseIf,
      Selectors.Else,
      Selectors.EndIf
    );

    clauses.push(
      me.astProvider.ifClause({
        condition: ifCondition,
        body: ifBody,
        start: ifStatementStart,
        end: me.token.getEnd(),
        scope: me.currentScope
      })
    );

    while (me.consume(Selectors.ElseIf)) {
      const elseIfStatementStart = me.token.getStart();
      const elseIfCondition = me.parseExpr();

      me.addLine(elseIfCondition);
      me.requireToken(Selectors.Then, elseIfStatementStart);

      const elseIfBody: ASTBase[] = me.parseBlock(
        Selectors.ElseIf,
        Selectors.Else,
        Selectors.EndIf
      );

      clauses.push(
        me.astProvider.elseifClause({
          condition: elseIfCondition,
          body: elseIfBody,
          start: elseIfStatementStart,
          end: me.token.getEnd(),
          scope: me.currentScope
        })
      );
    }

    me.skipNewlines();

    if (me.consume(Selectors.Else)) {
      const elseStatementStart = me.token.getStart();
      const elseBody: ASTBase[] = me.parseBlock(Selectors.EndIf);

      clauses.push(
        me.astProvider.elseClause({
          body: elseBody,
          start: elseStatementStart,
          end: me.token.getEnd(),
          scope: me.currentScope
        })
      );
    }

    me.skipNewlines();

    me.requireToken(Selectors.EndIf, start);

    ifStatement.end = me.previousToken.getEnd();

    return ifStatement;
  }

  parseIfShortcutStatement(
    condition: ASTBase,
    start: ASTPosition
  ): ASTIfStatement | ASTBase {
    const me = this;
    const clauses: ASTClause[] = [];
    const ifStatement = me.astProvider.ifShortcutStatement({
      clauses,
      start,
      end: null,
      scope: me.currentScope
    });
    const statement = me.parseStatement();

    me.addLine(statement);

    clauses.push(
      me.astProvider.ifShortcutClause({
        condition,
        body: [statement],
        start,
        end: me.token.getEnd(),
        scope: me.currentScope
      })
    );

    if (me.is(Selectors.Else)) {
      me.next();

      const elseStatementStart = me.token.getStart();
      const elseStatement = me.parseStatement();

      me.addLine(elseStatement);

      clauses.push(
        me.astProvider.elseShortcutClause({
          body: [elseStatement],
          start: elseStatementStart,
          end: me.token.getEnd(),
          scope: me.currentScope
        })
      );
    }

    ifStatement.end = me.token.getEnd();

    return ifStatement;
  }

  parseWhileStatement(): ASTWhileStatement | ASTBase {
    const me = this;
    const start = me.previousToken.getStart();
    const condition = me.parseExpr();

    if (!condition) {
      return me.raise(
        `while requires a condition`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        ),
        false
      );
    }

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      return me.parseWhileShortcutStatement(condition, start);
    }

    const body: ASTBase[] = me.parseBlock(Selectors.EndWhile);

    me.requireToken(Selectors.EndWhile, start);

    return me.astProvider.whileStatement({
      condition,
      body,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseWhileShortcutStatement(condition: ASTBase, start: ASTPosition): ASTBase {
    const me = this;
    const statement = me.parseStatement();

    me.addLine(statement);

    return me.astProvider.whileStatement({
      condition,
      body: [statement],
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseForStatement(): ASTForGenericStatement | ASTBase {
    const me = this;
    const start = me.previousToken.getStart();
    const variable = me.parseIdentifier() as ASTIdentifier;
    const variableAssign = me.astProvider.assignmentStatement({
      variable,
      init: me.astProvider.unknown({
        start: variable.start,
        end: variable.end,
        scope: me.currentScope
      }),
      start: variable.start,
      end: variable.end,
      scope: me.currentScope
    });
    const indexAssign = me.astProvider.assignmentStatement({
      variable: me.astProvider.identifier({
        name: `__${variable.name}_idx`,
        start: variable.start,
        end: variable.end,
        scope: me.currentScope
      }),
      init: me.astProvider.literal(TokenType.NumericLiteral, {
        value: 0,
        raw: '0',
        start: variable.start,
        end: variable.end,
        scope: me.currentScope
      }),
      start: variable.start,
      end: variable.end,
      scope: me.currentScope
    });

    me.currentScope.assignments.push(variableAssign, indexAssign);

    me.requireToken(Selectors.In, start);

    const iterator = me.parseExpr();

    if (!iterator) {
      return me.raise(
        `sequence expression expected for 'for' loop`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        ),
        false
      );
    }

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      return me.parseForShortcutStatement(variable, iterator, start);
    }

    const body: ASTBase[] = me.parseBlock(Selectors.EndFor);

    me.requireToken(Selectors.EndFor, start);

    return me.astProvider.forGenericStatement({
      variable,
      iterator,
      body,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseForShortcutStatement(
    variable: ASTBase,
    iterator: ASTBase,
    start: ASTPosition
  ): ASTBase {
    const me = this;
    const statement = me.parseStatement();

    me.addLine(statement);

    return me.astProvider.forGenericStatement({
      variable,
      iterator,
      body: [statement],
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseExpr(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    return me.parseFunctionDeclaration(asLval, statementStart);
  }

  parseFunctionDeclaration(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTFunctionStatement | ASTBase {
    const me = this;

    if (!me.is(Selectors.Function)) return me.parseOr(asLval, statementStart);

    me.next();

    const functionStart = me.previousToken.getStart();
    const functionStatement = me.astProvider.functionStatement({
      start: functionStart,
      end: null,
      scope: me.currentScope,
      parent: me.outerScopes[me.outerScopes.length - 1],
      assignment: me.currentAssignment
    });
    const parameters = [];

    me.pushScope(functionStatement);

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      me.requireToken(Selectors.LParenthesis, functionStart);

      while (!me.isOneOf(Selectors.RParenthesis, Selectors.EndOfFile)) {
        const parameter = me.parseIdentifier();
        const parameterStart = parameter.start;

        if (me.consume(Selectors.Assign)) {
          const defaultValue = me.parseExpr();
          const assign = me.astProvider.assignmentStatement({
            variable: parameter,
            init: defaultValue,
            start: parameterStart,
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });

          me.currentScope.assignments.push(assign);
          parameters.push(assign);
        } else {
          const assign = me.astProvider.assignmentStatement({
            variable: parameter,
            init: me.astProvider.unknown({
              start: parameterStart,
              end: me.previousToken.getEnd(),
              scope: me.currentScope
            }),
            start: parameterStart,
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });

          me.currentScope.assignments.push(assign);
          parameters.push(parameter);
        }

        if (me.is(Selectors.RParenthesis)) break;
        me.requireToken(Selectors.ArgumentSeperator, functionStart);
      }

      me.requireToken(Selectors.RParenthesis, functionStart);
    }

    let body: ASTBase[] = [];

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      const statement = me.parseStatement();
      me.addLine(statement);
      body.push(statement);
    } else {
      body = me.parseBlock(Selectors.EndFunction);
      me.requireToken(Selectors.EndFunction, functionStart);
    }

    me.popScope();

    functionStatement.parameters = parameters;
    functionStatement.body = body;
    functionStatement.end = me.previousToken.getEnd();

    return functionStatement;
  }

  parseOr(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseAnd(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.Or)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseAnd();

      base = me.astProvider.binaryExpression({
        operator: Operator.Or,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAnd(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseNot(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.And)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseNot();

      base = me.astProvider.binaryExpression({
        operator: Operator.And,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseNot(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const start = me.token.getStart();

    if (me.is(Selectors.Not)) {
      me.next();

      me.skipNewlines();

      const val = me.parseIsa();

      return me.astProvider.unaryExpression({
        operator: Operator.Not,
        argument: val,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return me.parseIsa(asLval, statementStart);
  }

  parseIsa(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseBitwiseOr(asLval, statementStart);

    if (me.is(Selectors.Isa)) {
      me.next();

      me.skipNewlines();

      const opB = me.parseBitwiseOr();

      return me.astProvider.binaryExpression({
        operator: Operator.Isa,
        left: val,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return val;
  }

  parseBitwiseOr(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseBitwiseAnd(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.BitwiseOr)) {
      me.next();

      const opB = me.parseBitwiseAnd();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseOr,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseBitwiseAnd(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseComparisons(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.BitwiseAnd)) {
      me.next();

      const opB = me.parseComparisons();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseAnd,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseComparisons(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseAddSub(asLval, statementStart);
    let base = val;

    while (
      me.isOneOf(
        Selectors.Equal,
        Selectors.NotEqual,
        Selectors.Greater,
        Selectors.GreaterEqual,
        Selectors.Lesser,
        Selectors.LessEqual
      )
    ) {
      const token = me.token;

      me.next();

      const opB = me.parseAddSub();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAddSub(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseBitwise(asLval, statementStart);
    let base = val;

    while (me.isOneOf(Selectors.Plus, Selectors.Minus)) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseBitwise();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseBitwise(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseMultDiv(asLval, statementStart);
    let base = val;

    while (
      me.isOneOf(
        Selectors.LeftShift,
        Selectors.RightShift,
        Selectors.UnsignedRightShift
      )
    ) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseMultDiv();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseMultDiv(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseUnaryMinus(asLval, statementStart);
    let base = val;

    while (me.isOneOf(Selectors.Times, Selectors.Divide, Selectors.Mod)) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseUnaryMinus();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseUnaryMinus(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (!me.is(Selectors.Minus)) {
      return me.parseNew(asLval, statementStart);
    }

    const start = me.token.getStart();

    me.next();
    me.skipNewlines();

    const val = me.parseNew();

    return me.astProvider.unaryExpression({
      operator: Operator.Minus,
      argument: val,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseNew(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!me.is(Selectors.New)) {
      return me.parseAddressOf(asLval, statementStart);
    }

    const start = me.token.getStart();

    me.next();
    me.skipNewlines();

    const val = me.parseNew();

    return me.astProvider.unaryExpression({
      operator: Operator.New,
      argument: val,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseAddressOf(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (!me.is(Selectors.Reference)) {
      return me.parsePower(asLval, statementStart);
    }

    const start = me.token.getStart();

    me.next();
    me.skipNewlines();

    const val = me.parsePower();

    return me.astProvider.unaryExpression({
      operator: Operator.Reference,
      argument: val,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parsePower(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseCallExpr(asLval, statementStart);

    if (me.isOneOf(Selectors.Power)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseCallExpr();

      return me.astProvider.binaryExpression({
        operator: Operator.Power,
        left: val,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return val;
  }

  parseCallExpr(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const start = me.token.getStart();
    let base = me.parseMap(asLval, statementStart);

    while (!me.is(Selectors.EndOfFile)) {
      if (me.is(Selectors.MemberSeperator)) {
        me.next();
        me.skipNewlines();

        const identifier = me.parseIdentifier();

        base = me.astProvider.memberExpression({
          base,
          indexer: Operator.Member,
          identifier,
          start,
          end: me.previousToken.getEnd(),
          scope: me.currentScope
        });
      } else if (me.is(Selectors.SLBracket)) {
        me.next();
        me.skipNewlines();

        if (me.is(Selectors.SliceSeperator)) {
          const left = me.astProvider.emptyExpression({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });

          me.next();
          me.skipNewlines();

          const right = me.is(Selectors.SRBracket)
            ? me.astProvider.emptyExpression({
                start: me.previousToken.getStart(),
                end: me.previousToken.getEnd(),
                scope: me.currentScope
              })
            : me.parseExpr();

          base = me.astProvider.sliceExpression({
            base,
            left,
            right,
            start,
            end: me.token.getEnd(),
            scope: me.currentScope
          });
        } else {
          const index = me.parseExpr();

          if (me.is(Selectors.SliceSeperator)) {
            me.next();
            me.skipNewlines();

            const right = me.is(Selectors.SRBracket)
              ? me.astProvider.emptyExpression({
                  start: me.previousToken.getStart(),
                  end: me.previousToken.getEnd(),
                  scope: me.currentScope
                })
              : me.parseExpr();

            base = me.astProvider.sliceExpression({
              base,
              left: index,
              right,
              start,
              end: me.token.getEnd(),
              scope: me.currentScope
            });
          } else {
            base = me.astProvider.indexExpression({
              base,
              index,
              start,
              end: me.token.getEnd(),
              scope: me.currentScope
            });
          }
        }

        me.requireToken(Selectors.SRBracket, start);
      } else if (
        me.is(Selectors.LParenthesis) &&
        (!asLval || !me.token.afterSpace)
      ) {
        const expressions = me.parseCallArgs();

        base = me.astProvider.callExpression({
          base,
          arguments: expressions,
          start,
          end: me.previousToken.getEnd(),
          scope: me.currentScope
        });
      } else {
        break;
      }
    }

    return base;
  }

  parseCallArgs(): ASTBase[] {
    const me = this;
    const expressions = [];

    if (me.is(Selectors.LParenthesis)) {
      me.next();

      if (me.is(Selectors.RParenthesis)) {
        me.next();
      } else {
        while (!me.is(Selectors.EndOfFile)) {
          me.skipNewlines();
          const arg = me.parseExpr();
          expressions.push(arg);
          me.skipNewlines();
          if (
            Selectors.RParenthesis.is(
              me.requireTokenOfAny(
                [Selectors.ArgumentSeperator, Selectors.RParenthesis],
                arg.start
              )
            )
          )
            break;
        }
      }
    }

    return expressions;
  }

  parseMap(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!me.is(Selectors.CLBracket)) {
      return me.parseList(asLval, statementStart);
    }

    const start = me.token.getStart();
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start,
      end: null,
      scope: me.currentScope
    });

    me.next();

    if (me.is(Selectors.CRBracket)) {
      me.next();
    } else {
      while (!me.is(Selectors.EndOfFile)) {
        me.skipNewlines();

        if (me.is(Selectors.CRBracket)) {
          me.next();
          break;
        }

        const key = me.parseExpr();
        let value: ASTBase = null;

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: key,
              base: me.currentAssignment.variable,
              start: key.start,
              end: key.end,
              scope: me.currentScope
            }),
            init: null,
            start: key.start,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = assign;
          value = me.parseExpr();
          me.currentAssignment = previousAssignment;

          assign.init = value;
          assign.end = value.end;

          me.currentScope.assignments.push(assign);
        } else {
          value = me.parseExpr();
        }

        fields.push(
          me.astProvider.mapKeyString({
            key,
            value,
            start: key.start,
            end: value.end,
            scope: me.currentScope
          })
        );

        me.skipNewlines();

        if (
          Selectors.CRBracket.is(
            me.requireTokenOfAny(
              [Selectors.MapSeperator, Selectors.CRBracket],
              start
            )
          )
        )
          break;
      }
    }

    mapConstructorExpr.end = me.token.getStart();

    return mapConstructorExpr;
  }

  parseList(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!me.is(Selectors.SLBracket)) {
      return me.parseQuantity(asLval, statementStart);
    }

    const start = me.token.getStart();
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start,
      end: null,
      scope: me.currentScope
    });

    me.next();

    if (me.is(Selectors.SRBracket)) {
      me.next();
    } else {
      while (!me.is(Selectors.EndOfFile)) {
        me.skipNewlines();

        if (me.is(Selectors.SRBracket)) {
          me.next();
          break;
        }

        let value: ASTBase = null;

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: me.astProvider.literal(TokenType.NumericLiteral, {
                value: fields.length,
                raw: `${fields.length}`,
                start,
                end: me.token.getEnd(),
                scope: me.currentScope
              }),
              base: me.currentAssignment.variable,
              start: null,
              end: null,
              scope: me.currentScope
            }),
            init: null,
            start: null,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = previousAssignment;

          value = me.parseExpr();

          me.currentAssignment = previousAssignment;

          assign.variable.start = value.start;
          assign.variable.end = value.end;
          assign.init = value;
          assign.start = value.start;
          assign.end = value.end;

          me.currentScope.assignments.push(assign);
        } else {
          value = me.parseExpr();
        }

        fields.push(
          me.astProvider.listValue({
            value,
            start: value.start,
            end: value.end,
            scope: me.currentScope
          })
        );

        me.skipNewlines();

        if (
          Selectors.SRBracket.is(
            me.requireTokenOfAny(
              [Selectors.ListSeperator, Selectors.SRBracket],
              start
            )
          )
        )
          break;
      }
    }

    listConstructorExpr.end = me.token.getStart();

    return listConstructorExpr;
  }

  parseQuantity(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (!me.is(Selectors.LParenthesis)) {
      return me.parseAtom(asLval, statementStart);
    }

    const start = me.token.getStart();

    me.next();
    me.skipNewlines();

    const val = me.parseExpr();

    me.requireToken(Selectors.RParenthesis, start);

    return me.astProvider.parenthesisExpression({
      expression: val,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseAtom(
    _asLval: boolean = false,
    _statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (me.validator.isLiteral(<TokenType>me.token.type)) {
      return me.parseLiteral();
    } else if (me.isType(TokenType.Identifier)) {
      return me.parseIdentifier();
    }

    return me.raise(
      `got ${me.token} where number, string, or identifier is required`,
      new Range(
        new Position(me.token.line, me.token.lineRange[0]),
        new Position(me.token.lastLine ?? me.token.line, me.token.lineRange[1])
      )
    );
  }

  parseLiteral(): ASTLiteral {
    const me = this;
    const start = me.token.getStart();
    const type = <TokenType>me.token.type;
    const base: ASTLiteral = me.astProvider.literal(
      <
        | TokenType.StringLiteral
        | TokenType.NumericLiteral
        | TokenType.BooleanLiteral
        | TokenType.NilLiteral
      >type,
      {
        value: me.token.value,
        raw: me.token.raw,
        start,
        end: me.token.getEnd(),
        scope: me.currentScope
      }
    );

    me.literals.push(<ASTLiteral>base);

    me.next();

    return base;
  }

  parseIdentifier(): ASTIdentifier | ASTBase {
    const me = this;
    const start = me.token.getStart();
    const end = me.token.getEnd();
    const identifier = me.requireType(TokenType.Identifier);

    if (identifier === null) {
      return me.astProvider.invalidCodeExpression({
        start,
        end
      });
    }

    me.currentScope.namespaces.add(identifier.value);

    return me.astProvider.identifier({
      name: identifier.value,
      start,
      end,
      scope: me.currentScope
    });
  }

  raise(message: string, range: Range, skipNext: boolean = true): ASTBase {
    const me = this;
    const err = new ParserException(message, range);

    me.errors.push(err);

    if (me.unsafe) {
      const start = me.token.getStart();
      const end = me.token.getEnd();
      const base = me.astProvider.invalidCodeExpression({ start, end });

      if (skipNext) me.next();

      while (
        !me.isOneOf(
          Selectors.EndOfFile,
          Selectors.EndOfLine,
          Selectors.MapKeyValueSeperator,
          Selectors.MapSeperator,
          Selectors.MemberSeperator,
          Selectors.ListSeperator,
          Selectors.ArgumentSeperator,
          Selectors.RParenthesis,
          Selectors.CRBracket,
          Selectors.SRBracket,
          Selectors.Else,
          Selectors.ElseIf
        )
      ) {
        me.next();
      }

      return base;
    }

    throw err;
  }
}
