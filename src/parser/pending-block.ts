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
import { LineRegistry } from './line-registry';

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
  protected lineRegistry: LineRegistry;

  block: ASTBase;
  body: ASTBase[];
  type: PendingBlockType;
  onComplete: PendingBlockCompleteCallback;

  constructor(
    block: ASTBase,
    type: PendingBlockType,
    lineRegistry: LineRegistry
  ) {
    this.lineRegistry = lineRegistry;
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

  constructor(block: ASTChunk, lineRegistry: LineRegistry) {
    super(block, PendingBlockType.Chunk, lineRegistry);
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

  constructor(block: ASTForGenericStatement, lineRegistry: LineRegistry) {
    super(block, PendingBlockType.For, lineRegistry);
    this.lineRegistry.addItemToLine(this.block.start.line, this.block);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    this.lineRegistry.addItemToLine(
      endToken.end.line,
      this.block
    );
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

  private base: ASTBase | null;

  constructor(
    block: ASTFunctionStatement,
    base: ASTBase | null,
    lineRegistry: LineRegistry
  ) {
    super(block, PendingBlockType.Function, lineRegistry);
    this.base = base;
    this.lineRegistry.addItemToLine(this.block.start.line, this.block);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];

    if (this.base !== null) {
      this.base.end = this.block.end;
      this.base.range[1] = this.block.range[1];
      this.lineRegistry.addItemToLine(
        this.base.end.line,
        this.base
      );
    } else {
      this.lineRegistry.addItemToLine(
        this.block.end.line,
        this.block
      );
    }

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

  constructor(
    block: ASTIfStatement,
    current: ASTIfClause,
    lineRegistry: LineRegistry
  ) {
    super(block, PendingBlockType.If, lineRegistry);
    this.lineRegistry.addItemToLine(this.block.start.line, this.block);
    this.currentClause = current;
  }

  private addCurrentClauseToLineRegistry(): void {
    if (this.currentClause.start.line === this.block.start.line) {
      return;
    }

    this.lineRegistry.addItemToLine(
      this.currentClause.start.line,
      this.block
    );
  }

  next(endToken: Token): void {
    this.currentClause.body = this.body;
    this.currentClause.end = endToken.end;
    this.currentClause.range = [this.currentClause.range[0], endToken.range[1]];
    this.addCurrentClauseToLineRegistry();
    this.block.clauses.push(this.currentClause);
    super.complete(endToken);
    this.body = [];
  }

  complete(endToken: Token): void {
    if (this.body.length > 0) this.next(endToken);
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    this.lineRegistry.addItemToLine(
      this.block.end.line,
      this.block
    );
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

  constructor(block: ASTWhileStatement, lineRegistry: LineRegistry) {
    super(block, PendingBlockType.While, lineRegistry);
    this.lineRegistry.addItemToLine(this.block.start.line, this.block);
  }

  complete(endToken: Token): void {
    this.block.body = this.body;
    this.block.end = endToken.end;
    this.block.range = [this.block.range[0], endToken.range[1]];
    this.lineRegistry.addItemToLine(
      endToken.end.line,
      this.block
    );
    super.complete(endToken);
  }
}
