import { ASTBaseBlockWithScope, ASTLiteral } from './ast';
import { LineRegistry } from './line-registry';
import { Comment } from '../types/comment';

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
