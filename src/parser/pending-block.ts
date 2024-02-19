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
  onCompleteCallback: PendingBlockCompleteCallback;

  onComplete(): void;
}

abstract class PendingBlockBase {
  block: ASTBase;
  body: ASTBase[];
  type: PendingBlockType;
  onCompleteCallback: PendingBlockCompleteCallback;

  constructor(block: ASTBase, type: PendingBlockType) {
    this.block = block;
    this.body = [];
    this.type = type;
    this.onCompleteCallback = null;
  }

  onComplete(): void {
    this.onCompleteCallback?.(this);
  }
}

export function isPendingChunk(
  pendingBlock: PendingBlock
): pendingBlock is PendingChunk {
  return pendingBlock.type === PendingBlockType.Chunk;
}

export class PendingChunk extends PendingBlockBase implements PendingBlock {
  block: ASTChunk;

  constructor(block: ASTChunk) {
    super(block, PendingBlockType.Chunk);
  }
}

export function isPendingFor(
  pendingBlock: PendingBlock
): pendingBlock is PendingFor {
  return pendingBlock.type === PendingBlockType.For;
}

export class PendingFor extends PendingBlockBase implements PendingBlock {
  block: ASTForGenericStatement;

  constructor(block: ASTForGenericStatement) {
    super(block, PendingBlockType.For);
  }
}

export function isPendingFunction(
  pendingBlock: PendingBlock
): pendingBlock is PendingFunction {
  return pendingBlock.type === PendingBlockType.Function;
}

export class PendingFunction extends PendingBlockBase implements PendingBlock {
  block: ASTFunctionStatement;

  constructor(block: ASTFunctionStatement) {
    super(block, PendingBlockType.Function);
  }
}

export function isPendingIf(
  pendingBlock: PendingBlock
): pendingBlock is PendingIf {
  return pendingBlock.type === PendingBlockType.If;
}

export type PendingClauseType = ASTType.ElseifClause | ASTType.ElseClause;

export class PendingIf extends PendingBlockBase implements PendingBlock {
  block: ASTIfStatement;
  currentClause: ASTIfClause | ASTElseClause;
  onCompleteCallback: PendingBlockCompleteCallback;

  constructor(block: ASTIfStatement, current: ASTIfClause) {
    super(block, PendingBlockType.If);
    this.currentClause = current;
  }
}

export function isPendingWhile(
  pendingBlock: PendingBlock
): pendingBlock is PendingWhile {
  return pendingBlock.type === PendingBlockType.While;
}

export class PendingWhile extends PendingBlockBase implements PendingBlock {
  block: ASTWhileStatement;

  constructor(block: ASTWhileStatement) {
    super(block, PendingBlockType.While);
  }
}
