import { SelectorGroups, Selectors } from '../../types/selector';
import { OpBuilder } from './base';
import { AtomOp } from '../../types/ops';
import type Parser from '../../parser';
import type { ASTBase, ASTListValue, ASTMapKeyString } from '../ast';

export class AtomOpBuilder extends OpBuilder<AtomOp> {
  override(selectorId: number, parse: AtomOp['parse']): this {
    const idx = this.ops.findIndex(op => op.selectorId === selectorId);
    if (idx !== -1) {
      this.ops[idx] = { ...this.ops[idx], parse };
    }
    return this;
  }
}

export function buildAtomOpIndex(ops: AtomOp[]): AtomOp[] {
  const index: AtomOp[] = [];
  for (const op of ops) {
    index[op.selectorId] = op;
  }
  return index;
}

export function parseMap(me: Parser): ASTBase {
  const scope = me.currentScope;
  const startToken = me.token;
  const fields: ASTMapKeyString[] = [];
  const mapConstructorExpr = me.astProvider.mapConstructorExpression({
    fields,
    startLine: startToken.line, startChar: startToken.startChar,
    endLine: 0, endChar: 0,
    rangeStart: startToken.rangeStart, rangeEnd: null,
    scope
  });

  me.next();

  if (Selectors.CRBracket(me.token)) {
    me.next();
  } else {
    me.consumeNoop();

    while (!Selectors.EndOfFile(me.token)) {
      if (Selectors.CRBracket(me.token)) {
        me.next();
        break;
      }

      const keyValueItem = me.astProvider.mapKeyString({
        key: null,
        value: null,
        startLine: me.token.line, startChar: me.token.startChar,
        endLine: 0, endChar: 0,
        rangeStart: me.token.rangeStart, rangeEnd: null,
        scope
      });
      keyValueItem.key = me.parseExpr(null);

      me.requireToken(Selectors.MapKeyValueSeparator, undefined, undefined, 'map literal');
      me.consumeNoop();

      keyValueItem.value = me.parseExpr(keyValueItem);
      keyValueItem.endLine = me.previousToken.endLine; keyValueItem.endChar = me.previousToken.endChar;
      keyValueItem.rangeEnd = me.previousToken.rangeEnd;
      fields.push(keyValueItem);

      const token = me.requireTokenOfAny(
        SelectorGroups.MapSeparator,
        startToken.line,
        startToken.startChar,
        'map literal'
      );

      if (Selectors.CRBracket(token)) break;

      me.consumeNoop();
    }
  }

  mapConstructorExpr.endLine = me.token.line; mapConstructorExpr.endChar = me.token.startChar;
  mapConstructorExpr.rangeEnd = me.token.rangeEnd;

  return mapConstructorExpr;
}

export function parseList(me: Parser): ASTBase {
  const scope = me.currentScope;
  const startToken = me.token;
  const fields: ASTListValue[] = [];
  const listConstructorExpr = me.astProvider.listConstructorExpression({
    fields,
    startLine: startToken.line, startChar: startToken.startChar,
    endLine: 0, endChar: 0,
    rangeStart: startToken.rangeStart, rangeEnd: null,
    scope
  });

  me.next();

  if (Selectors.SRBracket(me.token)) {
    me.next();
  } else {
    me.consumeNoop();

    while (!Selectors.EndOfFile(me.token)) {
      if (Selectors.SRBracket(me.token)) {
        me.next();
        break;
      }

      const listValue = me.astProvider.listValue({
        value: null,
        startLine: me.token.line, startChar: me.token.startChar,
        endLine: 0, endChar: 0,
        rangeStart: me.token.rangeStart, rangeEnd: null,
        scope
      });

      listValue.value = me.parseExpr(listValue);
      listValue.endLine = me.previousToken.endLine; listValue.endChar = me.previousToken.endChar;
      listValue.rangeEnd = me.previousToken.rangeEnd;
      fields.push(listValue);

      const token = me.requireTokenOfAny(
        SelectorGroups.ListSeparator,
        startToken.line,
        startToken.startChar,
        'list literal'
      );

      if (Selectors.SRBracket(token)) break;

      me.consumeNoop();
    }
  }

  listConstructorExpr.endLine = me.token.line; listConstructorExpr.endChar = me.token.startChar;
  listConstructorExpr.rangeEnd = me.token.rangeEnd;

  return listConstructorExpr;
}

export function parseQuantity(me: Parser): ASTBase {
  const startToken = me.token;

  me.next();
  me.consumeNoop();

  const val = me.parseExpr(null);

  me.requireToken(Selectors.RParenthesis, startToken.line, startToken.startChar, 'parenthesized expression');

  return me.astProvider.parenthesisExpression({
    expression: val,
    startLine: startToken.line, startChar: startToken.startChar,
    endLine: me.previousToken.endLine, endChar: me.previousToken.endChar,
    rangeStart: startToken.rangeStart, rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });
}

export function defaultAtomOpBuilder(): AtomOpBuilder {
  return new AtomOpBuilder()
    .add({
      match: (p) => Selectors.CLBracket(p.token),
      selectorId: Selectors.CLBracket.selectorId,
      parse: parseMap
    })
    .add({
      match: (p) => Selectors.SLBracket(p.token),
      selectorId: Selectors.SLBracket.selectorId,
      parse: parseList
    })
    .add({
      match: (p) => Selectors.LParenthesis(p.token),
      selectorId: Selectors.LParenthesis.selectorId,
      parse: parseQuantity
    });
}

export const defaultAtomOps: AtomOp[] = buildAtomOpIndex(
  defaultAtomOpBuilder().build()
);
