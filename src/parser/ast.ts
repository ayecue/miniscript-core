import { TokenType } from '../lexer/token';
import {
  ASTBreakStatement,
  ASTBreakStatementOptions,
  ASTContinueStatement,
  ASTContinueStatementOptions
} from './ast';
import {
  ASTAssignmentStatement,
  ASTAssignmentStatementOptions
} from './ast/assignment';
import {
  ASTBase,
  ASTBaseBlockOptions,
  ASTBaseOptions,
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
  returnStatement(options: ASTReturnStatementOptions): ASTReturnStatement {
    return new ASTReturnStatement({ argument: options.argument, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  ifShortcutStatement(options: ASTIfStatementOptions): ASTIfStatement {
    return new ASTIfStatement(ASTType.IfShortcutStatement, { clauses: options.clauses, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  ifShortcutClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.IfShortcutClause, { condition: options.condition, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  elseifShortcutClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.ElseifShortcutClause, { condition: options.condition, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  elseShortcutClause(options: ASTBaseBlockOptions): ASTElseClause {
    return new ASTElseClause(ASTType.ElseShortcutClause, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  ifStatement(options: ASTIfStatementOptions): ASTIfStatement {
    return new ASTIfStatement(ASTType.IfStatement, { clauses: options.clauses, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  ifClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.IfClause, { condition: options.condition, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  elseifClause(options: ASTIfClauseOptions): ASTIfClause {
    return new ASTIfClause(ASTType.ElseifClause, { condition: options.condition, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  elseClause(options: ASTBaseBlockOptions): ASTElseClause {
    return new ASTElseClause(ASTType.ElseClause, { body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  whileStatement(options: ASTWhileStatementOptions): ASTWhileStatement {
    return new ASTWhileStatement({ condition: options.condition, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  assignmentStatement(
    options: ASTAssignmentStatementOptions
  ): ASTAssignmentStatement {
    return new ASTAssignmentStatement({ variable: options.variable, init: options.init, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  callStatement(options: ASTCallStatementOptions): ASTCallStatement {
    return new ASTCallStatement({ expression: options.expression, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  functionStatement(
    options: ASTFunctionStatementOptions
  ): ASTFunctionStatement {
    return new ASTFunctionStatement({ parameters: options.parameters, assignment: options.assignment, definitions: options.definitions, returns: options.returns, namespaces: options.namespaces, parent: options.parent, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  forGenericStatement(
    options: ASTForGenericStatementOptions
  ): ASTForGenericStatement {
    return new ASTForGenericStatement({ variable: options.variable, iterator: options.iterator, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  chunk(options: ASTChunkOptions): ASTChunk {
    return new ASTChunk({ literals: options.literals, comments: options.comments, scopes: options.scopes, registry: options.registry, definitions: options.definitions, returns: options.returns, namespaces: options.namespaces, parent: options.parent, body: options.body, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  identifier(options: ASTIdentifierOptions): ASTIdentifier {
    return new ASTIdentifier({ name: options.name, kind: options.kind, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
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
        return new ASTStringLiteral({ value: options.value, raw: options.raw, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
      case TokenType.NumericLiteral:
        return new ASTNumericLiteral({ value: options.value, raw: options.raw, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
      case TokenType.BooleanLiteral:
        return new ASTBooleanLiteral({ value: options.value, raw: options.raw, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
      case TokenType.NilLiteral:
        return new ASTNilLiteral({ value: options.value, raw: options.raw, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
    }
  }

  memberExpression(options: ASTMemberExpressionOptions): ASTMemberExpression {
    return new ASTMemberExpression({ indexer: options.indexer, identifier: options.identifier, base: options.base, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  callExpression(options: ASTCallExpressionOptions): ASTCallExpression {
    return new ASTCallExpression({ base: options.base, arguments: options.arguments, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  unaryExpression(options: ASTUnaryExpressionOptions): ASTUnaryExpression {
    return new ASTUnaryExpression({ argument: options.argument, operator: options.operator, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  mapKeyString(options: ASTMapKeyStringOptions): ASTMapKeyString {
    return new ASTMapKeyString({ key: options.key, value: options.value, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  mapConstructorExpression(
    options: ASTMapConstructorExpressionOptions
  ): ASTMapConstructorExpression {
    return new ASTMapConstructorExpression({ fields: options.fields, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  listValue(options: ASTListValueOptions): ASTListValue {
    return new ASTListValue({ value: options.value, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  listConstructorExpression(
    options: ASTListConstructorExpressionOptions
  ): ASTListConstructorExpression {
    return new ASTListConstructorExpression({ fields: options.fields, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  unknown(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.Unknown, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  emptyExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.EmptyExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  invalidCodeExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.InvalidCodeExpression, { startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  indexExpression(options: ASTIndexExpressionOptions): ASTIndexExpression {
    return new ASTIndexExpression({ base: options.base, index: options.index, isStatementStart: options.isStatementStart, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  logicalExpression(
    options: ASTLogicalExpressionOptions
  ): ASTLogicalExpression {
    return new ASTLogicalExpression({ operator: options.operator, left: options.left, right: options.right, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  isaExpression(options: ASTIsaExpressionOptions): ASTLogicalExpression {
    return new ASTIsaExpression({ operator: options.operator, left: options.left, right: options.right, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  binaryExpression(options: ASTBinaryExpressionOptions): ASTBinaryExpression {
    return new ASTBinaryExpression({ operator: options.operator, left: options.left, right: options.right, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  sliceExpression(options: ASTSliceExpressionOptions): ASTSliceExpression {
    return new ASTSliceExpression({ base: options.base, left: options.left, right: options.right, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  parenthesisExpression(
    options: ASTParenthesisExpressionOptions
  ): ASTParenthesisExpression {
    return new ASTParenthesisExpression({ expression: options.expression, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  comparisonGroupExpression(options: ASTComparisonGroupExpressionOptions) {
    return new ASTComparisonGroupExpression({ operators: options.operators, expressions: options.expressions, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  breakStatement(options: ASTBreakStatementOptions) {
    return new ASTBreakStatement({ iterator: options.iterator, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
  }

  continueStatement(options: ASTContinueStatementOptions) {
    return new ASTContinueStatement({ iterator: options.iterator, startLine: options.startLine, startChar: options.startChar, endLine: options.endLine, endChar: options.endChar, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, scope: options.scope });
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
  ASTScopeDefinition,
  ASTScopeNamespace,
  ASTType
} from './ast/base';
export { ASTBinaryExpression, ASTBinaryExpressionOptions } from './ast/binary';
export { ASTBreakStatement, ASTBreakStatementOptions } from './ast/break';
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
  ASTContinueStatement,
  ASTContinueStatementOptions
} from './ast/continue';
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
  ASTIdentifierKind,
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
