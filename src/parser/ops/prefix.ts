import { Operator } from '../../types/operators';
import { Precedence } from '../../types/precedence';
import { Selectors } from '../../types/selector';
import { ASTBooleanLiteral, ASTNumericLiteral } from '../ast';
import { OpBuilder } from './base';
import { PrefixOp, PrefixOpLevel } from '../../types/ops';

export class PrefixOpBuilder extends OpBuilder<PrefixOp> {
  override(selectorId: number, parse: PrefixOp['parse']): this {
    const idx = this.ops.findIndex(op => op.selectorId === selectorId);
    if (idx !== -1) {
      this.ops[idx] = { ...this.ops[idx], parse };
    }
    return this;
  }

  build(): PrefixOp[] {
    return this.ops.slice().sort((a, b) => b.threshold - a.threshold);
  }
}

export function groupPrefixOps(ops: PrefixOp[]): PrefixOpLevel | null {
  let head: PrefixOpLevel | null = null;
  let current: PrefixOpLevel | null = null;
  for (const op of ops) {
    if (!current || current.threshold !== op.threshold) {
      const level: PrefixOpLevel = {
        threshold: op.threshold,
        ops: [op],
        next: null
      };
      if (current) current.next = level;
      else head = level;
      current = level;
    } else {
      current.ops.push(op);
    }
  }
  return head;
}

export function buildPrefixOpIndex(head: PrefixOpLevel | null): PrefixOp[] {
  const index: PrefixOp[] = [];
  let level = head;
  while (level) {
    for (const op of level.ops) {
      if (!index[op.selectorId]) {
        index[op.selectorId] = op;
      }
    }
    level = level.next;
  }
  return index;
}

export function defaultPrefixOpBuilder(): PrefixOpBuilder {
  return new PrefixOpBuilder()
    .add({
      match: (p) => Selectors.Reference(p.token),
      selectorId: Selectors.Reference.selectorId,
      threshold: Precedence.AddressOf,
      parse: (p, startToken, _asLval, statementStart) => {
        p.next();
        p.consumeNoop();
        const val = p.parseExprPrecedence(
          Precedence.Power,
          true,
          statementStart
        );
        return p.astProvider.unaryExpression({
          operator: Operator.Reference,
          argument: val,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    })
    .add({
      match: (p) => Selectors.New(p.token),
      selectorId: Selectors.New.selectorId,
      threshold: Precedence.New,
      parse: (p, startToken) => {
        p.next();
        p.consumeNoop();
        const val = p.parseExprPrecedence(Precedence.New);
        return p.astProvider.unaryExpression({
          operator: Operator.New,
          argument: val,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    })
    .add({
      match: (p) => Selectors.Minus(p.token),
      selectorId: Selectors.Minus.selectorId,
      threshold: Precedence.UnaryMinus,
      parse: (p, startToken) => {
        p.next();
        p.consumeNoop();
        const val = p.parseExprPrecedence(Precedence.New);
        if (
          val instanceof ASTNumericLiteral ||
          val instanceof ASTBooleanLiteral
        ) {
          val.negated = true;
          return val;
        }
        return p.astProvider.unaryExpression({
          operator: Operator.Minus,
          argument: val,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    })
    .add({
      match: (p) => Selectors.Not(p.token),
      selectorId: Selectors.Not.selectorId,
      threshold: Precedence.Not,
      parse: (p, startToken) => {
        p.next();
        p.consumeNoop();
        const val = p.parseExprPrecedence(Precedence.Isa);
        return p.astProvider.unaryExpression({
          operator: Operator.Not,
          argument: val,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    });
}

export const defaultPrefixOps: PrefixOp[] = buildPrefixOpIndex(
  groupPrefixOps(defaultPrefixOpBuilder().build())
);
