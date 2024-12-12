import Lexer from './lexer';
import { Token, TokenType } from './lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTBooleanLiteral,
  ASTChunk,
  ASTClause,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIdentifierKind,
  ASTListValue,
  ASTLiteral,
  ASTMapKeyString,
  ASTNumericLiteral,
  ASTProvider,
  ASTReturnStatement,
  ASTType
} from './parser/ast';
import Validator from './parser/validator';
import { ParserException } from './types/errors';
import { Keyword } from './types/keywords';
import { Operator } from './types/operators';
import { Position as ASTPosition } from './types/position';
import { Range } from './types/range';
import { getSelectorsFromGroup, getSelectorValue, Selector, SelectorGroup, SelectorGroups, Selectors } from './types/selector';
import { Stack } from './utils/stack';
import { PendingBlock, PendingChunk, PendingClauseType, PendingFor, PendingFunction, PendingIf, PendingWhile, isPendingChunk, isPendingFor, isPendingFunction, isPendingIf, isPendingWhile } from './parser/pending-block';
import { LineRegistry } from './parser/line-registry';

export interface ParserOptions {
  validator?: Validator;
  astProvider?: ASTProvider;
  lexer?: Lexer;
  unsafe?: boolean;
  tabWidth?: number;
}

export default class Parser {
  // runtime
  token: Token | null;
  previousToken: Token | null;
  currentScope: ASTBaseBlockWithScope;
  outerScopes: ASTBaseBlockWithScope[];
  currentAssignment: ASTAssignmentStatement;

  // helper
  literals: ASTBase[];
  scopes: ASTBaseBlockWithScope[];
  backpatches: Stack<PendingBlock>;
  statementErrors: Error[];
  lineRegistry: LineRegistry;

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
    me.token = null;
    me.previousToken = null;
    me.lineRegistry = new LineRegistry();
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

  next() {
    this.previousToken = this.token;
    this.token = this.lexer.next();
  }

  isType(type: TokenType): boolean {
    return this.token !== null && type === this.token.type;
  }

  consume(selector: Selector): boolean {
    if (selector(this.token)) {
      this.next();
      return true;
    }

    return false;
  }

  consumeMany(selectorGroup: SelectorGroup): boolean {
    if (selectorGroup(this.token)) {
      this.next();
      return true;
    }

    return false;
  }

  requireType(type: TokenType, from?: ASTPosition): Token | null {
    const token = this.token;

    if (this.token.type !== type) {
      this.raise(
        `got ${token} where ${type} is required`,
        new Range(
          from || token.start,
          token.end
        )
      );
      return null;
    }

    this.next();
    return token;
  }

  requireToken(selector: Selector, from?: ASTPosition): Token | null {
    const token = this.token;

    if (!selector(token)) {
      this.raise(
        `got ${token} where "${getSelectorValue(selector)}" is required`,
        new Range(
          from || token.start,
          token.end
        )
      );
      return null;
    }

    this.next();
    return token;
  }

  requireTokenOfAny(selectorGroup: SelectorGroup, from?: ASTPosition): Token | null {
    const token = this.token;

    if (selectorGroup(token)) {
      this.next();
      return token;
    }

    this.raise(
      `got ${token} where any of ${getSelectorsFromGroup(selectorGroup)
        .map((selector: Selector) => `"${getSelectorValue(selector)}"`)
        .join(', ')} is required`,
      new Range(
        from || token.start,
        token.end
      )
    );

    return null;
  }

  skipNewlines(): number {
    const me = this;
    let lines = 0;
    while (true) {
      if (Selectors.Comment(me.token)) {
        const isStatement = me.previousToken?.line !== me.token.line;
        const comment = me.astProvider.comment({
          value: me.token.value,
          start: me.token.start,
          end: me.token.end,
          range: me.token.range,
          scope: me.currentScope,
          isStatement
        });

        me.lineRegistry.addItemToLines(comment);
        if (isStatement) {
          me.backpatches.peek().body.push(comment);
        }
      } else if (Selectors.EndOfLine(me.token)) {
        lines++;
      } else {
        break;
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

  tryToRecover() {
    const me = this;
    const firstPointOfFailure = me.statementErrors[0];

    me.errors.push(firstPointOfFailure);

    if (!me.unsafe) {
      throw firstPointOfFailure;
    }

    me.lexer.recoverFromSnapshot();

    me.next();

    for (; me.token.type !== TokenType.EOL && me.token.type !== TokenType.EOF; me.next());
  }

  finishRemaingScopes() {
    const me = this;
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
  }

  parseChunk(): ASTChunk | ASTBase {
    const me = this;

    me.next();

    const start = me.token.start;
    const chunk = me.astProvider.chunk({ start, end: null, range: [me.token.range[0], null] });
    const pending = new PendingChunk(chunk, me.lineRegistry);

    me.backpatches.setDefault(pending);
    me.pushScope(chunk);

    while (!Selectors.EndOfFile(me.token)) {
      me.skipNewlines();

      if (Selectors.EndOfFile(me.token)) break;

      me.lexer.recordSnapshot();
      me.statementErrors = [];

      me.parseStatement();

      if (me.statementErrors.length > 0) {
        me.tryToRecover();
      }
    }

    me.finishRemaingScopes();
    me.popScope();
    pending.complete(me.token);

    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lineRegistry.lines;

    return chunk;
  }

  parseStatement(): void {
    const me = this;

    if (TokenType.Keyword === me.token.type && Keyword.Not !== me.token.value) {
      me.parseKeyword();
      return;
    }

    const pendingBlock = me.backpatches.peek();
    const item = me.parseAssignment();

    if (item.end !== null) me.lineRegistry.addItemToLines(item);
    pendingBlock.body.push(item);
  }

  parseKeyword() {
    const me = this;
    const value = me.token.value;

    switch (value) {
      case Keyword.Return: {
        const pendingBlock = me.backpatches.peek();
        me.next();
        const item = me.parseReturnStatement();
        if (item.end !== null) {
          me.lineRegistry.addItemToLines(item);
        }
        pendingBlock.body.push(item);
        return;
      }
      case Keyword.If: {
        me.next();
        me.parseIfStatement();
        return;
      }
      case Keyword.ElseIf: {
        me.next();
        me.nextIfClause(ASTType.ElseifClause);
        return;
      }
      case Keyword.Else: {
        me.next();
        me.nextIfClause(ASTType.ElseClause);
        return;
      }
      case Keyword.While: {
        me.next();
        me.parseWhileStatement();
        return;
      }
      case Keyword.For: {
        me.next();
        me.parseForStatement();
        return;
      }
      case Keyword.EndFunction: {
        me.next();
        me.finalizeFunction();
        return;
      }
      case Keyword.EndFor: {
        me.next();
        me.finalizeForStatement();
        return;
      }
      case Keyword.EndWhile: {
        me.next();
        me.finalizeWhileStatement();
        return;
      }
      case Keyword.EndIf: {
        me.next();
        me.nextIfClause(null);
        return;
      }
      case Keyword.Continue: {
        const pendingBlock = me.backpatches.peek();
        me.next();
        const item = me.astProvider.continueStatement({
          start: me.previousToken.start,
          end: me.previousToken.end,
          range: me.previousToken.range,
          scope: me.currentScope
        });
        me.lineRegistry.addItemToLines(item);
        pendingBlock.body.push(item);
        return;
      }
      case Keyword.Break: {
        const pendingBlock = me.backpatches.peek();
        me.next();
        const item = me.astProvider.breakStatement({
          start: me.previousToken.start,
          end: me.previousToken.end,
          range: me.previousToken.range,
          scope: me.currentScope
        });
        me.lineRegistry.addItemToLines(item);
        pendingBlock.body.push(item);
        return;
      }
    }

    me.raise(
      `unexpected keyword ${me.token} at start of line`,
      new Range(
        me.token.start,
        me.token.end
      )
    );
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
            start: me.previousToken.start,
            end: me.previousToken.end,
            range: me.previousToken.range,
            scope: me.currentScope
          });
        }
        case Keyword.Break: {
          me.next();
          return me.astProvider.breakStatement({
            start: me.previousToken.start,
            end: me.previousToken.end,
            range: me.previousToken.range,
            scope: me.currentScope
          });
        }
        default: {
          me.raise(
            `unexpected keyword ${me.token} in shorthand statement`,
            new Range(
              me.token.start,
              me.token.end
            )
          );

          return me.parseInvalidCode();
        }
      }
    }

    return me.parseAssignment();
  }

  parseAssignment(): ASTBase {
    const me = this;
    const scope = me.currentScope;
    const startToken = me.token;
    const expr = me.parseExpr(null, true, true);

    if (
      SelectorGroups.AssignmentEndOfExpr(me.token)
    ) {
      return expr;
    }

    if (Selectors.Assign(me.token)) {
      me.next();

      const assignmentStatement = me.astProvider.assignmentStatement({
        variable: expr,
        init: null,
        start: startToken.start,
        range: [startToken.range[0], null],
        end: null,
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      assignmentStatement.init = me.parseExpr(assignmentStatement);
      assignmentStatement.end = me.previousToken.end;
      assignmentStatement.range[1] = me.previousToken.range[1];

      me.currentAssignment = previousAssignment;

      scope.assignments.push(assignmentStatement);

      return assignmentStatement;
    } else if (
      SelectorGroups.AssignmentShorthand(
        me.token
      )
    ) {
      const op = me.token;

      me.next();

      const assignmentStatement = me.astProvider.assignmentStatement({
        variable: expr,
        init: null,
        start: startToken.start,
        range: [startToken.range[0], null],
        end: null,
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      const binaryExpressionTokenStart = me.token;
      const operator = <Operator>op.value.charAt(0);
      const rightExpr = me.parseExpr(assignmentStatement);
      const right = me.astProvider.parenthesisExpression({
        start: rightExpr.start,
        end: rightExpr.end,
        range: rightExpr.range,
        expression: rightExpr
      });

      assignmentStatement.init = me.astProvider.binaryExpression({
        operator,
        left: expr.clone(),
        right,
        start: binaryExpressionTokenStart.start,
        end: me.previousToken.end,
        range: [binaryExpressionTokenStart.range[0], me.previousToken.range[1]],
        scope
      });
      assignmentStatement.end = me.previousToken.end;
      assignmentStatement.range[1] = me.previousToken.range[1];

      me.currentAssignment = previousAssignment;

      scope.assignments.push(assignmentStatement);

      return assignmentStatement;
    }

    const expressions = [];

    while (!Selectors.EndOfFile(me.token)) {
      const arg = me.parseExpr(null);
      expressions.push(arg);

      if (SelectorGroups.BlockEndOfLine(me.token)) break;
      if (Selectors.Else(me.token)) break;
      if (Selectors.ArgumentSeperator(me.token)) {
        me.next();
        me.skipNewlines();
        continue;
      }

      const requiredToken = me.requireTokenOfAny(
        SelectorGroups.AssignmentCommandArgs,
        startToken.start
      );

      if (
        Selectors.EndOfLine(requiredToken) ||
        Selectors.EndOfFile(requiredToken)
      )
        break;
    }

    if (expressions.length === 0) {
      return me.astProvider.callStatement({
        expression: expr,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope
      });
    }

    return me.astProvider.callStatement({
      expression: me.astProvider.callExpression({
        base: expr,
        arguments: expressions,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope
      }),
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope
    });
  }

  parseReturnStatement(): ASTReturnStatement {
    const me = this;
    const scope = me.currentScope;
    const startToken = me.previousToken;
    let expression = null;

    const returnStatement = me.astProvider.returnStatement({
      argument: null,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope
    });

    if (
      SelectorGroups.ReturnStatementEnd(me.token)
    ) {
      returnStatement.end = me.previousToken.end;
      returnStatement.range[1] = me.previousToken.range[1];
    } else {
      expression = me.parseExpr(returnStatement);

      returnStatement.end = me.previousToken.end;
      returnStatement.range[1] = me.previousToken.range[1];
      returnStatement.argument = expression;
    }

    scope.returns.push(returnStatement);

    return returnStatement;
  }

  parseIfStatement(): void {
    const me = this;
    const startToken = me.previousToken;
    const ifCondition = me.parseExpr(null);

    me.lineRegistry.addItemToLines(ifCondition);
    me.requireToken(Selectors.Then, startToken.start);

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      me.parseIfShortcutStatement(ifCondition, startToken);
      return;
    }

    const ifStatement = me.astProvider.ifStatement({
      clauses: [],
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope: me.currentScope
    });

    const clause = me.astProvider.ifClause({
      condition: ifCondition,
      start: startToken.start,
      end: me.token.end,
      range: [startToken.range[0], me.token.range[1]],
      scope: me.currentScope
    });

    const pendingBlock = new PendingIf(ifStatement, clause, me.lineRegistry);
    me.backpatches.push(pendingBlock);
  }

  nextIfClause(type: PendingClauseType | null) {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingIf(pendingBlock)) {
      me.raise('no matching open if block', new Range(
        me.token.start,
        me.token.end
      ));

      return;
    }

    pendingBlock.next(me.previousToken);

    switch (type) {
      case ASTType.ElseifClause: {
        const ifStatementStartToken = me.token;
        const ifCondition = me.parseExpr(null);

        me.requireToken(Selectors.Then, ifStatementStartToken.start);

        pendingBlock.currentClause = me.astProvider.elseifClause({
          condition: ifCondition,
          start: ifStatementStartToken.start,
          end: null,
          range: [ifStatementStartToken.range[0], null],
          scope: me.currentScope
        });
        break;
      }
      case ASTType.ElseClause: {
        const elseStatementStartToken = me.token;

        pendingBlock.currentClause = me.astProvider.elseClause({
          start: elseStatementStartToken.start,
          end: null,
          range: [elseStatementStartToken.range[0], null],
          scope: me.currentScope
        });
        break;
      }
    }

    if (type === null) {
      pendingBlock.complete(me.previousToken);
      me.backpatches.pop();

      me.backpatches.peek().body.push(pendingBlock.block);
    }
  }

  parseIfShortcutStatement(
    condition: ASTBase,
    startToken: Token
  ): void {
    const me = this;
    const clauses: ASTClause[] = [];
    const block = me.backpatches.peek();
    const ifStatement = me.astProvider.ifShortcutStatement({
      clauses,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope: me.currentScope
    });
    const item = me.parseShortcutStatement();

    clauses.push(
      me.astProvider.ifShortcutClause({
        condition,
        body: [item],
        start: startToken.start,
        end: me.token.end,
        range: [startToken.range[0], me.token.range[1]],
        scope: me.currentScope
      })
    );

    if (Selectors.Else(me.token)) {
      me.next();

      const elseItemStartToken = me.token;
      const elseItem = me.parseShortcutStatement();

      clauses.push(
        me.astProvider.elseShortcutClause({
          body: [elseItem],
          start: elseItemStartToken.start,
          end: me.token.end,
          range: [elseItemStartToken.range[0], me.token.range[1]],
          scope: me.currentScope
        })
      );
    }

    ifStatement.end = me.token.end;
    ifStatement.range[1] = me.token.range[1];

    me.lineRegistry.addItemToLines(ifStatement);
    block.body.push(ifStatement);
  }

  parseWhileStatement(): void {
    const me = this;
    const startToken = me.previousToken;
    const condition = me.parseExpr(null);

    if (!condition) {
      me.raise(
        `while requires a condition`,
        new Range(
          startToken.start,
          me.token.end
        )
      );

      return;
    }

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      return me.parseWhileShortcutStatement(condition, startToken);
    }

    const whileStatement = me.astProvider.whileStatement({
      condition,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope: me.currentScope
    });

    const pendingBlock = new PendingWhile(whileStatement, me.lineRegistry);
    me.backpatches.push(pendingBlock);
  }

  finalizeWhileStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingWhile(pendingBlock)) {
      me.raise('no matching open while block', new Range(
        me.token.start,
        me.token.end
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);
    me.backpatches.pop();
    me.backpatches.peek().body.push(pendingBlock.block);
  }

  parseWhileShortcutStatement(condition: ASTBase, startToken: Token): void {
    const me = this;
    const block = me.backpatches.peek();
    const item = me.parseShortcutStatement();

    const whileStatement = me.astProvider.whileStatement({
      condition,
      body: [item],
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });

    me.lineRegistry.addItemToLines(whileStatement);
    block.body.push(whileStatement);
  }

  parseForStatement(): void {
    const me = this;
    const scope = me.currentScope;
    const startToken = me.previousToken;
    const variable = me.parseIdentifier(ASTIdentifierKind.ForInVariable) as ASTIdentifier;
    const variableAssign = me.astProvider.assignmentStatement({
      variable,
      init: me.astProvider.unknown({
        start: variable.start,
        end: variable.end,
        range: variable.range,
        scope
      }),
      start: variable.start,
      end: variable.end,
      range: variable.range,
      scope
    });
    const indexAssign = me.astProvider.assignmentStatement({
      variable: me.astProvider.identifier({
        kind: ASTIdentifierKind.ForInIdxVariable,
        name: `__${variable.name}_idx`,
        start: variable.start,
        end: variable.end,
        range: variable.range,
        scope
      }),
      init: me.astProvider.literal(TokenType.NumericLiteral, {
        value: 0,
        raw: '0',
        start: variable.start,
        end: variable.end,
        range: variable.range,
        scope
      }),
      start: variable.start,
      end: variable.end,
      range: variable.range,
      scope
    });

    scope.assignments.push(variableAssign, indexAssign);

    me.requireToken(Selectors.In, startToken.start);

    const iterator = me.parseExpr(null);

    if (!iterator) {
      me.raise(
        `sequence expression expected for 'for' loop`,
        new Range(
          startToken.start,
          me.token.end
        )
      );

      return;
    }

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      return me.parseForShortcutStatement(variable, iterator, startToken);
    }

    const forStatement = me.astProvider.forGenericStatement({
      variable,
      iterator,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope
    });

    const pendingBlock = new PendingFor(forStatement, me.lineRegistry);
    me.backpatches.push(pendingBlock);
  }

  finalizeForStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingFor(pendingBlock)) {
      me.raise('no matching open for block', new Range(
        me.token.start,
        me.token.end
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);

    me.backpatches.pop();
    me.backpatches.peek().body.push(pendingBlock.block);
  }

  parseForShortcutStatement(
    variable: ASTBase,
    iterator: ASTBase,
    startToken: Token
  ): void {
    const me = this;
    const block = me.backpatches.peek();
    const item = me.parseShortcutStatement();

    const forStatement = me.astProvider.forGenericStatement({
      variable,
      iterator,
      body: [item],
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });

    me.lineRegistry.addItemToLines(forStatement);
    block.body.push(forStatement);
  }

  parseExpr(base: ASTBase, asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    return me.parseFunctionDeclaration(base, asLval, statementStart);
  }

  parseFunctionDeclaration(base: ASTBase, asLval: boolean = false, statementStart: boolean = false): ASTFunctionStatement | ASTBase {
    const me = this;

    if (!Selectors.Function(me.token)) return me.parseOr(asLval, statementStart);

    me.next();

    const functionStartToken = me.previousToken;
    const functionStatement = me.astProvider.functionStatement({
      start: functionStartToken.start,
      end: null,
      range: [functionStartToken.range[0], null],
      scope: me.currentScope,
      parent: me.outerScopes[me.outerScopes.length - 1],
      assignment: me.currentAssignment
    });
    const parameters = [];

    me.pushScope(functionStatement);

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      me.requireToken(Selectors.LParenthesis, functionStartToken.start);

      while (!SelectorGroups.FunctionDeclarationArgEnd(me.token)) {
        const parameter = me.parseIdentifier(ASTIdentifierKind.Argument);
        const parameterStartToken = parameter;

        if (me.consume(Selectors.Assign)) {
          const defaultValue = me.parseExpr(null);

          if (defaultValue instanceof ASTLiteral) {
            const assign = me.astProvider.assignmentStatement({
              variable: parameter,
              init: defaultValue,
              start: parameterStartToken.start,
              end: me.previousToken.end,
              range: [parameterStartToken.range[0], me.previousToken.range[1]],
              scope: me.currentScope
            });

            me.currentScope.assignments.push(assign);
            parameters.push(assign);
          } else {
            me.raise(
              `parameter default value must be a literal value`,
              new Range(
                parameterStartToken.start,
                me.token.end
              )
            );

            parameters.push(me.astProvider.invalidCodeExpression({
              start: parameterStartToken.start,
              end: me.previousToken.end,
              range: [parameterStartToken.range[0], me.previousToken.range[1]],
            }));
          }
        } else {
          const assign = me.astProvider.assignmentStatement({
            variable: parameter,
            init: me.astProvider.unknown({
              start: parameterStartToken.start,
              end: me.previousToken.end,
              range: [parameterStartToken.range[0], me.previousToken.range[1]],
              scope: me.currentScope
            }),
            start: parameterStartToken.start,
            end: me.previousToken.end,
            range: [parameterStartToken.range[0], me.previousToken.range[1]],
            scope: me.currentScope
          });

          me.currentScope.assignments.push(assign);
          parameters.push(parameter);
        }

        if (Selectors.RParenthesis(me.token)) break;
        me.requireToken(Selectors.ArgumentSeperator, functionStartToken.start);
        if (Selectors.RParenthesis(me.token)) {
          me.raise('expected argument instead received right parenthesis', new Range(
            me.previousToken.end,
            me.previousToken.end
          ));
          break;
        }
      }

      me.requireToken(Selectors.RParenthesis, functionStartToken.start);
    }

    functionStatement.parameters = parameters;

    const pendingBlock = new PendingFunction(functionStatement, base, me.lineRegistry);
    me.backpatches.push(pendingBlock);

    return functionStatement;
  }

  finalizeFunction() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingFunction(pendingBlock)) {
      me.raise('no matching open function block', new Range(
        me.token.start,
        me.token.end
      ));

      return;
    }

    me.popScope();

    pendingBlock.complete(me.previousToken);
    me.backpatches.pop();
  }

  parseOr(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseAnd(asLval, statementStart);
    let base = val;

    while (Selectors.Or(me.token)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseAnd();

      base = me.astProvider.logicalExpression({
        operator: Operator.Or,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAnd(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseNot(asLval, statementStart);
    let base = val;

    while (Selectors.And(me.token)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseNot();

      base = me.astProvider.logicalExpression({
        operator: Operator.And,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseNot(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const startToken = me.token;

    if (Selectors.Not(me.token)) {
      me.next();

      me.skipNewlines();

      const val = me.parseIsa();

      return me.astProvider.unaryExpression({
        operator: Operator.Not,
        argument: val,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return me.parseIsa(asLval, statementStart);
  }

  parseIsa(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseComparisons(asLval, statementStart);

    if (Selectors.Isa(me.token)) {
      me.next();

      me.skipNewlines();

      const opB = me.parseComparisons();

      return me.astProvider.isaExpression({
        operator: Operator.Isa,
        left: val,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
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
    const startToken = me.token;
    const val = me.parseAddSub(asLval, statementStart);

    if (!SelectorGroups.ComparisonOperators(
      me.token
    )) return val;

    const expressions: ASTBase[] = [val];
    const operators: string[] = [];

    do {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const right = me.parseAddSub();

      operators.push(token.value);
      expressions.push(right);
    } while (SelectorGroups.ComparisonOperators(
      me.token
    ));

    if (operators.length === 1) {
      return me.astProvider.binaryExpression({
        operator: operators[0],
        left: expressions[0],
        right: expressions[1],
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return me.astProvider.comparisonGroupExpression({
      operators,
      expressions,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });
  }

  parseAddSub(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseMultDiv(asLval, statementStart);
    let base = val;

    while (Selectors.Plus(me.token) || (Selectors.Minus(me.token) && (!statementStart || !me.token.afterSpace || me.lexer.isAtWhitespace()))) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseMultDiv();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
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
    const startToken = me.token;
    const val = me.parseUnaryMinus(asLval, statementStart);
    let base = val;

    while (SelectorGroups.MultiDivOperators(me.token)) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseUnaryMinus();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
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

    if (!Selectors.Minus(me.token)) {
      return me.parseNew(asLval, statementStart);
    }

    const startToken = me.token;

    me.next();
    me.skipNewlines();

    const val = me.parseNew();

    if (val instanceof ASTNumericLiteral || val instanceof ASTBooleanLiteral) {
      val.negated = true;
      return val;
    }

    return me.astProvider.unaryExpression({
      operator: Operator.Minus,
      argument: val,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });
  }

  parseNew(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!Selectors.New(me.token)) {
      return me.parseAddressOf(asLval, statementStart);
    }

    const startToken = me.token;

    me.next();
    me.skipNewlines();

    const val = me.parseNew();

    return me.astProvider.unaryExpression({
      operator: Operator.New,
      argument: val,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });
  }

  parseAddressOf(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (!Selectors.Reference(me.token)) {
      return me.parsePower(asLval, statementStart);
    }

    const startToken = me.token;

    me.next();
    me.skipNewlines();

    const val = me.parsePower();

    return me.astProvider.unaryExpression({
      operator: Operator.Reference,
      argument: val,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });
  }

  parsePower(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseCallExpr(asLval, statementStart);

    if (Selectors.Power(me.token)) {
      me.next();
      me.skipNewlines();

      const opB = me.parseCallExpr();

      return me.astProvider.binaryExpression({
        operator: Operator.Power,
        left: val,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
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
    const startToken = me.token;
    let base = me.parseMap(asLval, statementStart);

    while (!Selectors.EndOfFile(me.token)) {
      if (Selectors.MemberSeperator(me.token)) {
        me.next();
        me.skipNewlines();

        const identifier = me.parseIdentifier(ASTIdentifierKind.Property);
        const memberExpr = me.astProvider.memberExpression({
          base,
          indexer: Operator.Member,
          identifier,
          start: startToken.start,
          end: me.previousToken.end,
          range: [startToken.range[0], me.previousToken.range[1]],
          scope: me.currentScope
        });

        me.currentScope.namespaces.push(memberExpr);
        base = memberExpr;
      } else if (Selectors.SLBracket(me.token) && !me.token.afterSpace) {
        me.next();
        me.skipNewlines();

        if (Selectors.SliceSeperator(me.token)) {
          const left = me.astProvider.emptyExpression({
            start: me.previousToken.start,
            end: me.previousToken.end,
            range: me.previousToken.range,
            scope: me.currentScope
          });

          me.next();
          me.skipNewlines();

          const right = Selectors.SRBracket(me.token)
            ? me.astProvider.emptyExpression({
              start: me.previousToken.start,
              end: me.previousToken.end,
              range: me.previousToken.range,
              scope: me.currentScope
            })
            : me.parseExpr(null);

          base = me.astProvider.sliceExpression({
            base,
            left,
            right,
            start: startToken.start,
            end: me.token.end,
            range: [startToken.range[0], me.token.range[1]],
            scope: me.currentScope
          });
        } else {
          const index = me.parseExpr(null);

          if (Selectors.SliceSeperator(me.token)) {
            me.next();
            me.skipNewlines();

            const right = Selectors.SRBracket(me.token)
              ? me.astProvider.emptyExpression({
                start: me.previousToken.start,
                end: me.previousToken.end,
                range: me.previousToken.range,
                scope: me.currentScope
              })
              : me.parseExpr(null);

            base = me.astProvider.sliceExpression({
              base,
              left: index,
              right,
              start: startToken.start,
              end: me.token.end,
              range: [startToken.range[0], me.token.range[1]],
              scope: me.currentScope
            });
          } else {
            base = me.astProvider.indexExpression({
              base,
              index,
              start: startToken.start,
              end: me.token.end,
              range: [startToken.range[0], me.token.range[1]],
              scope: me.currentScope
            });
          }
        }

        me.requireToken(Selectors.SRBracket, startToken.start);
      } else if (
        Selectors.LParenthesis(me.token) &&
        (!asLval || !me.token.afterSpace)
      ) {
        const expressions = me.parseCallArgs();

        base = me.astProvider.callExpression({
          base,
          arguments: expressions,
          start: startToken.start,
          end: me.previousToken.end,
          range: [startToken.range[0], me.previousToken.range[1]],
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

    if (Selectors.LParenthesis(me.token)) {
      me.next();

      if (Selectors.RParenthesis(me.token)) {
        me.next();
      } else {
        while (!Selectors.EndOfFile(me.token)) {
          me.skipNewlines();
          const arg = me.parseExpr(null);
          expressions.push(arg);
          me.skipNewlines();
          if (
            Selectors.RParenthesis(me.requireTokenOfAny(
              SelectorGroups.CallArgsEnd,
              arg.start
            ))
          )
            break;
        }
      }
    }

    return expressions;
  }

  parseMap(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!Selectors.CLBracket(me.token)) {
      return me.parseList(asLval, statementStart);
    }

    const scope = me.currentScope;
    const startToken = me.token;
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope
    });

    me.next();

    if (Selectors.CRBracket(me.token)) {
      me.next();
    } else {
      me.skipNewlines();

      while (!Selectors.EndOfFile(me.token)) {
        if (Selectors.CRBracket(me.token)) {
          me.next();
          break;
        }

        const keyValueItem = me.astProvider.mapKeyString({
          key: null,
          value: null,
          start: me.token.start,
          end: null,
          range: [me.token.range[0], null],
          scope
        });
        keyValueItem.key = me.parseExpr(null);

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        keyValueItem.value = me.parseExpr(keyValueItem);
        keyValueItem.end = me.previousToken.end;
        keyValueItem.range[1] = me.previousToken.range[1];
        fields.push(keyValueItem);

        if (Selectors.MapSeperator(me.token)) {
          me.next();
          me.skipNewlines();
        }

        if (
          Selectors.CRBracket(me.token)
        ) {
          me.next();
          break;
        }
      }
    }

    mapConstructorExpr.end = me.token.start;
    mapConstructorExpr.range[1] = me.token.range[1];

    return mapConstructorExpr;
  }

  parseList(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!Selectors.SLBracket(me.token)) {
      return me.parseQuantity(asLval, statementStart);
    }

    const scope = me.currentScope;
    const startToken = me.token;
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope
    });

    me.next();

    if (Selectors.SRBracket(me.token)) {
      me.next();
    } else {
      me.skipNewlines();

      while (!Selectors.EndOfFile(me.token)) {
        if (Selectors.SRBracket(me.token)) {
          me.next();
          break;
        }

        const listValue = me.astProvider.listValue({
          value: null,
          start: me.token.start,
          end: null,
          range: [me.token.range[0], null],
          scope
        });

        listValue.value = me.parseExpr(listValue);
        listValue.end = me.previousToken.end;
        listValue.range[1] = me.previousToken.range[1];
        fields.push(listValue);

        if (Selectors.MapSeperator(me.token)) {
          me.next();
          me.skipNewlines();
        }

        if (
          Selectors.SRBracket(me.token)
        ) {
          me.next();
          break;
        }
      }
    }

    listConstructorExpr.end = me.token.start;
    listConstructorExpr.range[1] = me.token.range[1];

    return listConstructorExpr;
  }

  parseQuantity(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;

    if (!Selectors.LParenthesis(me.token)) {
      return me.parseAtom(asLval, statementStart);
    }

    const startToken = me.token;

    me.next();
    me.skipNewlines();

    const val = me.parseExpr(null);

    me.requireToken(Selectors.RParenthesis, startToken.start);

    return me.astProvider.parenthesisExpression({
      expression: val,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
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
      return me.parseIdentifier(ASTIdentifierKind.Variable);
    }

    me.raise(
      `got ${me.token} where number, string, or identifier is required`,
      new Range(
        me.token.start,
        me.token.end
      )
    );

    return me.parseInvalidCode();
  }

  parseLiteral(): ASTLiteral {
    const me = this;
    const startToken = me.token;
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
        start: startToken.start,
        end: me.token.end,
        range: [startToken.range[0], me.token.range[1]],
        scope: me.currentScope
      }
    );

    me.literals.push(<ASTLiteral>base);

    me.next();

    return base;
  }

  parseIdentifier(kind: ASTIdentifierKind): ASTIdentifier | ASTBase {
    const me = this;
    const identifierToken = me.requireType(TokenType.Identifier);

    if (identifierToken === null) {
      return me.parseInvalidCode();
    }

    const identifier = me.astProvider.identifier({
      kind: kind,
      name: identifierToken.value,
      start: identifierToken.start,
      end: identifierToken.end,
      range: identifierToken.range,
      scope: me.currentScope
    });

    if (kind !== ASTIdentifierKind.Property) {
      me.currentScope.namespaces.push(identifier);
    }

    return identifier;
  }

  parseInvalidCode() {
    const me = this;
    const invalidToken = me.token;
    const base = me.astProvider.invalidCodeExpression({
      start: invalidToken.start,
      end: invalidToken.end,
      range: invalidToken.range
    });

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
