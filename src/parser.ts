import Lexer from './lexer';
import { LiteralToken, Token, TokenType } from './lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTChunk,
  ASTForGenericStatement,
  ASTIdentifier,
  ASTIdentifierKind,
  ASTLiteral,
  ASTProvider,
  ASTWhileStatement
} from './parser/ast';
import Validator from './parser/validator';
import { ErrorCode, ParserException } from './types/errors';
import { Keyword } from './types/keywords';
import { Operator } from './types/operators';
import { Precedence } from './types/precedence';
import { Range } from './types/range';
import { getSelectorsFromGroup, getSelectorValue, Selector, SelectorGroup, SelectorGroups, Selectors } from './types/selector';
import { Stack } from './utils/stack';
import { PendingBlock, PendingChunk, PendingFunction, isPendingChunk } from './parser/pending-block';
import { LineRegistry } from './parser/line-registry';
import { Comment } from './types/comment';
import { NoopConsumer, PreserveConsumer } from './parser/noop-consumer';
import { PrefixOp, InfixOp, AtomOp, KeywordOp } from './types/ops';
import { defaultPrefixOps } from './parser/ops/prefix';
import { defaultInfixOps } from './parser/ops/infix';
import { defaultAtomOps } from './parser/ops/atom';
import { defaultKeywordOps } from './parser/ops/keyword';
import { describeTokenRef, describeSelectorRef, joinWithOr } from './parser/describe';
import { describeBlockType } from './parser/describe';
import { ParserShape } from './types/parser';
import UnsafeParserMixin from './mixins/unsafe-parser-mixin';
import { UnsafeLexer } from './lexer';
import { ParserState } from './parser/state';

export interface ParserOptions {
  validator?: Validator;
  astProvider?: ASTProvider;
  lexer?: Lexer;
  unsafe?: boolean;
  tabWidth?: number;
  preserve?: boolean;
  prefixOps?: PrefixOp[];
  infixOps?: InfixOp[];
  atomOps?: AtomOp[];
  keywordOps?: KeywordOp[];
  state?: ParserState;
  strictMode?: boolean;
}

export default class Parser implements ParserShape {
  // runtime
  token: Token | null;
  previousToken: Token | null;
  currentScope: ASTBaseBlockWithScope;
  outerScopes: ASTBaseBlockWithScope[];
  currentAssignment: ASTAssignmentStatement;
  iteratorStack: (ASTForGenericStatement | ASTWhileStatement)[];

  // helpers
  state: ParserState;
  backpatches: Stack<PendingBlock>;

  // comment attachment state
  pendingLeadingComments: string[];
  lastStatement: ASTBase | null;

  // settings
  content: string;
  lexer: Lexer;
  validator: Validator;
  astProvider: ASTProvider;
  preserve: boolean;
  noopConsumer: NoopConsumer | null;
  errors: Error[];
  strictMode: boolean;

  // O(1) selectorId
  prefixOps: PrefixOp[];
  infixOps: InfixOp[];
  atomOps: AtomOp[];
  keywordOps: KeywordOp[];

  constructor(content: string, options: ParserOptions = {}) {
    const me = this;

    me.content = content;
    me.backpatches = new Stack();
    me.lexer =
      options.lexer ||
      new Lexer(content, {
        unsafe: options.unsafe,
        tabWidth: options.tabWidth
      });
    me.token = null;
    me.previousToken = null;
    me.state = options.state || new ParserState();
    me.currentScope = null;
    me.currentAssignment = null;
    me.outerScopes = [];
    me.iteratorStack = [];
    me.pendingLeadingComments = [];
    me.lastStatement = null;
    me.validator = options.validator || new Validator();
    me.astProvider = options.astProvider || new ASTProvider();
    me.preserve = options.preserve || false;
    me.noopConsumer = me.preserve ? PreserveConsumer : null;
    me.errors = [];
    me.prefixOps = options.prefixOps || defaultPrefixOps;
    me.infixOps = options.infixOps || defaultInfixOps;
    me.atomOps = options.atomOps || defaultAtomOps;
    me.keywordOps = options.keywordOps || defaultKeywordOps;
    me.strictMode = options.strictMode ?? false;
  }

  getState(): ParserState {
    return this.state;
  }

  get lineRegistry(): LineRegistry {
    return this.getState().lineRegistry;
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

  requireType(type: TokenType, fromLine?: number, fromChar?: number, context?: string): Token | null {
    const token = this.token;

    if (this.token.type !== type) {
      this.raise(
        `got ${describeTokenRef(token)}${context ? ' in ' + context : ''} where ${TokenType[type]} is required`,
        new Range(
          fromLine == null || fromChar == null
            ? [token.line, token.startChar]
            : [fromLine, fromChar],
          [token.endLine, token.endChar]
        ),
        ErrorCode.ExpectedToken
      );
      return null;
    }

    this.next();
    return token;
  }

  requireToken(selector: Selector, fromLine?: number, fromChar?: number, context?: string): Token | null {
    const token = this.token;

    if (!selector(token)) {
      this.raise(
        `got ${describeTokenRef(token)}${context ? ' in ' + context : ''} where ${describeSelectorRef(selector)} is required`,
        new Range(
          fromLine == null || fromChar == null
            ? [token.line, token.startChar]
            : [fromLine, fromChar],
          [token.endLine, token.endChar]
        ),
        ErrorCode.ExpectedToken
      );
      return null;
    }

    this.next();
    return token;
  }

  requireTokenOfAny(selectorGroup: SelectorGroup, fromLine?: number, fromChar?: number, context?: string): Token | null {
    const token = this.token;

    if (selectorGroup(token)) {
      this.next();
      return token;
    }

    this.raise(
      `got ${describeTokenRef(token)}${context ? ' in ' + context : ''} where one of ${joinWithOr(
        getSelectorsFromGroup(selectorGroup)
          .map((selector: Selector) => describeSelectorRef(selector))
      )} is required`,
      new Range(
        fromLine == null || fromChar == null
          ? [token.line, token.startChar]
          : [fromLine, fromChar],
        [token.endLine, token.endChar]
      ),
      ErrorCode.ExpectedToken
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

        me.getState().comments.push(comment);
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
      me.getState().scopes.push(scope);
      me.outerScopes.push(me.currentScope);
    }

    me.currentScope = scope;
  }

  popScope() {
    const me = this;
    me.currentScope = me.outerScopes.pop();
  }

  finishRemainingScopes() {
    const me = this;
    let last = me.backpatches.pop();

    while (!isPendingChunk(last)) {
      const blockName = describeBlockType(last.block.type);
      const parent = me.backpatches.peek();
      let hint = `Add 'end ${blockName}' to close this block`;
      if (!isPendingChunk(parent)) {
        const parentName = describeBlockType(parent.block.type);
        hint += ` (inside '${parentName}' at line ${parent.block.startLine})`;
      }
      const message = blockName === 'if'
        ? `Unclosed '${blockName}' block`
        : `'${blockName}' without matching 'end ${blockName}'`;
      const exception = new ParserException(
        message,
        new Range(
          [last.block.startLine, last.block.startChar],
          [last.block.startLine, last.block.startChar]
        ),
        ErrorCode.UnclosedBlock,
        hint
      );

      last.complete(me.previousToken);
      me.errors.push(exception);
      throw exception;
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

      me.parseStatement();
    }

    me.finishRemainingScopes();
    me.popScope();
    pending.complete(me.token);

    chunk.literals = me.state.literals;
    chunk.comments = me.state.comments;
    chunk.scopes = me.state.scopes;

    return chunk;
  }

  parseStatement(): void {
    const me = this;

    if (TokenType.Keyword === me.token.type) {
      const kwOp = me.keywordOps[me.token.selectorId];
      if (kwOp) {
        kwOp.parse(me);
        return;
      }
      if (Keyword.Not !== me.token.value) {
        me.raise(
          `Unexpected Keyword('${me.token.value}')`,
          new Range(
            [me.token.line, me.token.startChar],
            [me.token.endLine, me.token.endChar]
          ),
          ErrorCode.UnexpectedKeyword
        );

        return;
      }
    }

    const pendingBlock = me.backpatches.peek();
    const item = me.parseAssignment();

    if (item.endLine !== 0) me.lineRegistry.register(item);
    me.attachPendingComments(item);
    pendingBlock.body.push(item);
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
      if (me.strictMode) {
        me.raise(
          `shorthand assignment '${me.token.value}' is not allowed in strict mode`,
          new Range(
            [me.token.line, me.token.startChar],
            [me.token.endLine, me.token.endChar]
          )
        );
      }

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
      if (Selectors.ArgumentSeparator(me.token)) {
        me.next();
        me.consumeNoop();
        continue;
      }

      const requiredToken = me.requireTokenOfAny(
        SelectorGroups.AssignmentCommandArgs,
        startToken.line,
        startToken.startChar,
        'command arguments'
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

  parseExpr(base: ASTBase, asLval: boolean = false, statementStart: boolean = false): ASTBase {
    return this.parseFunctionDeclaration(base, asLval, statementStart);
  }

  parseFunctionDeclaration(base: ASTBase, asLval: boolean, statementStart: boolean): ASTBase {
    const me = this;

    if (!Selectors.Function(me.token)) return me.parseExprPrecedence(Precedence.None, asLval, statementStart);

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
      me.requireToken(Selectors.LParenthesis, functionStartToken.line, functionStartToken.startChar, 'function declaration');

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
              `Parameter default value must be a literal`,
              new Range(
                [parameterStartToken.startLine, parameterStartToken.startChar],
                [me.token.endLine, me.token.endChar]
              ),
              ErrorCode.InvalidDefaultValue,
              `Only numbers, strings, booleans, and null are allowed as defaults`
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
        me.requireToken(Selectors.ArgumentSeparator, functionStartToken.line, functionStartToken.startChar, 'function parameters');
        if (Selectors.RParenthesis(me.token)) {
          me.raise('Trailing comma in parameter list', new Range(
            [me.previousToken.endLine, me.previousToken.endChar],
            [me.previousToken.endLine, me.previousToken.endChar]
          ), ErrorCode.TrailingCommaInParams, `Remove the trailing comma before ')'`);
          break;
        }
      }

      me.requireToken(Selectors.RParenthesis, functionStartToken.line, functionStartToken.startChar, 'function parameters');
    }

    functionStatement.parameters = parameters;

    const pendingBlock = new PendingFunction(functionStatement, base, me.lineRegistry);
    me.backpatches.push(pendingBlock);

    return functionStatement;
  }

  parseExprPrecedence(
    minPrec: number,
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    let left = me.parsePrefix(minPrec, asLval, statementStart);

    const eofId = Selectors.EndOfFile.selectorId;
    const idx = me.infixOps;

    for (;;) {
      const token = me.token;
      if (token.selectorId === eofId) break;
      const op = idx[token.selectorId];
      if (!op || op.precedence < minPrec) break;
      if (!op.match(me, asLval, statementStart)) break;
      left = op.parse(me, left, startToken, asLval, statementStart);
    }

    return left;
  }

  parsePrefix(
    minPrec: number,
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const sid = me.token.selectorId;

    const prefixOp = me.prefixOps[sid];
    if (prefixOp && prefixOp.threshold >= minPrec && prefixOp.match(me)) {
      return prefixOp.parse(me, startToken, asLval, statementStart);
    }

    const atomOp = me.atomOps[sid];
    if (atomOp && atomOp.match(me)) {
      return atomOp.parse(me, asLval, statementStart);
    }

    return me.parseAtom();
  }

  parseAtom(): ASTBase {
    const me = this;

    if (me.validator.isLiteral(<TokenType>me.token.type)) {
      return me.parseLiteral();
    } else if (me.isType(TokenType.Identifier)) {
      return me.parseIdentifier(ASTIdentifierKind.Variable);
    }

    me.raise(
      `got ${describeTokenRef(me.token)} where number, string, or identifier is required`,
      new Range(
        [me.token.line, me.token.startChar],
        [me.token.endLine, me.token.endChar]
      ),
      ErrorCode.ExpectedExpression
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

    me.getState().literals.push(<ASTLiteral>base);

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

  raise(message: string, range: Range, code: ErrorCode = ErrorCode.Unknown, hint?: string): ParserException {
    const err = new ParserException(message, range, code, hint);
    this.errors.push(err);
    throw err;
  }
}

export class UnsafeParser extends UnsafeParserMixin(Parser) {
  constructor(content: string, options: ParserOptions = {}) {
    const lexer = options.lexer || new UnsafeLexer(content, {
      tabWidth: options.tabWidth
    });
    super(content, { ...options, lexer });
  }
}