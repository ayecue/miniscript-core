import type { ASTBase } from '../ast';
import { ASTIdentifierKind } from '../ast';
import { Operator } from '../../types/operators';
import { Precedence } from '../../types/precedence';
import { SelectorGroups, Selectors } from '../../types/selector';
import { OpBuilder } from './base';
import { InfixOp, InfixOpLevel } from '../../types/ops';
import type Parser from '../../parser';

export class InfixOpBuilder extends OpBuilder<InfixOp> {
  override(selectorId: number, parse: InfixOp['parse']): this {
    const idx = this.ops.findIndex(op => op.selectorId === selectorId);
    if (idx !== -1) {
      this.ops[idx] = { ...this.ops[idx], parse };
    }
    return this;
  }

  build(): InfixOp[] {
    return this.ops.slice().sort((a, b) => b.precedence - a.precedence);
  }
}

export function groupInfixOps(ops: InfixOp[]): InfixOpLevel | null {
  let head: InfixOpLevel | null = null;
  let current: InfixOpLevel | null = null;
  for (const op of ops) {
    if (!current || current.precedence !== op.precedence) {
      const level: InfixOpLevel = {
        precedence: op.precedence,
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

export function buildInfixOpIndex(head: InfixOpLevel | null): InfixOp[] {
  const index: InfixOp[] = [];
  let level = head;
  while (level) {
    for (const op of level.ops) {
      index[op.selectorId] = op;
    }
    level = level.next;
  }
  return index;
}

const multDivParse: InfixOp['parse'] = (p, left, startToken) => {
  const token = p.token;
  p.next();
  p.consumeNoop();
  const right = p.parseExprPrecedence(Precedence.MultDiv + 1);
  return p.astProvider.binaryExpression({
    operator: <Operator>token.value,
    left,
    right,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: p.previousToken.endLine,
    endChar: p.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: p.previousToken.rangeEnd,
    scope: p.currentScope
  });
};

const comparisonParse: InfixOp['parse'] = (p, left, startToken) => {
  const expressions: ASTBase[] = [left];
  const operators: string[] = [];

  do {
    const token = p.token;
    p.next();
    p.consumeNoop();
    const right = p.parseExprPrecedence(Precedence.Comparisons + 1);
    operators.push(token.value);
    expressions.push(right);
  } while (SelectorGroups.ComparisonOperators(p.token));

  if (operators.length === 1) {
    return p.astProvider.binaryExpression({
      operator: operators[0],
      left: expressions[0],
      right: expressions[1],
      startLine: startToken.line,
      startChar: startToken.startChar,
      endLine: p.previousToken.endLine,
      endChar: p.previousToken.endChar,
      rangeStart: startToken.rangeStart,
      rangeEnd: p.previousToken.rangeEnd,
      scope: p.currentScope
    });
  }

  return p.astProvider.comparisonGroupExpression({
    operators,
    expressions,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: p.previousToken.endLine,
    endChar: p.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: p.previousToken.rangeEnd,
    scope: p.currentScope
  });
};

export function parseCallArgs(me: Parser): ASTBase[] {
  const expressions: ASTBase[] = [];

  if (Selectors.LParenthesis(me.token)) {
    me.next();

    if (Selectors.RParenthesis(me.token)) {
      me.next();
    } else {
      while (!Selectors.EndOfFile(me.token)) {
        me.consumeNoop();
        const arg = me.parseExpr(null);
        expressions.push(arg);
        if (
          Selectors.RParenthesis(me.requireTokenOfAny(
            SelectorGroups.CallArgsEnd,
            arg.startLine,
            arg.startChar
          ))
        )
          break;
      }
    }
  }

  return expressions;
}

export function defaultInfixOpBuilder(): InfixOpBuilder {
  return new InfixOpBuilder()
    .add({
      match: (p) => Selectors.MemberSeparator(p.token),
      selectorId: Selectors.MemberSeparator.selectorId,
      precedence: Precedence.Call,
      parse: (p, left, startToken) => {
        p.next();
        p.consumeNoop();
        const identifier = p.parseIdentifier(ASTIdentifierKind.Property);
        const memberExpr = p.astProvider.memberExpression({
          base: left,
          indexer: Operator.Member,
          identifier,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
        p.currentScope.namespaces.push(memberExpr);
        return memberExpr;
      }
    })
    .add({
      match: (p) => Selectors.SLBracket(p.token) && !p.token.afterSpace,
      selectorId: Selectors.SLBracket.selectorId,
      precedence: Precedence.Call,
      parse: (p, left, startToken, _asLval, statementStart) => {
        p.next();
        p.consumeNoop();

        if (Selectors.SliceSeparator(p.token)) {
          const sliceLeft = p.astProvider.emptyExpression({
            startLine: p.previousToken.line,
            startChar: p.previousToken.startChar,
            endLine: p.previousToken.endLine,
            endChar: p.previousToken.endChar,
            rangeStart: p.previousToken.rangeStart,
            rangeEnd: p.previousToken.rangeEnd,
            scope: p.currentScope
          });

          p.next();
          p.consumeNoop();

          const sliceRight = Selectors.SRBracket(p.token)
            ? p.astProvider.emptyExpression({
                startLine: p.previousToken.line,
                startChar: p.previousToken.startChar,
                endLine: p.previousToken.endLine,
                endChar: p.previousToken.endChar,
                rangeStart: p.previousToken.rangeStart,
                rangeEnd: p.previousToken.rangeEnd,
                scope: p.currentScope
              })
            : p.parseExpr(null);

          const result = p.astProvider.sliceExpression({
            base: left,
            left: sliceLeft,
            right: sliceRight,
            startLine: startToken.line,
            startChar: startToken.startChar,
            endLine: p.token.endLine,
            endChar: p.token.endChar,
            rangeStart: startToken.rangeStart,
            rangeEnd: p.token.rangeEnd,
            scope: p.currentScope
          });

          p.requireToken(
            Selectors.SRBracket,
            startToken.line,
            startToken.startChar
          );
          return result;
        } else {
          const index = p.parseExpr(null);

          if (Selectors.SliceSeparator(p.token)) {
            p.next();
            p.consumeNoop();

            const sliceRight = Selectors.SRBracket(p.token)
              ? p.astProvider.emptyExpression({
                  startLine: p.previousToken.line,
                  startChar: p.previousToken.startChar,
                  endLine: p.previousToken.endLine,
                  endChar: p.previousToken.endChar,
                  rangeStart: p.previousToken.rangeStart,
                  rangeEnd: p.previousToken.rangeEnd,
                  scope: p.currentScope
                })
              : p.parseExpr(null);

            const result = p.astProvider.sliceExpression({
              base: left,
              left: index,
              right: sliceRight,
              startLine: startToken.line,
              startChar: startToken.startChar,
              endLine: p.token.endLine,
              endChar: p.token.endChar,
              rangeStart: startToken.rangeStart,
              rangeEnd: p.token.rangeEnd,
              scope: p.currentScope
            });

            p.requireToken(
              Selectors.SRBracket,
              startToken.line,
              startToken.startChar
            );
            return result;
          } else {
            const result = p.astProvider.indexExpression({
              base: left,
              index,
              isStatementStart: statementStart,
              startLine: startToken.line,
              startChar: startToken.startChar,
              endLine: p.token.endLine,
              endChar: p.token.endChar,
              rangeStart: startToken.rangeStart,
              rangeEnd: p.token.rangeEnd,
              scope: p.currentScope
            });

            p.requireToken(
              Selectors.SRBracket,
              startToken.line,
              startToken.startChar
            );
            return result;
          }
        }
      }
    })
    .add({
      match: (p, asLval) =>
        Selectors.LParenthesis(p.token) && (!asLval || !p.token.afterSpace),
      selectorId: Selectors.LParenthesis.selectorId,
      precedence: Precedence.Call,
      parse: (p, left, startToken) => {
        const expressions = parseCallArgs(p);
        return p.astProvider.callExpression({
          base: left,
          arguments: expressions,
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
      match: (p) => Selectors.Power(p.token),
      selectorId: Selectors.Power.selectorId,
      precedence: Precedence.Power,
      parse: (p, left, startToken) => {
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.Power + 1);
        return p.astProvider.binaryExpression({
          operator: Operator.Power,
          left,
          right,
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
      match: (p) => Selectors.Times(p.token),
      selectorId: Selectors.Times.selectorId,
      precedence: Precedence.MultDiv,
      parse: multDivParse
    })
    .add({
      match: (p) => Selectors.Divide(p.token),
      selectorId: Selectors.Divide.selectorId,
      precedence: Precedence.MultDiv,
      parse: multDivParse
    })
    .add({
      match: (p) => Selectors.Mod(p.token),
      selectorId: Selectors.Mod.selectorId,
      precedence: Precedence.MultDiv,
      parse: multDivParse
    })
    .add({
      match: (p) => Selectors.Plus(p.token),
      selectorId: Selectors.Plus.selectorId,
      precedence: Precedence.AddSub,
      parse: (p, left, startToken) => {
        const token = p.token;
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.AddSub + 1);
        return p.astProvider.binaryExpression({
          operator: <Operator>token.value,
          left,
          right,
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
      match: (p, _asLval, statementStart) =>
        Selectors.Minus(p.token) &&
        (!statementStart || !p.token.afterSpace || p.lexer.isAtWhitespace()),
      selectorId: Selectors.Minus.selectorId,
      precedence: Precedence.AddSub,
      parse: (p, left, startToken) => {
        const token = p.token;
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.AddSub + 1);
        return p.astProvider.binaryExpression({
          operator: <Operator>token.value,
          left,
          right,
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
      match: (p) => Selectors.Equal(p.token),
      selectorId: Selectors.Equal.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.NotEqual(p.token),
      selectorId: Selectors.NotEqual.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.Greater(p.token),
      selectorId: Selectors.Greater.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.GreaterEqual(p.token),
      selectorId: Selectors.GreaterEqual.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.Lesser(p.token),
      selectorId: Selectors.Lesser.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.LessEqual(p.token),
      selectorId: Selectors.LessEqual.selectorId,
      precedence: Precedence.Comparisons,
      parse: comparisonParse
    })
    .add({
      match: (p) => Selectors.Isa(p.token),
      selectorId: Selectors.Isa.selectorId,
      precedence: Precedence.Isa,
      parse: (p, left, startToken) => {
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.Isa + 1);
        return p.astProvider.isaExpression({
          operator: Operator.Isa,
          left,
          right,
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
      match: (p) => Selectors.And(p.token),
      selectorId: Selectors.And.selectorId,
      precedence: Precedence.And,
      parse: (p, left, startToken) => {
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.And + 1);
        return p.astProvider.logicalExpression({
          operator: Operator.And,
          left,
          right,
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
      match: (p) => Selectors.Or(p.token),
      selectorId: Selectors.Or.selectorId,
      precedence: Precedence.Or,
      parse: (p, left, startToken) => {
        p.next();
        p.consumeNoop();
        const right = p.parseExprPrecedence(Precedence.Or + 1);
        return p.astProvider.logicalExpression({
          operator: Operator.Or,
          left,
          right,
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

export const defaultInfixOps: InfixOp[] = buildInfixOpIndex(
  groupInfixOps(defaultInfixOpBuilder().build())
);
