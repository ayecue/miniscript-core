import { Token, TokenType } from '../lexer/token';
import { Keyword } from './keywords';
import { Operator } from './operators';

export class SelectorOptions {
  type: TokenType;
  value: string;
}

export class Selector {
  type: TokenType;
  value: string;

  constructor({ type, value }: SelectorOptions) {
    this.type = type;
    this.value = value;
  }

  is(token: Token) {
    if (token == null) return false;
    return this.type === token.type && this.value === token.value;
  }
}

export class SelectorOfType extends Selector {
  constructor({ type }: Omit<SelectorOptions, 'value'>) {
    super({ type, value: undefined });
  }

  is(token: Token) {
    if (token == null) return false;
    return this.type === token.type;
  }
}

export class SelectorOfValue extends Selector {
  constructor({ value }: Omit<SelectorOptions, 'type'>) {
    super({ type: null, value });
  }

  is(token: Token) {
    if (token == null) return false;
    return this.value === token.value;
  }
}

export enum SelectorTypes {
  EndOfLine = 'EndOfLine',
  EndOfFile = 'EndOfFile',
  LParenthesis = 'LParenthesis',
  RParenthesis = 'RParenthesis',
  CLBracket = 'CLBracket',
  CRBracket = 'CRBracket',
  SLBracket = 'SLBracket',
  SRBracket = 'SRBracket',
  Assign = 'Assign',
  AddShorthand = 'AddShorthand',
  SubtractShorthand = 'SubtractShorthand',
  MultiplyShorthand = 'MultiplyShorthand',
  DivideShorthand = 'DivideShorthand',
  Seperator = 'Seperator',
  Function = 'Function',
  EndFunction = 'EndFunction',
  EndWhile = 'EndWhile',
  EndFor = 'EndFor',
  EndIf = 'EndIf',
  SliceSeperator = 'SliceSeperator',
  MapKeyValueSeperator = 'MapKeyValueSeperator',
  MapSeperator = 'MapSeperator',
  ListSeperator = 'ListSeperator',
  CallSeperator = 'CallSeperator',
  ArgumentSeperator = 'ArgumentSeperator',
  ImportCodeSeperator = 'ImportCodeSeperator',
  ElseIf = 'ElseIf',
  Then = 'Then',
  Else = 'Else',
  In = 'In',
  MemberSeperator = 'MemberSeperator',
  NumberSeperator = 'NumberSeperator',
  Reference = 'Reference',
  Isa = 'Isa',
  Or = 'Or',
  And = 'And',
  Minus = 'Minus',
  Plus = 'Plus',
  Times = 'Times',
  Divide = 'Divide',
  Power = 'Power',
  Mod = 'Mod',
  Equal = 'Equal',
  NotEqual = 'NotEqual',
  Greater = 'Greater',
  GreaterEqual = 'GreaterEqual',
  Lesser = 'Lesser',
  LessEqual = 'LessEqual',
  New = 'New',
  Not = 'Not',
  Comment = 'Comment',
  LeftShift = 'LeftShift',
  RightShift = 'RightShift',
  UnsignedRightShift = 'UnsignedRightShift',
  BitwiseOr = 'BitwiseOr',
  BitwiseAnd = 'BitwiseAnd'
}

export const Selectors: Record<SelectorTypes, Selector> = {
  EndOfLine: new Selector({
    type: TokenType.EOL,
    value: Operator.EndOfLine
  }),
  EndOfFile: new Selector({
    type: TokenType.EOF,
    value: Operator.EndOfFile
  }),
  LParenthesis: new Selector({
    type: TokenType.Punctuator,
    value: Operator.LParenthesis
  }),
  RParenthesis: new Selector({
    type: TokenType.Punctuator,
    value: Operator.RParenthesis
  }),
  CLBracket: new Selector({
    type: TokenType.Punctuator,
    value: Operator.CLBracket
  }),
  CRBracket: new Selector({
    type: TokenType.Punctuator,
    value: Operator.CRBracket
  }),
  SLBracket: new Selector({
    type: TokenType.Punctuator,
    value: Operator.SLBracket
  }),
  SRBracket: new Selector({
    type: TokenType.Punctuator,
    value: Operator.SRBracket
  }),
  Assign: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Assign
  }),
  AddShorthand: new Selector({
    type: TokenType.Punctuator,
    value: Operator.AddShorthand
  }),
  SubtractShorthand: new Selector({
    type: TokenType.Punctuator,
    value: Operator.SubtractShorthand
  }),
  MultiplyShorthand: new Selector({
    type: TokenType.Punctuator,
    value: Operator.MultiplyShorthand
  }),
  DivideShorthand: new Selector({
    type: TokenType.Punctuator,
    value: Operator.DivideShorthand
  }),
  Seperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  Function: new Selector({
    type: TokenType.Keyword,
    value: Keyword.Function
  }),
  EndFunction: new Selector({
    type: TokenType.Keyword,
    value: Keyword.EndFunction
  }),
  EndWhile: new Selector({
    type: TokenType.Keyword,
    value: Keyword.EndWhile
  }),
  EndFor: new Selector({
    type: TokenType.Keyword,
    value: Keyword.EndFor
  }),
  EndIf: new Selector({
    type: TokenType.Keyword,
    value: Keyword.EndIf
  }),
  SliceSeperator: new Selector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  MapKeyValueSeperator: new Selector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  MapSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ListSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  CallSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ArgumentSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ImportCodeSeperator: new Selector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  ElseIf: new Selector({
    type: TokenType.Keyword,
    value: Keyword.ElseIf
  }),
  Then: new Selector({
    type: TokenType.Keyword,
    value: Keyword.Then
  }),
  Else: new Selector({
    type: TokenType.Keyword,
    value: Keyword.Else
  }),
  In: new Selector({
    type: TokenType.Keyword,
    value: Keyword.In
  }),
  MemberSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Member
  }),
  NumberSeperator: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Member
  }),
  Reference: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Reference
  }),
  Isa: new Selector({
    type: TokenType.Keyword,
    value: Operator.Isa
  }),
  Or: new Selector({
    type: TokenType.Keyword,
    value: Operator.Or
  }),
  And: new Selector({
    type: TokenType.Keyword,
    value: Operator.And
  }),
  Minus: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Minus
  }),
  Plus: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Plus
  }),
  Times: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Asterik
  }),
  Power: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Power
  }),
  Divide: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Slash
  }),
  Mod: new Selector({
    type: TokenType.Punctuator,
    value: Operator.PercentSign
  }),
  Equal: new Selector({
    type: TokenType.Punctuator,
    value: Operator.Equal
  }),
  NotEqual: new Selector({
    type: TokenType.Punctuator,
    value: Operator.NotEqual
  }),
  Greater: new Selector({
    type: TokenType.Punctuator,
    value: Operator.GreaterThan
  }),
  GreaterEqual: new Selector({
    type: TokenType.Punctuator,
    value: Operator.GreaterThanOrEqual
  }),
  Lesser: new Selector({
    type: TokenType.Punctuator,
    value: Operator.LessThan
  }),
  LessEqual: new Selector({
    type: TokenType.Punctuator,
    value: Operator.LessThanOrEqual
  }),
  New: new Selector({
    type: TokenType.Keyword,
    value: Keyword.New
  }),
  Not: new Selector({
    type: TokenType.Keyword,
    value: Keyword.Not
  }),
  Comment: new SelectorOfType({
    type: TokenType.Comment
  }),
  LeftShift: new Selector({
    type: TokenType.Punctuator,
    value: Operator.LeftShift
  }),
  RightShift: new Selector({
    type: TokenType.Punctuator,
    value: Operator.RightShift
  }),
  UnsignedRightShift: new Selector({
    type: TokenType.Punctuator,
    value: Operator.UnsignedRightShift
  }),
  BitwiseOr: new Selector({
    type: TokenType.Punctuator,
    value: Operator.BitwiseOr
  }),
  BitwiseAnd: new Selector({
    type: TokenType.Punctuator,
    value: Operator.BitwiseAnd
  })
};
