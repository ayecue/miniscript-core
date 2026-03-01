import { Token } from '../lexer/token';
import {
  ASTAssignmentStatement,
  ASTBaseBlockWithScope,
  ASTForGenericStatement,
  ASTWhileStatement
} from '../parser/ast';
import { ParserState } from '../parser/state';
import { LineRegistry } from '../parser/line-registry';
import { PendingBlock } from '../parser/pending-block';
import { Stack } from '../utils/stack';

export interface ParserShape {
  token: Token | null;
  previousToken: Token | null;
  state: ParserState;
  outerScopes: ASTBaseBlockWithScope[];
  iteratorStack: (ASTForGenericStatement | ASTWhileStatement)[];
  lineRegistry: LineRegistry;
  currentScope: ASTBaseBlockWithScope;
  currentAssignment: ASTAssignmentStatement;
  backpatches: Stack<PendingBlock>;
  errors: Error[];
  lexer: any;
  getState(): ParserState;
  next(): void;
  parseStatement(): void;
  finishRemainingScopes(): void;
}
