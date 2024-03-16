import Lexer from './lexer';
import { Token, TokenType } from './lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTChunk,
  ASTClause,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTListValue,
  ASTLiteral,
  ASTMapKeyString,
  ASTProvider,
  ASTReturnStatement,
  ASTType,
  ASTUnaryExpression
} from './parser/ast';
import Validator from './parser/validator';
import { ParserException } from './types/errors';
import { Keyword } from './types/keywords';
import { Operator } from './types/operators';
import { Position as ASTPosition, Position } from './types/position';
import { Range } from './types/range';
import { Selector, Selectors } from './types/selector';
import { Stack } from './parser/stack';
import { PendingBlock, PendingChunk, PendingClauseType, PendingFor, PendingFunction, PendingIf, PendingWhile, isPendingChunk, isPendingFor, isPendingFunction, isPendingIf, isPendingWhile } from './parser/pending-block';

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
  currentScope: ASTBaseBlockWithScope;
  outerScopes: ASTBaseBlockWithScope[];
  currentAssignment: ASTAssignmentStatement;

  // helper
  literals: ASTBase[];
  scopes: ASTBaseBlockWithScope[];
  lines: Map<number, ASTBase[]>;
  backpatches: Stack<PendingBlock>;
  statementErrors: Error[];

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
    me.backpatches = new Stack();
    me.statementErrors = [];
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

  skipNewlines(): number {
    const me = this;
    let lines = 0;
    while (me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      if (me.is(Selectors.Comment)) {
        const comment = me.astProvider.comment({
          value: me.token.value,
          start: me.token.getStart(),
          end: me.token.getEnd(),
          scope: me.currentScope
        });

        me.addLine(comment);
        me.backpatches.peek().body.push(comment);
      } else {
        lines++;
      }

      me.next();
    }

    return lines;
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

  parseChunk(): ASTChunk | ASTBase {
    const me = this;

    me.next();

    const start = me.token.getStart();
    const chunk = me.astProvider.chunk({ start, end: null });
    const pending = new PendingChunk(chunk);

    me.backpatches.setDefault(pending);
    me.pushScope(chunk);

    while (!me.is(Selectors.EndOfFile)) {
      me.skipNewlines();

      if (me.is(Selectors.EndOfFile)) break;

      me.lexer.recordSnapshot();
      me.statementErrors = [];

      me.parseStatement();

      if (me.statementErrors.length > 0) {
        me.errors.push(me.statementErrors[0]);

        if (!me.unsafe) {
          me.lexer.clearSnapshot();
          throw me.statementErrors[0];
        }

        me.lexer.recoverFromSnapshot();

        me.next();

        while (me.token.type !== TokenType.EOL && me.token.type !== TokenType.EOF) {
          me.next();
        }
      }
    }

    let last = me.backpatches.pop();

    while (!isPendingChunk(last)) {
      const exception = me.raise(`found open block ${last.block.type}`, new Range(
        last.block.start,
        last.block.start
      ));

      last.complete(me.previousToken);

      me.errors.push(exception);

      if (!me.unsafe) {
        throw exception;
      }

      last = me.backpatches.pop();
    }

    me.popScope();

    chunk.body = last.body;
    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lines;
    chunk.end = me.token.getEnd();

    return chunk;
  }

  parseStatement(): void {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (TokenType.Keyword === me.token.type && Keyword.Not !== me.token.value) {
      const value = me.token.value;

      switch (value) {
        case Keyword.Return: {
          me.next();
          const item = me.parseReturnStatement();
          if (item.end !== null) {
            me.addLine(item);
          }
          pendingBlock.body.push(item);
          return;
        }
        case Keyword.If: {
          me.next();
          return me.parseIfStatement();
        }
        case Keyword.ElseIf: {
          me.next();
          return me.nextIfClause(ASTType.ElseifClause);
        }
        case Keyword.Else: {
          me.next();
          return me.nextIfClause(ASTType.ElseClause);
        }
        case Keyword.While: {
          me.next();
          return me.parseWhileStatement();
        }
        case Keyword.For: {
          me.next();
          return me.parseForStatement();
        }
        case Keyword.EndFunction: {
          me.next();
          return me.finalizeFunction();
        }
        case Keyword.EndFor: {
          me.next();
          return me.finalizeForStatement();
        }
        case Keyword.EndWhile: {
          me.next();
          return me.finalizeWhileStatement();
        }
        case Keyword.EndIf: {
          me.next();
          return me.nextIfClause(null);
        }
        case Keyword.Continue: {
          me.next();
          const item = me.astProvider.continueStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        case Keyword.Break: {
          me.next();
          const item = me.astProvider.breakStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        default: {
          me.raise(
            `unexpected keyword ${me.token} at start of line`,
            new Range(
              new Position(me.token.line, me.token.lineRange[0]),
              new Position(
                me.token.lastLine ?? me.token.line,
                me.token.lineRange[1]
              )
            )
          );
          return;
        }
      }
    } else {
      const item = me.parseAssignment();

      if (item.end !== null) {
        me.addLine(item);
      }
      pendingBlock.body.push(item);
    }
  }

  parseShortcutStatement(): ASTBase {
    const me = this;

    if (TokenType.Keyword === me.token.type && Keyword.Not !== me.token.value) {
      const value = me.token.value;

      switch (value) {
        case Keyword.Return: {
          me.next();
          return me.parseReturnStatement();
        }
        case Keyword.Continue: {
          me.next();
          return me.astProvider.continueStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
        }
        case Keyword.Break: {
          me.next();
          return me.astProvider.breakStatement({
            start: me.previousToken.getStart(),
            end: me.previousToken.getEnd(),
            scope: me.currentScope
          });
        }
        default: {
          me.raise(
            `unexpected keyword ${me.token} in shorthand statement`,
            new Range(
              new Position(me.token.line, me.token.lineRange[0]),
              new Position(
                me.token.lastLine ?? me.token.line,
                me.token.lineRange[1]
              )
            )
          );
          return;
        }
      }
    } else {
      return me.parseAssignment();
    }
  }

  parseAssignment(): ASTBase {
    const me = this;
    const scope = me.currentScope;
    const start = me.token.getStart();
    const expr = me.parseExpr(null, true, true);

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
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      assignmentStatement.init = me.parseExpr(assignmentStatement);
      assignmentStatement.end = me.previousToken.getEnd();

      if (assignmentStatement.init.type === ASTType.FunctionDeclaration) {
        const pendingBlock = me.backpatches.peek();
        pendingBlock.onComplete = (it) => assignmentStatement.end = it.block.end;
      }

      me.currentAssignment = previousAssignment;

      scope.assignments.push(assignmentStatement);

      return assignmentStatement;
    } else if (
      me.isOneOf(
        Selectors.AddShorthand,
        Selectors.SubtractShorthand,
        Selectors.MultiplyShorthand,
        Selectors.DivideShorthand,
        Selectors.PowerShorthand,
        Selectors.ModuloShorthand
      )
    ) {
      const op = me.token;

      me.next();

      const assignmentStatement = me.astProvider.assignmentStatement({
        variable: expr,
        init: null,
        start,
        end: null,
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      const binaryExpressionStart = me.token.getStart();
      const operator = <Operator>op.value.charAt(0);
      const right = me.parseExpr(assignmentStatement);

      assignmentStatement.init = me.astProvider.binaryExpression({
        operator,
        left: expr.clone(),
        right,
        start: binaryExpressionStart,
        end: me.previousToken.getEnd(),
        scope
      });
      assignmentStatement.end = me.previousToken.getEnd();

      me.currentAssignment = previousAssignment;

      scope.assignments.push(assignmentStatement);

      return assignmentStatement;
    }

    const expressions = [];

    while (!me.is(Selectors.EndOfFile)) {
      const arg = me.parseExpr(null);
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
        scope
      });
    }

    return me.astProvider.callExpression({
      base: expr,
      arguments: expressions,
      start,
      end: me.previousToken.getEnd(),
      scope
    });
  }

  parseReturnStatement(): ASTReturnStatement {
    const me = this;
    const scope = me.currentScope;
    const start = me.previousToken.getStart();
    let expression = null;

    const returnStatement = me.astProvider.returnStatement({
      argument: null,
      start,
      end: null,
      scope
    });

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment, Selectors.Else)) {
      expression = me.parseExpr(returnStatement);

      if (expression.type === ASTType.FunctionDeclaration) {
        const pendingBlock = me.backpatches.peek();
        pendingBlock.onComplete = (it) => returnStatement.end = it.block.end;
      } else {
        returnStatement.end = me.previousToken.getEnd();
      }

      returnStatement.argument = expression;
    } else {
      returnStatement.end = me.previousToken.getEnd();
    }

    scope.returns.push(returnStatement);

    return returnStatement;
  }

  parseIfStatement(): void {
    const me = this;
    const start = me.previousToken.getStart();
    const ifCondition = me.parseExpr(null);

    me.addLine(ifCondition);
    me.requireToken(Selectors.Then, start);

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      me.parseIfShortcutStatement(ifCondition, start);
      return;
    }

    const ifStatement = me.astProvider.ifStatement({
      clauses: [],
      start,
      end: null,
      scope: me.currentScope
    });

    const clause = me.astProvider.ifClause({
      condition: ifCondition,
      start,
      end: me.token.getEnd(),
      scope: me.currentScope
    });

    const pendingBlock = new PendingIf(ifStatement, clause);
    me.backpatches.push(pendingBlock);
  }

  nextIfClause(type: PendingClauseType | null) {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingIf(pendingBlock)) {
      me.raise('no matching open if block', new Range(
        me.token.getStart(),
        me.token.getEnd()
      ));

      return;
    }

    pendingBlock.next(me.previousToken);

    switch (type) {
      case ASTType.ElseifClause: {
        const ifStatementStart = me.token.getStart();
        const ifCondition = me.parseExpr(null);

        me.requireToken(Selectors.Then, ifStatementStart);

        pendingBlock.currentClause = me.astProvider.elseifClause({
          condition: ifCondition,
          start: ifStatementStart,
          end: null,
          scope: me.currentScope
        });
        break;
      }
      case ASTType.ElseClause: {
        const elseStatementStart = me.token.getStart();

        pendingBlock.currentClause = me.astProvider.elseClause({
          start: elseStatementStart,
          end: null,
          scope: me.currentScope
        });
        break;
      }
    }

    if (type === null) {
      pendingBlock.complete(me.previousToken);

      me.addLine(pendingBlock.block);
      me.backpatches.pop();

      me.backpatches.peek().body.push(pendingBlock.block);
    }
  }

  parseIfShortcutStatement(
    condition: ASTBase,
    start: ASTPosition
  ): void {
    const me = this;
    const clauses: ASTClause[] = [];
    const ifStatement = me.astProvider.ifShortcutStatement({
      clauses,
      start,
      end: null,
      scope: me.currentScope
    });
    const item = me.parseShortcutStatement();

    clauses.push(
      me.astProvider.ifShortcutClause({
        condition,
        body: [item],
        start,
        end: me.token.getEnd(),
        scope: me.currentScope
      })
    );

    if (me.is(Selectors.Else)) {
      me.next();

      const elseItemStart = me.token.getStart();
      const elseItem = me.parseShortcutStatement();

      clauses.push(
        me.astProvider.elseShortcutClause({
          body: [elseItem],
          start: elseItemStart,
          end: me.token.getEnd(),
          scope: me.currentScope
        })
      );
    }

    ifStatement.end = me.token.getEnd();

    me.addLine(ifStatement);
    me.backpatches.peek().body.push(ifStatement);
  }

  parseWhileStatement(): void {
    const me = this;
    const start = me.previousToken.getStart();
    const condition = me.parseExpr(null);

    if (!condition) {
      me.raise(
        `while requires a condition`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        )
      );

      return;
    }

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      return me.parseWhileShortcutStatement(condition, start);
    }

    const whileStatement = me.astProvider.whileStatement({
      condition,
      start,
      end: null,
      scope: me.currentScope
    });

    const pendingBlock = new PendingWhile(whileStatement);
    me.backpatches.push(pendingBlock);
    pendingBlock.onComplete = (it) => {
      me.addLine(it.block);
      me.backpatches.pop();

      me.backpatches.peek().body.push(it.block);
    };
  }

  finalizeWhileStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingWhile(pendingBlock)) {
      me.raise('no matching open while block', new Range(
        me.token.getStart(),
        me.token.getEnd()
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);
  }

  parseWhileShortcutStatement(condition: ASTBase, start: ASTPosition): void {
    const me = this;
    const item = me.parseShortcutStatement();

    const whileStatement = me.astProvider.whileStatement({
      condition,
      body: [item],
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.addLine(whileStatement);
    me.backpatches.peek().body.push(whileStatement);
  }

  parseForStatement(): void {
    const me = this;
    const scope = me.currentScope;
    const start = me.previousToken.getStart();
    const variable = me.parseIdentifier() as ASTIdentifier;
    const variableAssign = me.astProvider.assignmentStatement({
      variable,
      init: me.astProvider.unknown({
        start: variable.start,
        end: variable.end,
        scope
      }),
      start: variable.start,
      end: variable.end,
      scope
    });
    const indexAssign = me.astProvider.assignmentStatement({
      variable: me.astProvider.identifier({
        name: `__${variable.name}_idx`,
        start: variable.start,
        end: variable.end,
        scope
      }),
      init: me.astProvider.literal(TokenType.NumericLiteral, {
        value: 0,
        raw: '0',
        start: variable.start,
        end: variable.end,
        scope
      }),
      start: variable.start,
      end: variable.end,
      scope
    });

    scope.assignments.push(variableAssign, indexAssign);

    me.requireToken(Selectors.In, start);

    const iterator = me.parseExpr(null);

    if (!iterator) {
      me.raise(
        `sequence expression expected for 'for' loop`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        )
      );

      return;
    }

    if (!me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      return me.parseForShortcutStatement(variable, iterator, start);
    }

    const forStatement = me.astProvider.forGenericStatement({
      variable,
      iterator,
      start,
      end: me.previousToken.getEnd(),
      scope
    });

    const pendingBlock = new PendingFor(forStatement);
    me.backpatches.push(pendingBlock);
  }

  finalizeForStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingFor(pendingBlock)) {
      me.raise('no matching open for block', new Range(
        me.token.getStart(),
        me.token.getEnd()
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);

    me.addLine(pendingBlock.block);
    me.backpatches.pop();

    me.backpatches.peek().body.push(pendingBlock.block);
  }

  parseForShortcutStatement(
    variable: ASTBase,
    iterator: ASTBase,
    start: ASTPosition
  ): void {
    const me = this;
    const item = me.parseShortcutStatement();

    const forStatement = me.astProvider.forGenericStatement({
      variable,
      iterator,
      body: [item],
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.addLine(forStatement);
    me.backpatches.peek().body.push(forStatement);
  }

  parseExpr(base: ASTBase, asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    return me.parseFunctionDeclaration(base, asLval, statementStart);
  }

  parseFunctionDeclaration(base: ASTBase, asLval: boolean = false, statementStart: boolean = false): ASTFunctionStatement | ASTBase {
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
          const defaultValue = me.parseExpr(null);

          if (defaultValue instanceof ASTLiteral || (defaultValue instanceof ASTUnaryExpression && defaultValue.argument instanceof ASTLiteral)) {
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
            me.raise(
              `parameter default value must be a literal value`,
              new Range(
                parameterStart,
                new Position(
                  me.token.lastLine ?? me.token.line,
                  me.token.lineRange[1]
                )
              )
            );

            parameters.push(me.astProvider.invalidCodeExpression({
              start: parameterStart,
              end: me.previousToken.getEnd()
            }));
          }
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
        if (me.is(Selectors.RParenthesis)) {
          me.raise('expected argument instead received right parenthesis', new Range(
            me.previousToken.getEnd(),
            me.previousToken.getEnd()
          ));
          break;
        }
      }

      me.requireToken(Selectors.RParenthesis, functionStart);
    }

    functionStatement.parameters = parameters;

    const pendingBlock = new PendingFunction(functionStatement);
    me.backpatches.push(pendingBlock);
    pendingBlock.onComplete = (it) => {
      if (base !== null) {
        base.end = it.block.end;
        me.addLine(base);
      } else {
        me.addLine(it.block);
      }
    };

    return functionStatement;
  }

  finalizeFunction() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingFunction(pendingBlock)) {
      me.raise('no matching open function block', new Range(
        me.token.getStart(),
        me.token.getEnd()
      ));

      return;
    }
    
    me.popScope();

    pendingBlock.complete(me.previousToken);

    me.backpatches.pop();
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
    const val = me.parseComparisons(asLval, statementStart);

    if (me.is(Selectors.Isa)) {
      me.next();

      me.skipNewlines();

      const opB = me.parseComparisons();

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
      me.skipNewlines();

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
    const val = me.parseMultDiv(asLval, statementStart);
    let base = val;

    while (me.isOneOf(Selectors.Plus, Selectors.Minus) && (!statementStart || !this.token.afterSpace)) {
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
      } else if (me.is(Selectors.SLBracket) && !me.token.afterSpace) {
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
            : me.parseExpr(null);

          base = me.astProvider.sliceExpression({
            base,
            left,
            right,
            start,
            end: me.token.getEnd(),
            scope: me.currentScope
          });
        } else {
          const index = me.parseExpr(null);

          if (me.is(Selectors.SliceSeperator)) {
            me.next();
            me.skipNewlines();

            const right = me.is(Selectors.SRBracket)
              ? me.astProvider.emptyExpression({
                  start: me.previousToken.getStart(),
                  end: me.previousToken.getEnd(),
                  scope: me.currentScope
                })
              : me.parseExpr(null);

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
          const arg = me.parseExpr(null);
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

    const scope = me.currentScope;
    const start = me.token.getStart();
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start,
      end: null,
      scope
    });

    me.next();

    if (me.is(Selectors.CRBracket)) {
      me.next();
    } else {
      me.skipNewlines();

      while (!me.is(Selectors.EndOfFile)) {
        if (me.is(Selectors.CRBracket)) {
          me.next();
          break;
        }

        const keyValueItem = me.astProvider.mapKeyString({
          key: null,
          value: null,
          start: me.token.getStart(),
          end: null,
          scope
        });
        keyValueItem.key = me.parseExpr(null);

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: keyValueItem.key,
              base: me.currentAssignment.variable,
              start: keyValueItem.start,
              end: me.token.getEnd(),
              scope
            }),
            init: null,
            start: keyValueItem.start,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = assign;
          keyValueItem.value = me.parseExpr(keyValueItem);
          me.currentAssignment = previousAssignment;

          assign.init = keyValueItem.value;
          assign.end = me.previousToken.getEnd();

          scope.assignments.push(assign);
        } else {
          keyValueItem.value = me.parseExpr(keyValueItem);
        }

        keyValueItem.end = me.previousToken.getEnd();
        fields.push(keyValueItem);

        if (Selectors.MapSeperator.is(me.token)) {
          me.next();
          me.skipNewlines();
        }

        if (
          Selectors.CRBracket.is(
            me.token
          )
        ) {
          me.next();
          break;
        }
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

    const scope = me.currentScope;
    const start = me.token.getStart();
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start,
      end: null,
      scope
    });

    me.next();

    if (me.is(Selectors.SRBracket)) {
      me.next();
    } else {
      me.skipNewlines();

      while (!me.is(Selectors.EndOfFile)) {
        if (me.is(Selectors.SRBracket)) {
          me.next();
          break;
        }

        const listValue = me.astProvider.listValue({
          value: null,
          start: me.token.getStart(),
          end: null,
          scope
        });

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: me.astProvider.literal(TokenType.NumericLiteral, {
                value: fields.length,
                raw: `${fields.length}`,
                start,
                end: me.token.getEnd(),
                scope
              }),
              base: me.currentAssignment.variable,
              start: null,
              end: null,
              scope
            }),
            init: null,
            start: null,
            end: null
          });
          const previousAssignment = me.currentAssignment;
          const startToken = me.token;

          me.currentAssignment = previousAssignment;

          listValue.value = me.parseExpr(listValue);

          me.currentAssignment = previousAssignment;

          assign.variable.start = startToken.getStart();
          assign.variable.end = me.previousToken.getEnd();
          assign.init = listValue.value;
          assign.start = listValue.start;
          assign.end = me.previousToken.getEnd();

          scope.assignments.push(assign);
        } else {
          listValue.value = me.parseExpr(listValue);
        }

        listValue.end = me.previousToken.getEnd();
        fields.push(listValue);

        if (Selectors.MapSeperator.is(me.token)) {
          me.next();
          me.skipNewlines();
        }

        if (
          Selectors.SRBracket.is(
            me.token
          )
        ) {
          me.next();
          break;
        }
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

    const val = me.parseExpr(null);

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

    me.raise(
      `got ${me.token} where number, string, or identifier is required`,
      new Range(
        new Position(me.token.line, me.token.lineRange[0]),
        new Position(me.token.lastLine ?? me.token.line, me.token.lineRange[1])
      )
    );

    return me.parseInvalidCode();
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
      return me.parseInvalidCode();
    }

    me.currentScope.namespaces.add(identifier.value);

    return me.astProvider.identifier({
      name: identifier.value,
      start,
      end,
      scope: me.currentScope
    });
  }

  parseInvalidCode() {
    const me = this;
    const start = me.token.getStart();
    const end = me.token.getEnd();
    const base = me.astProvider.invalidCodeExpression({ start, end });
    
    me.next();

    return base;
  }

  raise(message: string, range: Range): ParserException {
    const me = this;
    const err = new ParserException(message, range);

    me.statementErrors.push(err);

    return err;
  }
}
