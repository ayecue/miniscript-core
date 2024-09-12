import {
  ASTBase,
  ASTBaseBlockWithScope,
  ASTBaseBlockWithScopeOptions,
  ASTType
} from './base';

export interface ASTChunkOptions extends ASTBaseBlockWithScopeOptions {
  literals?: ASTBase[];
  scopes?: ASTBaseBlockWithScope[];
  lines?: Record<number, ASTBase[]>;
}

export class ASTChunk extends ASTBaseBlockWithScope {
  literals: ASTBase[];
  scopes: ASTBaseBlockWithScope[];
  lines: Record<number, ASTBase[]>;

  constructor(options: ASTChunkOptions) {
    super(ASTType.Chunk, options);
    this.literals = options.literals || [];
    this.scopes = options.scopes || [];
    this.lines = options.lines || {};
  }

  toString(): string {
    if (this.body.length === 0) {
      return `Chunk[${this.start}-${this.end}][]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `Chunk[${this.start}-${this.end}][\n${body}\n]`;
  }

  clone(): ASTChunk {
    return new ASTChunk({
      literals: this.literals.map((it) => it.clone()),
      scopes: this.scopes.map((it) => it.clone()),
      lines: this.lines,
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
