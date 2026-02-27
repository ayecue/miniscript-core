import {
  ASTBaseBlockWithScope,
  ASTBaseBlockWithScopeOptions,
  ASTType
} from './base';
import { Comment } from '../../types/comment';
import { ASTLiteral } from './literal';
import { LineRegistry, LineRegistryView } from '../line-registry';

export interface ASTChunkOptions extends ASTBaseBlockWithScopeOptions {
  registry: LineRegistry;
  literals?: ASTLiteral[];
  comments?: Comment[];
  scopes?: ASTBaseBlockWithScope[];
  lines?: LineRegistryView;
}

export class ASTChunk extends ASTBaseBlockWithScope {
  literals: ASTLiteral[];
  comments: Comment[];
  scopes: ASTBaseBlockWithScope[];

  protected _reg: LineRegistry;
  private _lines: LineRegistryView;

  constructor(options: ASTChunkOptions) {
    super(ASTType.Chunk, { definitions: options.definitions, returns: options.returns, namespaces: options.namespaces, parent: options.parent, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    this.literals = options.literals || [];
    this.comments = options.comments || [];
    this.scopes = options.scopes || [];
    this._reg = options.registry;
  }

  get lines() {
    return this._lines ??= this._reg.build();
  }

  toString(): string {
    if (this.body.length === 0) {
      return `Chunk[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][]`;
    }

    const body = this.body
      .map((item) => `${item}`)
      .join('\n')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `Chunk[${this.startLine}:${this.startChar}-${this.endLine}:${this.endChar}][\n${body}\n]`;
  }

  clone(): ASTChunk {
    return new ASTChunk({
      literals: this.literals.map((it) => it.clone()),
      comments: [...this.comments],
      scopes: this.scopes.map((it) => it.clone()),
      registry: this._reg,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });
  }
}
