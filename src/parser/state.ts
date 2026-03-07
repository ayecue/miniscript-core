import { Comment } from '../types/comment';
import { ASTBaseBlockWithScope, ASTLiteral } from './ast';
import { LineRegistry } from './line-registry';

export interface ParserStateSnapshot {
  literalsLength: number;
  scopesLength: number;
  commentsLength: number;
  lineRegistryItemsLength: number;
}

export class ParserState {
  literals: ASTLiteral[];
  comments: Comment[];
  scopes: ASTBaseBlockWithScope[];
  lineRegistry: LineRegistry;

  constructor() {
    this.literals = [];
    this.comments = [];
    this.scopes = [];
    this.lineRegistry = new LineRegistry();
  }

  snapshot(): ParserStateSnapshot {
    return {
      literalsLength: this.literals.length,
      scopesLength: this.scopes.length,
      commentsLength: this.comments.length,
      lineRegistryItemsLength: this.lineRegistry.items.length
    };
  }

  restore(snapshot: ParserStateSnapshot): void {
    this.literals.length = snapshot.literalsLength;
    this.scopes.length = snapshot.scopesLength;
    this.comments.length = snapshot.commentsLength;
    this.lineRegistry.items.length = snapshot.lineRegistryItemsLength;
  }

  merge(other: ParserState): void {
    this.literals.push(...other.literals);
    this.comments.push(...other.comments);
    this.scopes.push(...other.scopes);
    this.lineRegistry.items.push(...other.lineRegistry.items);
  }

  createEmpty(): ParserState {
    return new ParserState();
  }

  clone(): ParserState {
    const c = this.createEmpty();
    c.literals = [...this.literals];
    c.comments = [...this.comments];
    c.scopes = [...this.scopes];
    c.lineRegistry.items.push(...this.lineRegistry.items);
    return c;
  }
}
