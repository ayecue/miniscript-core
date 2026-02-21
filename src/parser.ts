import Lexer from './lexer';
import { LiteralToken, Token, TokenType } from './lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTBooleanLiteral,
  ASTChunk,
  ASTClause,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIdentifierKind,
  ASTListValue,
  ASTLiteral,
  ASTMapKeyString,
  ASTNumericLiteral,
  ASTProvider,
  ASTReturnStatement,
  ASTType,
  ASTWhileStatement
} from './parser/ast';
import Validator from './parser/validator';
import { ParserException } from './types/errors';
import { Keyword } from './types/keywords';
import { Operator } from './types/operators';
import { Range } from './types/range';
import { getSelectorsFromGroup, getSelectorValue, Selector, SelectorGroup, SelectorGroups, Selectors } from './types/selector';
import { Stack } from './utils/stack';
import { PendingBlock, PendingChunk, PendingClauseType, PendingFor, PendingFunction, PendingIf, PendingWhile, isPendingChunk, isPendingFor, isPendingFunction, isPendingIf, isPendingWhile } from './parser/pending-block';
import { LineRegistry } from './parser/line-registry';
import { Comment } from './types/comment';
import { NoopConsumer, PreserveConsumer } from './parser/noop-consumer';

export interface ParserOptions {
  validator?: Validator;
  astProvider?: ASTProvider;
  lexer?: Lexer;
  unsafe?: boolean;
  tabWidth?: number;
  preserve?: boolean;
}

export default class Parser {
  // runtime
  token: Token | null;
  previousToken: Token | null;
  currentScope: ASTBaseBlockWithScope;
  outerScopes: ASTBaseBlockWithScope[];
  currentAssignment: ASTAssignmentStatement;
  iteratorStack: (ASTForGenericStatement | ASTWhileStatement)[];

  // helpers
  literals: ASTLiteral[];
  comments: Comment[];
  scopes: ASTBaseBlockWithScope[];
  backpatches: Stack<PendingBlock>;
  statementErrors: Error[];
  lineRegistry: LineRegistry;

  // comment attachment state
  pendingLeadingComments: string[];
  lastStatement: ASTBase | null;

  // settings
  content: string;
  lexer: Lexer;
  validator: Validator;
  astProvider: ASTProvider;
  unsafe: boolean;
  preserve: boolean;
  noopConsumer: NoopConsumer | null;
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
    me.iteratorStack = [];
    me.literals = [];
    me.comments = [];
    me.pendingLeadingComments = [];
    me.lastStatement = null;
    me.validator = options.validator || new Validator();
    me.astProvider = options.astProvider || new ASTProvider();
    me.unsafe = options.unsafe || false;
    me.preserve = options.preserve || false;
    me.noopConsumer = me.preserve ? PreserveConsumer : null;
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

  requireType(type: TokenType, fromLine?: number, fromChar?: number): Token | null {
    const token = this.token;

    if (this.token.type !== type) {
      this.raise(
        `got ${token} where ${TokenType[type]} is required`,
        new Range(
          fromLine == null || fromChar == null
            ? [token.line, token.startChar]
            : [fromLine, fromChar],
          [token.endLine, token.endChar]
        )
      );
      return null;
    }

    this.next();
    return token;
  }

  requireToken(selector: Selector, fromLine?: number, fromChar?: number): Token | null {
    const token = this.token;

    if (!selector(token)) {
      this.raise(
        `got ${token} where "${getSelectorValue(selector)}" is required`,
        new Range(
          fromLine == null || fromChar == null
            ? [token.line, token.startChar]
            : [fromLine, fromChar],
          [token.endLine, token.endChar]
        )
      );
      return null;
    }

    this.next();
    return token;
  }

  requireTokenOfAny(selectorGroup: SelectorGroup, fromLine?: number, fromChar?: number): Token | null {
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
        fromLine == null || fromChar == null
          ? [token.line, token.startChar]
          : [fromLine, fromChar],
        [token.endLine, token.endChar]
      )
    );

    return null;
  }

  consumeNoop(): number {
    const me = this;
    let lines = 0;
    while (true) {
      if (Selectors.Comment(me.token)) {
        const isStatement = me.previousToken?.line !== me.token.line;
        const comment: Comment = {
          value: me.token.value,
          isMultiline: false
        };

        me.comments.push(comment);
        me.noopConsumer?.onComment(me, comment, isStatement);
      } else if (Selectors.EndOfLine(me.token)) {
        me.noopConsumer?.onEmptyLine(me);
      } else {
        break;
      }

      me.next();
    }

    return lines;
  }

  attachPendingComments(item: ASTBase): void {
    const me = this;
    if (!me.preserve) return;

    if (me.pendingLeadingComments.length > 0) {
      item.leadingComments = me.pendingLeadingComments;
      me.pendingLeadingComments = [];
    }

    me.lastStatement = item;
  }

  flushPendingComments(): void {
    const me = this;
    if (!me.preserve) return;
    me.pendingLeadingComments = [];
    me.lastStatement = null;
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
        [last.block.startLine, last.block.startChar],
        [last.block.startLine, last.block.startChar]
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

    const chunk = me.astProvider.chunk({ startLine: me.token.line, startChar: me.token.startChar, endLine: 0, endChar: 0, rangeStart: me.token.rangeStart, rangeEnd: null, registry: me.lineRegistry, scope: null });
    const pending = new PendingChunk(chunk, me.lineRegistry);

    me.backpatches.setDefault(pending);
    me.pushScope(chunk);

    while (!Selectors.EndOfFile(me.token)) {
      me.consumeNoop();

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
    chunk.comments = me.comments;
    chunk.scopes = me.scopes;

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

    if (item.endLine !== 0) me.lineRegistry.register(item);
    me.attachPendingComments(item);
    pendingBlock.body.push(item);
  }

  parseContinueStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (me.iteratorStack.length === 0) {
      me.raise(
        `'continue' without open loop block`,
        new Range(
          [me.previousToken.line, me.previousToken.startChar],
          [me.previousToken.endLine, me.previousToken.endChar]
        )
      );
    }

    const item = me.astProvider.continueStatement({
      iterator: me.iteratorStack[me.iteratorStack.length - 1],
      startLine: me.previousToken.line, startChar: me.previousToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });

    me.lineRegistry.register(item);
    me.attachPendingComments(item);
    pendingBlock.body.push(item);
  }

  parseBreakStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (me.iteratorStack.length === 0) {
      me.raise(
        `'break' without open loop block`,
        new Range(
          [me.previousToken.line, me.previousToken.startChar],
          [me.previousToken.endLine, me.previousToken.endChar]
        )
      );
    }

    const item = me.astProvider.breakStatement({
      iterator: me.iteratorStack[me.iteratorStack.length - 1],
      startLine: me.previousToken.line, startChar: me.previousToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });

    me.lineRegistry.register(item);
    me.attachPendingComments(item);
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
        if (item.endLine !== 0) {
          me.lineRegistry.register(item);
        }
        me.attachPendingComments(item);
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
        me.flushPendingComments();
        me.nextIfClause(ASTType.ElseifClause);
        return;
      }
      case Keyword.Else: {
        me.next();
        me.flushPendingComments();
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
        me.flushPendingComments();
        me.finalizeFunction();
        return;
      }
      case Keyword.EndFor: {
        me.next();
        me.flushPendingComments();
        me.finalizeForStatement();
        return;
      }
      case Keyword.EndWhile: {
        me.next();
        me.flushPendingComments();
        me.finalizeWhileStatement();
        return;
      }
      case Keyword.EndIf: {
        me.next();
        me.flushPendingComments();
        me.nextIfClause(null);
        return;
      }
      case Keyword.Continue: {
        me.next();
        me.parseContinueStatement();
        return;
      }
      case Keyword.Break: {
        me.next();
        me.parseBreakStatement();
        return;
      }
    }

    me.raise(
      `unexpected keyword ${me.token} at start of line`,
      new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      )
    );
  }

  parseShortcutContinueStatement() {
    const me = this;

    if (me.iteratorStack.length === 0) {
      me.raise(
        `'continue' without open loop block`,
        new Range(
          [me.previousToken.line, me.previousToken.startChar],
          [me.previousToken.endLine, me.previousToken.endChar]
        )
      );
    }

    return me.astProvider.continueStatement({
      iterator: me.iteratorStack[me.iteratorStack.length - 1],
      startLine: me.previousToken.line, startChar: me.previousToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });
  }

  parseShortcutBreakStatement() {
    const me = this;

    if (me.iteratorStack.length === 0) {
      me.raise(
        `'break' without open loop block`,
        new Range(
          [me.previousToken.line, me.previousToken.startChar],
          [me.previousToken.endLine, me.previousToken.endChar]
        )
      );
    }

    return me.astProvider.breakStatement({
      iterator: me.iteratorStack[me.iteratorStack.length - 1],
      startLine: me.previousToken.line, startChar: me.previousToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });
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
          return me.parseShortcutContinueStatement();
        }
        case Keyword.Break: {
          me.next();
          return me.parseShortcutBreakStatement();
        }
        default: {
          me.raise(
            `unexpected keyword ${me.token} in shorthand statement`,
            new Range(
              [me.token.line, me.token.startChar],
              [me.token.endLine, me.token.endChar]
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
        startLine: startToken.line, startChar: startToken.startChar,
        rangeStart: startToken.rangeStart, rangeEnd: null,
        endLine: 0, endChar: 0,
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      assignmentStatement.init = me.parseExpr(assignmentStatement);
      assignmentStatement.endLine = me.previousToken.endLine; assignmentStatement.endChar = me.previousToken.endChar;
      assignmentStatement.rangeEnd = me.previousToken.rangeEnd;

      me.currentAssignment = previousAssignment;

      scope.definitions.push(assignmentStatement);

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
        startLine: startToken.line, startChar: startToken.startChar,
        rangeStart: startToken.rangeStart, rangeEnd: null,
        endLine: 0, endChar: 0,
        scope
      });
      const previousAssignment = me.currentAssignment;

      me.currentAssignment = assignmentStatement;

      const binaryExpressionTokenStart = me.token;
      const operator = <Operator>op.value.charAt(0);
      const rightExpr = me.parseExpr(assignmentStatement);
      const right = me.astProvider.parenthesisExpression({
        startLine: rightExpr.startLine, startChar: rightExpr.startChar,
        endLine: rightExpr.endLine, endChar: rightExpr.endChar,
        rangeStart: rightExpr.rangeStart, rangeEnd: rightExpr.rangeEnd,
        expression: rightExpr
      });

      assignmentStatement.init = me.astProvider.binaryExpression({
        operator,
        left: expr.clone(),
        right,
        startLine: binaryExpressionTokenStart.line, startChar: binaryExpressionTokenStart.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: binaryExpressionTokenStart.rangeStart, rangeEnd: me.previousToken.rangeEnd,
        scope
      });
      assignmentStatement.endLine = me.previousToken.endLine; assignmentStatement.endChar = me.previousToken.endChar;
      assignmentStatement.rangeEnd = me.previousToken.rangeEnd;

      me.currentAssignment = previousAssignment;

      scope.definitions.push(assignmentStatement);

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
        me.consumeNoop();
        continue;
      }

      const requiredToken = me.requireTokenOfAny(
        SelectorGroups.AssignmentCommandArgs,
        startToken.line,
        startToken.startChar
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
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
        scope
      });
    }

    return me.astProvider.callStatement({
      expression: me.astProvider.callExpression({
        base: expr,
        arguments: expressions,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
        scope
      }),
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope
    });

    if (
      SelectorGroups.ReturnStatementEnd(me.token)
    ) {
      returnStatement.endLine = me.previousToken.endLine; returnStatement.endChar = me.previousToken.endChar;
      returnStatement.rangeEnd = me.previousToken.rangeEnd;
    } else {
      expression = me.parseExpr(returnStatement);

      returnStatement.endLine = me.previousToken.endLine; returnStatement.endChar = me.previousToken.endChar;
      returnStatement.rangeEnd = me.previousToken.rangeEnd;
      returnStatement.argument = expression;
    }

    scope.returns.push(returnStatement);

    return returnStatement;
  }

  parseIfStatement(): void {
    const me = this;
    const startToken = me.previousToken;
    const ifCondition = me.parseExpr(null);

    me.lineRegistry.register(ifCondition);
    me.requireToken(Selectors.Then, startToken.line, startToken.startChar);

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      me.parseIfShortcutStatement(ifCondition, startToken);
      return;
    }

    const ifStatement = me.astProvider.ifStatement({
      clauses: [],
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope: me.currentScope
    });

    const clause = me.astProvider.ifClause({
      condition: ifCondition,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.token.endLine, endChar: me.token.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
      scope: me.currentScope
    });

    me.attachPendingComments(ifStatement);

    const pendingBlock = new PendingIf(ifStatement, clause, me.lineRegistry);
    me.backpatches.push(pendingBlock);
  }

  nextIfClause(type: PendingClauseType | null) {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingIf(pendingBlock)) {
      me.raise('no matching open if block', new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      ));

      return;
    }

    pendingBlock.next(me.previousToken);

    switch (type) {
      case ASTType.ElseifClause: {
        const ifStatementStartToken = me.token;
        const ifCondition = me.parseExpr(null);

        me.requireToken(Selectors.Then, ifStatementStartToken.line, ifStatementStartToken.startChar);

        pendingBlock.currentClause = me.astProvider.elseifClause({
          condition: ifCondition,
          startLine: ifStatementStartToken.line, startChar: ifStatementStartToken.startChar,
          endLine: 0, endChar: 0,
          rangeStart: ifStatementStartToken.rangeStart, rangeEnd: null,
          scope: me.currentScope
        });
        break;
      }
      case ASTType.ElseClause: {
        const elseStatementStartToken = me.token;

        pendingBlock.currentClause = me.astProvider.elseClause({
          startLine: elseStatementStartToken.line, startChar: elseStatementStartToken.startChar,
          endLine: 0, endChar: 0,
          rangeStart: elseStatementStartToken.rangeStart, rangeEnd: null,
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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope: me.currentScope
    });
    const item = me.parseShortcutStatement();

    clauses.push(
      me.astProvider.ifShortcutClause({
        condition,
        body: [item],
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.token.endLine, endChar: me.token.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
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
          startLine: elseItemStartToken.line, startChar: elseItemStartToken.startChar,
          endLine: me.token.endLine, endChar: me.token.endChar,
          rangeStart: elseItemStartToken.rangeStart, rangeEnd: me.token.rangeEnd,
          scope: me.currentScope
        })
      );
    }

    ifStatement.endLine = me.token.endLine; ifStatement.endChar = me.token.endChar;
    ifStatement.rangeEnd = me.token.rangeEnd;

    me.lineRegistry.register(ifStatement);
    me.attachPendingComments(ifStatement);
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
          [startToken.line, startToken.startChar],
          [me.token.endLine, me.token.endChar]
        )
      );

      return;
    }

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      return me.parseWhileShortcutStatement(condition, startToken);
    }

    const whileStatement = me.astProvider.whileStatement({
      condition,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope: me.currentScope
    });

    me.attachPendingComments(whileStatement);

    const pendingBlock = new PendingWhile(whileStatement, me.lineRegistry);
    me.backpatches.push(pendingBlock);
    me.iteratorStack.push(whileStatement);
  }

  finalizeWhileStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingWhile(pendingBlock)) {
      me.raise('no matching open while block', new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);
    me.iteratorStack.pop();
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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });

    me.lineRegistry.register(whileStatement);
    me.attachPendingComments(whileStatement);
    block.body.push(whileStatement);
  }

  parseForStatement(): void {
    const me = this;
    const scope = me.currentScope;
    const startToken = me.previousToken;
    const variable = me.parseIdentifier(ASTIdentifierKind.ForInVariable) as ASTIdentifier;

    me.requireToken(Selectors.In, startToken.line, startToken.startChar);

    const iterator = me.parseExpr(null);

    if (!iterator) {
      me.raise(
        `sequence expression expected for 'for' loop`,
        new Range(
          [startToken.line, startToken.startChar],
          [me.token.endLine, me.token.endChar]
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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope
    });

    scope.definitions.push(forStatement);

    me.attachPendingComments(forStatement);

    const pendingBlock = new PendingFor(forStatement, me.lineRegistry);
    me.backpatches.push(pendingBlock);
    me.iteratorStack.push(forStatement);
  }

  finalizeForStatement() {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (!isPendingFor(pendingBlock)) {
      me.raise('no matching open for block', new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      ));

      return;
    }

    pendingBlock.complete(me.previousToken);
    me.iteratorStack.pop();
    me.backpatches.pop();
    me.backpatches.peek().body.push(pendingBlock.block);
  }

  parseForShortcutStatement(
    variable: ASTIdentifier,
    iterator: ASTBase,
    startToken: Token
  ): void {
    const me = this;
    const scope = me.currentScope;
    const block = me.backpatches.peek();
    const item = me.parseShortcutStatement();

    const forStatement = me.astProvider.forGenericStatement({
      variable,
      iterator,
      body: [item],
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
      scope: me.currentScope
    });

    scope.definitions.push(forStatement);
    me.lineRegistry.register(forStatement);
    me.attachPendingComments(forStatement);
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
      startLine: functionStartToken.line, startChar: functionStartToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: functionStartToken.rangeStart, rangeEnd: null,
      scope: me.currentScope,
      parent: me.outerScopes[me.outerScopes.length - 1],
      assignment: me.currentAssignment
    });
    const parameters = [];

    me.pushScope(functionStatement);

    if (!SelectorGroups.BlockEndOfLine(me.token)) {
      me.requireToken(Selectors.LParenthesis, functionStartToken.line, functionStartToken.startChar);

      while (!SelectorGroups.FunctionDeclarationArgEnd(me.token)) {
        const parameter = me.parseIdentifier(ASTIdentifierKind.Argument);
        const parameterStartToken = parameter;

        if (me.consume(Selectors.Assign)) {
          const defaultValue = me.parseExpr(null);

          if (defaultValue instanceof ASTLiteral) {
            const assign = me.astProvider.assignmentStatement({
              variable: parameter,
              init: defaultValue,
              startLine: parameterStartToken.startLine, startChar: parameterStartToken.startChar,
              endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
              rangeStart: parameterStartToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
              scope: me.currentScope
            });

            me.currentScope.definitions.push(assign);
            parameters.push(assign);
          } else {
            me.raise(
              `parameter default value must be a literal value`,
              new Range(
                [parameterStartToken.startLine, parameterStartToken.startChar],
                [me.token.endLine, me.token.endChar]
              )
            );

            parameters.push(me.astProvider.invalidCodeExpression({
              startLine: parameterStartToken.startLine, startChar: parameterStartToken.startChar,
              endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
              rangeStart: parameterStartToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
            }));
          }
        } else {
          const assign = me.astProvider.assignmentStatement({
            variable: parameter,
            init: me.astProvider.unknown({
              startLine: parameterStartToken.startLine, startChar: parameterStartToken.startChar,
              endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
              rangeStart: parameterStartToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
              scope: me.currentScope
            }),
            startLine: parameterStartToken.startLine, startChar: parameterStartToken.startChar,
            endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
            rangeStart: parameterStartToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
            scope: me.currentScope
          });

          me.currentScope.definitions.push(assign);
          parameters.push(parameter);
        }

        if (Selectors.RParenthesis(me.token)) break;
        me.requireToken(Selectors.ArgumentSeperator, functionStartToken.line, functionStartToken.startChar);
        if (Selectors.RParenthesis(me.token)) {
          me.raise('expected argument instead received right parenthesis', new Range(
            [me.previousToken.endLine, me.previousToken.endChar],
            [me.previousToken.endLine, me.previousToken.endChar]
          ));
          break;
        }
      }

      me.requireToken(Selectors.RParenthesis, functionStartToken.line, functionStartToken.startChar);
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
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
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
      me.consumeNoop();

      const opB = me.parseAnd();

      base = me.astProvider.logicalExpression({
        operator: Operator.Or,
        left: base,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      me.consumeNoop();

      const opB = me.parseNot();

      base = me.astProvider.logicalExpression({
        operator: Operator.And,
        left: base,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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

      me.consumeNoop();

      const val = me.parseIsa();

      return me.astProvider.unaryExpression({
        operator: Operator.Not,
        argument: val,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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

      me.consumeNoop();

      const opB = me.parseComparisons();

      return me.astProvider.isaExpression({
        operator: Operator.Isa,
        left: val,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      me.consumeNoop();

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
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
        scope: me.currentScope
      });
    }

    return me.astProvider.comparisonGroupExpression({
      operators,
      expressions,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      me.consumeNoop();

      const opB = me.parseMultDiv();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      me.consumeNoop();

      const opB = me.parseUnaryMinus();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
    me.consumeNoop();

    const val = me.parseNew();

    if (val instanceof ASTNumericLiteral || val instanceof ASTBooleanLiteral) {
      val.negated = true;
      return val;
    }

    return me.astProvider.unaryExpression({
      operator: Operator.Minus,
      argument: val,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
    me.consumeNoop();

    const val = me.parseNew();

    return me.astProvider.unaryExpression({
      operator: Operator.New,
      argument: val,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
    me.consumeNoop();

    const val = me.parsePower(true, statementStart);

    return me.astProvider.unaryExpression({
      operator: Operator.Reference,
      argument: val,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
      me.consumeNoop();

      const opB = me.parseCallExpr();

      return me.astProvider.binaryExpression({
        operator: Operator.Power,
        left: val,
        right: opB,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
        me.consumeNoop();

        const identifier = me.parseIdentifier(ASTIdentifierKind.Property);
        const memberExpr = me.astProvider.memberExpression({
          base,
          indexer: Operator.Member,
          identifier,
          startLine: startToken.line, startChar: startToken.startChar,
          endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
          rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
          scope: me.currentScope
        });

        me.currentScope.namespaces.push(memberExpr);
        base = memberExpr;
      } else if (Selectors.SLBracket(me.token) && !me.token.afterSpace) {
        me.next();
        me.consumeNoop();

        if (Selectors.SliceSeperator(me.token)) {
          const left = me.astProvider.emptyExpression({
            startLine: me.previousToken.line, startChar: me.previousToken.startChar,
            endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
            rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
            scope: me.currentScope
          });

          me.next();
          me.consumeNoop();

          const right = Selectors.SRBracket(me.token)
            ? me.astProvider.emptyExpression({
              startLine: me.previousToken.line, startChar: me.previousToken.startChar,
              endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
              rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
              scope: me.currentScope
            })
            : me.parseExpr(null);

          base = me.astProvider.sliceExpression({
            base,
            left,
            right,
            startLine: startToken.line, startChar: startToken.startChar,
            endLine: me.token.endLine, endChar: me.token.endChar,
            rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
            scope: me.currentScope
          });
        } else {
          const index = me.parseExpr(null);

          if (Selectors.SliceSeperator(me.token)) {
            me.next();
            me.consumeNoop();

            const right = Selectors.SRBracket(me.token)
              ? me.astProvider.emptyExpression({
                startLine: me.previousToken.line, startChar: me.previousToken.startChar,
                endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
                rangeStart: me.previousToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
                scope: me.currentScope
              })
              : me.parseExpr(null);

            base = me.astProvider.sliceExpression({
              base,
              left: index,
              right,
              startLine: startToken.line, startChar: startToken.startChar,
              endLine: me.token.endLine, endChar: me.token.endChar,
              rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
              scope: me.currentScope
            });
          } else {
            base = me.astProvider.indexExpression({
              base,
              index,
              isStatementStart: statementStart,
              startLine: startToken.line, startChar: startToken.startChar,
              endLine: me.token.endLine, endChar: me.token.endChar,
              rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
              scope: me.currentScope
            });
          }
        }

        me.requireToken(Selectors.SRBracket, startToken.line, startToken.startChar);
      } else if (
        Selectors.LParenthesis(me.token) &&
        (!asLval || !me.token.afterSpace)
      ) {
        const expressions = me.parseCallArgs();

        base = me.astProvider.callExpression({
          base,
          arguments: expressions,
          startLine: startToken.line, startChar: startToken.startChar,
          endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
          rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
          me.consumeNoop();
          const arg = me.parseExpr(null);
          expressions.push(arg);
          me.consumeNoop();
          if (
            Selectors.RParenthesis(me.requireTokenOfAny(
              SelectorGroups.CallArgsEnd,
              arg.startLine,
              arg.startChar
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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope
    });

    me.next();

    if (Selectors.CRBracket(me.token)) {
      me.next();
    } else {
      me.consumeNoop();

      while (!Selectors.EndOfFile(me.token)) {
        if (Selectors.CRBracket(me.token)) {
          me.next();
          break;
        }

        const keyValueItem = me.astProvider.mapKeyString({
          key: null,
          value: null,
          startLine: me.token.line, startChar: me.token.startChar,
          endLine: 0, endChar: 0,
          rangeStart: me.token.rangeStart, rangeEnd: null,
          scope
        });
        keyValueItem.key = me.parseExpr(null);

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.consumeNoop();

        keyValueItem.value = me.parseExpr(keyValueItem);
        keyValueItem.endLine = me.previousToken.endLine; keyValueItem.endChar = me.previousToken.endChar;
        keyValueItem.rangeEnd = me.previousToken.rangeEnd;
        fields.push(keyValueItem);

        if (Selectors.MapSeperator(me.token)) {
          me.next();
          me.consumeNoop();
        }

        if (
          Selectors.CRBracket(me.token)
        ) {
          me.next();
          break;
        }
      }
    }

    mapConstructorExpr.endLine = me.token.line; mapConstructorExpr.endChar = me.token.startChar;
    mapConstructorExpr.rangeEnd = me.token.rangeEnd;

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
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: 0, endChar: 0,
      rangeStart: startToken.rangeStart, rangeEnd: null,
      scope
    });

    me.next();

    if (Selectors.SRBracket(me.token)) {
      me.next();
    } else {
      me.consumeNoop();

      while (!Selectors.EndOfFile(me.token)) {
        if (Selectors.SRBracket(me.token)) {
          me.next();
          break;
        }

        const listValue = me.astProvider.listValue({
          value: null,
          startLine: me.token.line, startChar: me.token.startChar,
          endLine: 0, endChar: 0,
          rangeStart: me.token.rangeStart, rangeEnd: null,
          scope
        });

        listValue.value = me.parseExpr(listValue);
        listValue.endLine = me.previousToken.endLine; listValue.endChar = me.previousToken.endChar;
        listValue.rangeEnd = me.previousToken.rangeEnd;
        fields.push(listValue);

        if (Selectors.MapSeperator(me.token)) {
          me.next();
          me.consumeNoop();
        }

        if (
          Selectors.SRBracket(me.token)
        ) {
          me.next();
          break;
        }
      }
    }

    listConstructorExpr.endLine = me.token.line; listConstructorExpr.endChar = me.token.startChar;
    listConstructorExpr.rangeEnd = me.token.rangeEnd;

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
    me.consumeNoop();

    const val = me.parseExpr(null);

    me.requireToken(Selectors.RParenthesis, startToken.line, startToken.startChar);

    return me.astProvider.parenthesisExpression({
      expression: val,
      startLine: startToken.line, startChar: startToken.startChar,
      endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
      rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
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
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
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
        raw: (me.token as LiteralToken).raw,
        startLine: startToken.line, startChar: startToken.startChar,
        endLine: me.token.endLine, endChar: me.token.endChar,
        rangeStart: startToken.rangeStart, rangeEnd: me.token.rangeEnd,
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
      startLine: identifierToken.line, startChar: identifierToken.startChar,
      endLine: identifierToken.endLine, endChar: identifierToken.endChar,
      rangeStart: identifierToken.rangeStart, rangeEnd: identifierToken.rangeEnd,
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
      startLine: invalidToken.line, startChar: invalidToken.startChar,
      endLine: invalidToken.endLine, endChar: invalidToken.endChar,
      rangeStart: invalidToken.rangeStart, rangeEnd: invalidToken.rangeEnd
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
