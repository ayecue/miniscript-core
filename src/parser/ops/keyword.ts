import type Parser from '../../parser';
import { ASTBase, ASTClause, ASTIdentifier, ASTIdentifierKind, ASTReturnStatement, ASTType } from '../ast';
import { Token, TokenType } from '../../lexer/token';
import { Selectors, SelectorGroups } from '../../types/selector';
import { Keyword } from '../../types/keywords';
import { ErrorCode } from '../../types/errors';
import { Range } from '../../types/range';
import { PendingClauseType, PendingFor, PendingFunction, PendingIf, PendingWhile, isPendingFor, isPendingFunction, isPendingIf, isPendingWhile } from '../pending-block';
import { KeywordOp, KeywordStatementHandler } from '../../types/ops';
import { OpBuilder } from './base';

function raiseKeywordError(message: string, hint?: string): KeywordStatementHandler {
  return (me: Parser) => {
    me.raise(
      message,
      new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      ),
      ErrorCode.UnexpectedKeyword,
      hint
    );
  };
}

export class KeywordHandlerBuilder extends OpBuilder<KeywordOp> {
  add(op: KeywordOp): this;
  add(selectorId: number, handler: KeywordStatementHandler): this;
  add(opOrId: KeywordOp | number, handler?: KeywordStatementHandler): this {
    if (typeof opOrId === 'number') {
      return super.add({ selectorId: opOrId, parse: handler! });
    }
    return super.add(opOrId);
  }

  override(selectorId: number, handler: KeywordStatementHandler): this {
    const idx = this.ops.findIndex(op => op.selectorId === selectorId);
    if (idx !== -1) {
      this.ops[idx] = { ...this.ops[idx], parse: handler };
    }
    return this;
  }
}

export function buildKeywordOpIndex(ops: KeywordOp[]): KeywordOp[] {
  const index: KeywordOp[] = [];
  for (const op of ops) {
    index[op.selectorId] = op;
  }
  return index;
}

export function parseReturnStatement(me: Parser): ASTReturnStatement {
  const scope = me.currentScope;
  const startToken = me.previousToken;

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
    const expression = me.parseExpr(returnStatement);

    returnStatement.endLine = me.previousToken.endLine; returnStatement.endChar = me.previousToken.endChar;
    returnStatement.rangeEnd = me.previousToken.rangeEnd;
    returnStatement.argument = expression;
  }

  scope.returns.push(returnStatement);

  return returnStatement;
}

export function parseContinueStatement(me: Parser): void {
  const pendingBlock = me.backpatches.peek();

  if (me.iteratorStack.length === 0) {
    me.raise(
      `Keyword('continue') without open loop block`,
      new Range(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      ),
      ErrorCode.ContinueOutsideLoop,
      `'continue' can only be used inside 'while' or 'for' loops`
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

export function parseBreakStatement(me: Parser): void {
  const pendingBlock = me.backpatches.peek();

  if (me.iteratorStack.length === 0) {
    me.raise(
      `Keyword('break') without open loop block`,
      new Range(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      ),
      ErrorCode.BreakOutsideLoop,
      `'break' can only be used inside 'while' or 'for' loops`
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

function parseShortcutContinueStatement(me: Parser): ASTBase {
  if (me.iteratorStack.length === 0) {
    me.raise(
      `Keyword('continue') without open loop block`,
      new Range(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      ),
      ErrorCode.ContinueOutsideLoop,
      `'continue' can only be used inside 'while' or 'for' loops`
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

function parseShortcutBreakStatement(me: Parser): ASTBase {
  if (me.iteratorStack.length === 0) {
    me.raise(
      `Keyword('break') without open loop block`,
      new Range(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      ),
      ErrorCode.BreakOutsideLoop,
      `'break' can only be used inside 'while' or 'for' loops`
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

export function parseShortcutStatement(me: Parser): ASTBase {
  if (TokenType.Keyword === me.token.type && Keyword.Not !== me.token.value) {
    const value = me.token.value;

    switch (value) {
      case Keyword.Return: {
        me.next();
        return parseReturnStatement(me);
      }
      case Keyword.Continue: {
        me.next();
        return parseShortcutContinueStatement(me);
      }
      case Keyword.Break: {
        me.next();
        return parseShortcutBreakStatement(me);
      }
      default: {
        me.raise(
          `Unexpected keyword '${me.token.value}' in shorthand statement`,
          new Range(
            [me.token.line, me.token.startChar],
            [me.token.endLine, me.token.endChar]
          ),
          ErrorCode.UnexpectedKeyword
        );

        return me.parseInvalidCode();
      }
    }
  }

  return me.parseAssignment();
}

export function parseIfStatement(me: Parser): void {
  const startToken = me.previousToken;
  const ifCondition = me.parseExpr(null);

  me.lineRegistry.register(ifCondition);
  me.requireToken(Selectors.Then, startToken.line, startToken.startChar, 'if statement');

  if (!SelectorGroups.BlockEndOfLine(me.token)) {
    parseIfShortcutStatement(me, ifCondition, startToken);
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
  me.lastStatement = clause;

  const pendingBlock = new PendingIf(ifStatement, clause, me.lineRegistry);
  me.backpatches.push(pendingBlock);
}

function parseIfShortcutStatement(
  me: Parser,
  condition: ASTBase,
  startToken: Token
): void {
  const clauses: ASTClause[] = [];
  const block = me.backpatches.peek();
  const ifStatement = me.astProvider.ifShortcutStatement({
    clauses,
    startLine: startToken.line, startChar: startToken.startChar,
    endLine: 0, endChar: 0,
    rangeStart: startToken.rangeStart, rangeEnd: null,
    scope: me.currentScope
  });
  const item = parseShortcutStatement(me);

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
    const elseItem = parseShortcutStatement(me);

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

export function nextIfClause(me: Parser, type: PendingClauseType | null): void {
  const pendingBlock = me.backpatches.peek();

  if (!isPendingIf(pendingBlock)) {
    me.raise(`'${me.previousToken.value}' without matching 'if'`, new Range(
      [me.token.line, me.token.startChar],
      [me.token.endLine, me.token.endChar]
    ), ErrorCode.NoMatchingBlock);

    return;
  }

  pendingBlock.next(me.previousToken);

  switch (type) {
    case ASTType.ElseifClause: {
      const ifStatementStartToken = me.token;
      const ifCondition = me.parseExpr(null);

      me.requireToken(Selectors.Then, ifStatementStartToken.line, ifStatementStartToken.startChar, 'else-if clause');

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
      pendingBlock.currentClause = me.astProvider.elseClause({
        startLine: me.previousToken.line, startChar: me.previousToken.startChar,
        endLine: 0, endChar: 0,
        rangeStart: me.previousToken.rangeStart, rangeEnd: null,
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

function consumeClauseTrailingComment(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  if (isPendingIf(pendingBlock)) {
    me.consumeInlineComment(pendingBlock.currentClause);
  }
}

export function parseWhileStatement(me: Parser): void {
  const startToken = me.previousToken;
  const condition = me.parseExpr(null);

  if (!condition) {
    me.raise(
      `'while' requires a condition`,
      new Range(
        [startToken.line, startToken.startChar],
        [me.token.endLine, me.token.endChar]
      ),
      ErrorCode.ExpectedCondition
    );

    return;
  }

  if (!SelectorGroups.BlockEndOfLine(me.token)) {
    parseWhileShortcutStatement(me, condition, startToken);
    return;
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

function parseWhileShortcutStatement(me: Parser, condition: ASTBase, startToken: Token): void {
  const block = me.backpatches.peek();
  const item = parseShortcutStatement(me);

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

export function finalizeWhileStatement(me: Parser): void {
  const pendingBlock = me.backpatches.peek();

  if (!isPendingWhile(pendingBlock)) {
    me.raise(`'end while' without matching 'while'`, new Range(
      [me.token.line, me.token.startChar],
      [me.token.endLine, me.token.endChar]
    ), ErrorCode.NoMatchingBlock);

    return;
  }

  pendingBlock.complete(me.previousToken);
  me.iteratorStack.pop();
  me.backpatches.pop();
  me.backpatches.peek().body.push(pendingBlock.block);
}

export function parseForStatement(me: Parser): void {
  const scope = me.currentScope;
  const startToken = me.previousToken;
  const variable = me.parseIdentifier(ASTIdentifierKind.ForInVariable) as ASTIdentifier;

  me.requireToken(Selectors.In, startToken.line, startToken.startChar, 'for statement');

  const iterator = me.parseExpr(null);

  if (!iterator) {
    me.raise(
      `Expected iterator expression after 'in'`,
      new Range(
        [startToken.line, startToken.startChar],
        [me.token.endLine, me.token.endChar]
      ),
      ErrorCode.ExpectedExpression
    );

    return;
  }

  if (!SelectorGroups.BlockEndOfLine(me.token)) {
    parseForShortcutStatement(me, variable, iterator, startToken);
    return;
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

function parseForShortcutStatement(
  me: Parser,
  variable: ASTIdentifier,
  iterator: ASTBase,
  startToken: Token
): void {
  const scope = me.currentScope;
  const block = me.backpatches.peek();
  const item = parseShortcutStatement(me);

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

export function finalizeForStatement(me: Parser): void {
  const pendingBlock = me.backpatches.peek();

  if (!isPendingFor(pendingBlock)) {
    me.raise(`'end for' without matching 'for'`, new Range(
      [me.token.line, me.token.startChar],
      [me.token.endLine, me.token.endChar]
    ), ErrorCode.NoMatchingBlock);

    return;
  }

  pendingBlock.complete(me.previousToken);
  me.iteratorStack.pop();
  me.backpatches.pop();
  me.backpatches.peek().body.push(pendingBlock.block);
}

export function finalizeFunction(me: Parser): void {
  const pendingBlock = me.backpatches.peek();

  if (!isPendingFunction(pendingBlock)) {
    me.raise(`'end function' without matching 'function'`, new Range(
      [me.token.line, me.token.startChar],
      [me.token.endLine, me.token.endChar]
    ), ErrorCode.NoMatchingBlock);

    return;
  }

  me.popScope();

  pendingBlock.complete(me.previousToken);
  me.backpatches.pop();
}

export function defaultKeywordHandlerBuilder(): KeywordHandlerBuilder {
  return new KeywordHandlerBuilder()
    .add(Selectors.Return.selectorId, (me: Parser) => {
      const pendingBlock = me.backpatches.peek();
      me.next();
      const item = parseReturnStatement(me);
      if (item.endLine !== 0) {
        me.lineRegistry.register(item);
      }
      me.attachPendingComments(item);
      pendingBlock.body.push(item);
    })
    .add(Selectors.If.selectorId, (me: Parser) => {
      me.next();
      parseIfStatement(me);
    })
    .add(Selectors.ElseIf.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      nextIfClause(me, ASTType.ElseifClause);
      consumeClauseTrailingComment(me);
    })
    .add(Selectors.Else.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      nextIfClause(me, ASTType.ElseClause);
      consumeClauseTrailingComment(me);
    })
    .add(Selectors.While.selectorId, (me: Parser) => {
      me.next();
      parseWhileStatement(me);
    })
    .add(Selectors.For.selectorId, (me: Parser) => {
      me.next();
      parseForStatement(me);
    })
    .add(Selectors.EndFunction.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      finalizeFunction(me);
      me.consumeEndTrailingComment();
    })
    .add(Selectors.EndFor.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      finalizeForStatement(me);
      me.consumeEndTrailingComment();
    })
    .add(Selectors.EndWhile.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      finalizeWhileStatement(me);
      me.consumeEndTrailingComment();
    })
    .add(Selectors.EndIf.selectorId, (me: Parser) => {
      me.next();
      me.flushPendingComments();
      nextIfClause(me, null);
      me.consumeEndTrailingComment();
    })
    .add(Selectors.Continue.selectorId, (me: Parser) => {
      me.next();
      parseContinueStatement(me);
    })
    .add(Selectors.Break.selectorId, (me: Parser) => {
      me.next();
      parseBreakStatement(me);
    })
    .add(Selectors.Function.selectorId, raiseKeywordError(
      `Keyword('function') can only be used within expressions`,
      `Use 'function' on the right side of an assignment, e.g. f = function(x)`
    ))
    .add(Selectors.New.selectorId, raiseKeywordError(
      `Keyword('new') can only be used within expressions`,
      `Use 'new' on the right side of an assignment, e.g. obj = new MyClass`
    ))
    .add(Selectors.And.selectorId, raiseKeywordError(
      `Keyword('and') can only be used within expressions`,
      `Use 'and' as a binary operator, e.g. if a and b then`
    ))
    .add(Selectors.Or.selectorId, raiseKeywordError(
      `Keyword('or') can only be used within expressions`,
      `Use 'or' as a binary operator, e.g. if a or b then`
    ))
    .add(Selectors.Isa.selectorId, raiseKeywordError(
      `Keyword('isa') can only be used within expressions`,
      `Use 'isa' as a binary operator, e.g. if obj isa MyClass then`
    ))
    .add(Selectors.In.selectorId, raiseKeywordError(
      `Keyword('in') can only be used within a 'for' loop`,
      `Use 'in' as part of a for loop, e.g. for item in collection`
    ))
    .add(Selectors.Then.selectorId, raiseKeywordError(
      `Keyword('then') can only be used within an 'if' or 'else if' statement`,
      `Use 'then' after an 'if' condition, e.g. if x > 0 then`
    ))
    .add(Selectors.Repeat.selectorId, raiseKeywordError(
      `Keyword('repeat') is currently unused`,
      `'repeat' is a reserved keyword but has no function`
    ));
}

export const defaultKeywordOps: KeywordOp[] = buildKeywordOpIndex(
  defaultKeywordHandlerBuilder().build()
);
