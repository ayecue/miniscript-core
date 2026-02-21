import { ASTBase, ASTType } from './ast';
import { Comment } from '../types/comment';

import type Parser from '../parser';

export interface NoopConsumer {
  onComment(parser: Parser, comment: Comment, isStatement: boolean): void;
  onEmptyLine(parser: Parser): void;
}

export const PreserveConsumer: NoopConsumer = {
  onComment(parser, comment, isStatement) {
    if (isStatement) {
      parser.pendingLeadingComments.push(comment.value);
    } else if (parser.lastStatement) {
      if (!parser.lastStatement.trailingComments) {
        parser.lastStatement.trailingComments = [];
      }
      parser.lastStatement.trailingComments.push(comment.value);
    } else {
      parser.pendingLeadingComments.push(comment.value);
    }
  },
  onEmptyLine(parser) {
    const pendingBlock = parser.backpatches.peek();
    const emptyLine = new ASTBase(ASTType.NoopStatement, {
      startLine: parser.token.line,
      startChar: 0,
      endLine: parser.token.line,
      endChar: 0,
      rangeStart: parser.token.rangeStart,
      rangeEnd: parser.token.rangeStart,
      scope: parser.currentScope
    });
    pendingBlock.body.push(emptyLine);
  }
};
