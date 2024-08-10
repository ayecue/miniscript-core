import { TokenType } from '../lexer/token';
import {
  ASTAssignmentStatement,
  ASTAssignmentStatementOptions
} from './ast/assignment';
import {
  ASTBase,
  ASTBaseBlockOptions,
  ASTBaseOptions,
  ASTComment,
  ASTCommentOptions,
  ASTType
} from './ast/base';
import { ASTBinaryExpression, ASTBinaryExpressionOptions } from './ast/binary';
import {
  ASTCallExpression,
  ASTCallExpressionOptions,
  ASTCallStatement,
  ASTCallStatementOptions
} from './ast/call';
import { ASTChunk, ASTChunkOptions } from './ast/chunk';
import {
  ASTComparisonGroupExpression,
  ASTComparisonGroupExpressionOptions
} from './ast/comparison-group';
import {
  ASTForGenericStatement,
  ASTForGenericStatementOptions
} from './ast/for';
import {
  ASTFunctionStatement,
  ASTFunctionStatementOptions
} from './ast/function';
import {
  ASTIdentifier,
  ASTIdentifierOptions,
  ASTIndexExpression,
  ASTIndexExpressionOptions,
  ASTMemberExpression,
  ASTMemberExpressionOptions
} from './ast/identifier';
import {
  ASTElseClause,
  ASTIfClause,
  ASTIfClauseOptions,
  ASTIfStatement,
  ASTIfStatementOptions
} from './ast/if';
import { ASTIsaExpression, ASTIsaExpressionOptions } from './ast/isa';
import {
  ASTListConstructorExpression,
  ASTListConstructorExpressionOptions,
  ASTListValue,
  ASTListValueOptions
} from './ast/list';
import {
  ASTBooleanLiteral,
  ASTLiteralOptions,
  ASTNilLiteral,
  ASTNumericLiteral,
  ASTStringLiteral
} from './ast/literal';
import {
  ASTLogicalExpression,
  ASTLogicalExpressionOptions
} from './ast/logical';
import {
  ASTMapConstructorExpression,
  ASTMapConstructorExpressionOptions,
  ASTMapKeyString,
  ASTMapKeyStringOptions
} from './ast/map';
import {
  ASTParenthesisExpression,
  ASTParenthesisExpressionOptions
} from './ast/parenthesis';
import { ASTReturnStatement, ASTReturnStatementOptions } from './ast/return';
import { ASTSliceExpression, ASTSliceExpressionOptions } from './ast/slice';
import { ASTUnaryExpression, ASTUnaryExpressionOptions } from './ast/unary';
import { ASTWhileStatement, ASTWhileStatementOptions } from './ast/while';

export class ASTProvider {
  breakStatement(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.BreakStatement, options);
  }

  continueStatement(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.ContinueStatement, options);
  }

  returnStatement(options: ASTReturnStatementOptions): ASTReturnStatement {
    return new ASTReturnStatement(options);
  }

  ifShortcutStatement(options: ASTIfStatementOptions): ASTIfStatement {
    return new ASTIfStatement(ASTType.IfShortcutStatement, options);
  }

  ifShortcutClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.IfShortcutClause, options);
  }

  elseifShortcutClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.ElseifShortcutClause, options);
  }

  elseShortcutClause(options: ASTBaseBlockOptions): ASTElseClause {
    return new ASTElseClause(ASTType.ElseShortcutClause, options);
  }

  ifStatement(options: ASTIfStatementOptions): ASTIfStatement {
    return new ASTIfStatement(ASTType.IfStatement, options);
  }

  ifClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.IfClause, options);
  }

  elseifClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.ElseifClause, options);
  }

  elseClause(options: ASTBaseBlockOptions): ASTElseClause {
    return new ASTElseClause(ASTType.ElseClause, options);
  }

  whileStatement(options: ASTWhileStatementOptions): ASTWhileStatement {
    return new ASTWhileStatement(options);
  }

  assignmentStatement(
    options: ASTAssignmentStatementOptions
  ): ASTAssignmentStatement {
    return new ASTAssignmentStatement(options);
  }

  callStatement(options: ASTCallStatementOptions): ASTCallStatement {
    return new ASTCallStatement(options);
  }

  functionStatement(
    options: ASTFunctionStatementOptions
  ): ASTFunctionStatement {
    return new ASTFunctionStatement(options);
  }

  forGenericStatement(
    options: ASTForGenericStatementOptions
  ): ASTForGenericStatement {
    return new ASTForGenericStatement(options);
  }

  chunk(options: ASTChunkOptions): ASTChunk {
    return new ASTChunk(options);
  }

  identifier(options: ASTIdentifierOptions): ASTIdentifier {
    return new ASTIdentifier(options);
  }

  literal(
    type:
      | TokenType.StringLiteral
      | TokenType.NumericLiteral
      | TokenType.BooleanLiteral
      | TokenType.NilLiteral,
    options: ASTLiteralOptions<any>
  ): ASTStringLiteral | ASTNilLiteral | ASTNumericLiteral | ASTBooleanLiteral {
    switch (type) {
      case TokenType.StringLiteral:
        return new ASTStringLiteral(options);
      case TokenType.NumericLiteral:
        return new ASTNumericLiteral(options);
      case TokenType.BooleanLiteral:
        return new ASTBooleanLiteral(options);
      case TokenType.NilLiteral:
        return new ASTNilLiteral(options);
    }
  }

  memberExpression(options: ASTMemberExpressionOptions): ASTMemberExpression {
    return new ASTMemberExpression(options);
  }

  callExpression(options: ASTCallExpressionOptions): ASTCallExpression {
    return new ASTCallExpression(options);
  }

  comment(options: ASTCommentOptions): ASTComment {
    return new ASTComment(options);
  }

  unaryExpression(options: ASTUnaryExpressionOptions): ASTUnaryExpression {
    return new ASTUnaryExpression(options);
  }

  mapKeyString(options: ASTMapKeyStringOptions): ASTMapKeyString {
    return new ASTMapKeyString(options);
  }

  mapConstructorExpression(
    options: ASTMapConstructorExpressionOptions
  ): ASTMapConstructorExpression {
    return new ASTMapConstructorExpression(options);
  }

  listValue(options: ASTListValueOptions): ASTListValue {
    return new ASTListValue(options);
  }

  listConstructorExpression(
    options: ASTListConstructorExpressionOptions
  ): ASTListConstructorExpression {
    return new ASTListConstructorExpression(options);
  }

  unknown(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.Unknown, options);
  }

  emptyExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.EmptyExpression, options);
  }

  invalidCodeExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.InvalidCodeExpression, options);
  }

  indexExpression(options: ASTIndexExpressionOptions): ASTIndexExpression {
    return new ASTIndexExpression(options);
  }

  logicalExpression(
    options: ASTLogicalExpressionOptions
  ): ASTLogicalExpression {
    return new ASTLogicalExpression(options);
  }

  isaExpression(options: ASTIsaExpressionOptions): ASTLogicalExpression {
    return new ASTIsaExpression(options);
  }

  binaryExpression(options: ASTBinaryExpressionOptions): ASTBinaryExpression {
    return new ASTBinaryExpression(options);
  }

  sliceExpression(options: ASTSliceExpressionOptions): ASTSliceExpression {
    return new ASTSliceExpression(options);
  }

  parenthesisExpression(
    options: ASTParenthesisExpressionOptions
  ): ASTParenthesisExpression {
    return new ASTParenthesisExpression(options);
  }

  comparisonGroupExpression(options: ASTComparisonGroupExpressionOptions) {
    return new ASTComparisonGroupExpression(options);
  }
}

export {
  ASTAssignmentStatement,
  ASTAssignmentStatementOptions
} from './ast/assignment';
export {
  ASTBase,
  ASTBaseBlock,
  ASTBaseBlockOptions,
  ASTBaseBlockWithScope,
  ASTBaseBlockWithScopeOptions,
  ASTBaseOptions,
  ASTComment,
  ASTCommentOptions,
  ASTType
} from './ast/base';
export { ASTBinaryExpression, ASTBinaryExpressionOptions } from './ast/binary';
export {
  ASTCallExpression,
  ASTCallExpressionOptions,
  ASTCallStatement,
  ASTCallStatementOptions
} from './ast/call';
export { ASTChunk, ASTChunkOptions } from './ast/chunk';
export {
  ASTComparisonGroupExpression,
  ASTComparisonGroupExpressionOptions
} from './ast/comparison-group';
export {
  ASTForGenericStatement,
  ASTForGenericStatementOptions
} from './ast/for';
export {
  ASTFunctionStatement,
  ASTFunctionStatementOptions
} from './ast/function';
export {
  ASTIdentifier,
  ASTIdentifierOptions,
  ASTIndexExpression,
  ASTIndexExpressionOptions,
  ASTMemberExpression,
  ASTMemberExpressionOptions
} from './ast/identifier';
export {
  ASTClause,
  ASTElseClause,
  ASTIfClause,
  ASTIfClauseOptions,
  ASTIfStatement,
  ASTIfStatementOptions
} from './ast/if';
export { ASTIsaExpression, ASTIsaExpressionOptions } from './ast/isa';
export {
  ASTListConstructorExpression,
  ASTListConstructorExpressionOptions,
  ASTListValue,
  ASTListValueOptions
} from './ast/list';
export {
  ASTBooleanLiteral,
  ASTLiteral,
  ASTLiteralOptions,
  ASTNilLiteral,
  ASTNumericLiteral,
  ASTStringLiteral
} from './ast/literal';
export {
  ASTLogicalExpression,
  ASTLogicalExpressionOptions
} from './ast/logical';
export {
  ASTMapConstructorExpression,
  ASTMapConstructorExpressionOptions,
  ASTMapKeyString,
  ASTMapKeyStringOptions
} from './ast/map';
export {
  ASTParenthesisExpression,
  ASTParenthesisExpressionOptions
} from './ast/parenthesis';
export { ASTReturnStatement, ASTReturnStatementOptions } from './ast/return';
export { ASTSliceExpression, ASTSliceExpressionOptions } from './ast/slice';
export { ASTUnaryExpression, ASTUnaryExpressionOptions } from './ast/unary';
export { ASTWhileStatement, ASTWhileStatementOptions } from './ast/while';
