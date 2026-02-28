import { Token } from '../lexer/token';
import {
  ASTAssignmentStatement,
  ASTBaseBlockWithScope,
  ASTForGenericStatement,
  ASTLiteral,
  ASTWhileStatement
} from '../parser/ast';
import { LineRegistry } from '../parser/line-registry';
import { PendingBlock } from '../parser/pending-block';
import { Stack } from '../utils/stack';
import { Comment } from './comment';

export interface ParserShape {
  token: Token | null;
  previousToken: Token | null;
  literals: ASTLiteral[];
  scopes: ASTBaseBlockWithScope[];
  outerScopes: ASTBaseBlockWithScope[];
  comments: Comment[];
  iteratorStack: (ASTForGenericStatement | ASTWhileStatement)[];
  lineRegistry: LineRegistry;
  currentScope: ASTBaseBlockWithScope;
  currentAssignment: ASTAssignmentStatement;
  backpatches: Stack<PendingBlock>;
  errors: Error[];
  lexer: any;
  next(): void;
  parseStatement(): void;
  finishRemaingScopes(): void;
}
