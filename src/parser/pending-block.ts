import { Token } from '../lexer/token';
import {
  ASTBase,
  ASTChunk,
  ASTElseClause,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIfClause,
  ASTIfStatement,
  ASTType,
  ASTWhileStatement
} from './ast';

type PendingBlockCompleteCallback = (pendingBlock: PendingBlock) => void | null;

export enum PendingBlockType {
  Chunk,
  For,
  Function,
  If,
  While
}

export interface PendingBlock {
  block: ASTBase;
  body: ASTBase[];
  type: PendingBlockType;
  onComplete: PendingBlockCompleteCallback;

  complete(endToken: Token): void;
}

abstract class PendingBlockBase {
  block: ASTBase;
  body: ASTBase[];
  type: PendingBlockType;
  onComplete: PendingBlockCompleteCallback;

  constructor(block: ASTBase, type: PendingBlockType) {
    this.block = block;
    this.body = [];
    this.type = type;
    this.onComplete = null;
  }

  complete(_endToken: Token): void {
    this.onComplete?.(this);
  }
}

export function isPendingChunk(
  pendingBlock: PendingBlock
): pendingBlock is PendingChunk {
  return pendingBlock.type === PendingBlockType.Chunk;
}

export class PendingChunk extends PendingBlockBase implements PendingBlock {
  declare block: ASTChunk;

  constructor(block: ASTChunk) {
    super(block, PendingBlockType.Chunk);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    super.complete(endToken);
  }
}

export function isPendingFor(
  pendingBlock: PendingBlock
): pendingBlock is PendingFor {
  return pendingBlock.type === PendingBlockType.For;
}

export class PendingFor extends PendingBlockBase implements PendingBlock {
  declare block: ASTForGenericStatement;

  constructor(block: ASTForGenericStatement) {
    super(block, PendingBlockType.For);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    super.complete(endToken);
  }
}

export function isPendingFunction(
  pendingBlock: PendingBlock
): pendingBlock is PendingFunction {
  return pendingBlock.type === PendingBlockType.Function;
}

export class PendingFunction extends PendingBlockBase implements PendingBlock {
  declare block: ASTFunctionStatement;

  constructor(block: ASTFunctionStatement) {
    super(block, PendingBlockType.Function);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    super.complete(endToken);
  }
}

export function isPendingIf(
  pendingBlock: PendingBlock
): pendingBlock is PendingIf {
  return pendingBlock.type === PendingBlockType.If;
}

export type PendingClauseType = ASTType.ElseifClause | ASTType.ElseClause;

export class PendingIf extends PendingBlockBase implements PendingBlock {
  declare block: ASTIfStatement;
  currentClause: ASTIfClause | ASTElseClause;
  onCompleteCallback: PendingBlockCompleteCallback;

  constructor(block: ASTIfStatement, current: ASTIfClause) {
    super(block, PendingBlockType.If);
    this.currentClause = current;
  }

  next(endToken: Token): void {
    this.currentClause.body = this.body;
    this.currentClause.end = endToken.end;
    this.currentClause.range = [this.currentClause.range[0], endToken.range[1]];
    this.block.clauses.push(this.currentClause);
    super.complete(endToken);
    this.body = [];
  }

  complete(endToken: Token): void {
    if (this.body.length > 0) this.next(endToken);
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    super.complete(endToken);
  }
}

export function isPendingWhile(
  pendingBlock: PendingBlock
): pendingBlock is PendingWhile {
  return pendingBlock.type === PendingBlockType.While;
}

export class PendingWhile extends PendingBlockBase implements PendingBlock {
  declare block: ASTWhileStatement;

  constructor(block: ASTWhileStatement) {
    super(block, PendingBlockType.While);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    super.complete(endToken);
  }
}
