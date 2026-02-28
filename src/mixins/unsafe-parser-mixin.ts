import { Token, TokenType } from '../lexer/token';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBaseBlockWithScope,
  ASTLiteral
} from '../parser/ast';
import { isPendingChunk, PendingBlock } from '../parser/pending-block';
import { describeBlockType } from '../parser/describe';
import { ErrorCode, ParserException } from '../types/errors';
import { Range } from '../types/range';
import { Stack } from '../utils/stack';
import { LineRegistry } from '../parser/line-registry';
import { Comment } from '../types/comment';
import { ParserShape } from '../types/parser';

export interface ParserSnapshot {
  literalsLength: number;
  scopesLength: number;
  outerScopesLength: number;
  commentsLength: number;
  iteratorStackLength: number;
  lineRegistryItemsLength: number;
  currentScope: ASTBaseBlockWithScope;
  currentScopeNamespacesLength: number;
  currentScopeDefinitionsLength: number;
  currentScopeReturnsLength: number;
  currentAssignment: ASTAssignmentStatement;
  backpatchesLength: number;
  pendingBodyLength: number;
}

type ParserConstructor<T extends ParserShape> = new (...args: any[]) => T;

export default function UnsafeParserMixin<T extends ParserConstructor<ParserShape>>(Base: T) {
  return class UnsafeParser extends Base {
    statementErrors: Error[] = [];

    raise(message: string, range: Range, code: ErrorCode = ErrorCode.Unknown, hint?: string): ParserException {
      const err = new ParserException(message, range, code, hint);
      this.statementErrors.push(err);
      return err;
    }

    parseStatement(): void {
      const me = this;

      me.lexer.recordSnapshot();
      me.statementErrors = [];

      const snapshot: ParserSnapshot = {
        literalsLength: me.literals.length,
        scopesLength: me.scopes.length,
        outerScopesLength: me.outerScopes.length,
        commentsLength: me.comments.length,
        iteratorStackLength: me.iteratorStack.length,
        lineRegistryItemsLength: me.lineRegistry.items.length,
        currentScope: me.currentScope,
        currentScopeNamespacesLength: me.currentScope.namespaces.length,
        currentScopeDefinitionsLength: me.currentScope.definitions.length,
        currentScopeReturnsLength: me.currentScope.returns.length,
        currentAssignment: me.currentAssignment,
        backpatchesLength: me.backpatches.length,
        pendingBodyLength: me.backpatches.peek().body.length,
      };

      super.parseStatement();

      if (me.statementErrors.length > 0) {
        me.tryToRecover(snapshot);
      }
    }

    tryToRecover(snapshot: ParserSnapshot) {
      const me = this;
      const firstPointOfFailure = me.statementErrors[0];

      me.errors.push(firstPointOfFailure);

      // Roll back parser state to before the failed statement
      me.literals.length = snapshot.literalsLength;
      me.scopes.length = snapshot.scopesLength;
      me.outerScopes.length = snapshot.outerScopesLength;
      me.comments.length = snapshot.commentsLength;
      me.iteratorStack.length = snapshot.iteratorStackLength;
      me.lineRegistry.items.length = snapshot.lineRegistryItemsLength;

      me.currentScope = snapshot.currentScope;
      me.currentScope.namespaces.length = snapshot.currentScopeNamespacesLength;
      me.currentScope.definitions.length = snapshot.currentScopeDefinitionsLength;
      me.currentScope.returns.length = snapshot.currentScopeReturnsLength;

      me.currentAssignment = snapshot.currentAssignment;

      me.backpatches.truncate(snapshot.backpatchesLength);
      me.backpatches.peek().body.length = snapshot.pendingBodyLength;

      // Rewind lexer and skip to end of line
      me.lexer.recoverFromSnapshot();
      me.next();
      for (; me.token.type !== TokenType.EOL && me.token.type !== TokenType.EOF; me.next());
    }

    finishRemaingScopes() {
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
        const exception = new ParserException(
          `Unclosed '${blockName}' block`,
          new Range(
            [last.block.startLine, last.block.startChar],
            [last.block.startLine, last.block.startChar]
          ),
          ErrorCode.UnclosedBlock,
          hint
        );

        last.complete(me.previousToken);
        me.errors.push(exception);

        last = me.backpatches.pop();
      }
    }
  };
}
