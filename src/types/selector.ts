import { Token, TokenType } from '../lexer/token';
import {
  registerSelector,
  registerSelectorGroup
} from '../utils/selector-registry';
import { Keyword } from './keywords';
import { Operator } from './operators';

export enum SelectorType {
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
  PowerShorthand = 'PowerShorthand',
  ModuloShorthand = 'ModuloShorthand',
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
  Return = 'Return',
  If = 'If',
  While = 'While',
  For = 'For',
  Continue = 'Continue',
  Break = 'Break',
  Repeat = 'Repeat',
  Comment = 'Comment'
}

export class createSelectorOptions {
  type: TokenType;
  value?: string;
}

export interface Selector {
  (token: Token): boolean;
  data: {
    type: TokenType;
    value?: string;
  };
  selectorId: number;
  name: string;
}

export function createSelector(options: createSelectorOptions): Selector {
  const entry = registerSelector(options.type, options.value);
  const id = entry.selectorId;

  const selectorf = function (token: Token): boolean {
    return token != null && token.selectorId === id;
  } as Selector;

  Object.defineProperty(selectorf, 'name', {
    value:
      options.value !== undefined
        ? `selector_${TokenType[options.type]}_${options.value}`
        : `selector_${TokenType[options.type]}`,
    writable: false
  });

  selectorf.data = options;
  selectorf.selectorId = id;
  return selectorf;
}

export function getSelectorValue(value: Selector): string {
  return value.data.value;
}

export const Selectors: Record<SelectorType, Selector> = {
  EndOfLine: createSelector({
    type: TokenType.EOL,
    value: Operator.EndOfLine
  }),
  EndOfFile: createSelector({
    type: TokenType.EOF,
    value: Operator.EndOfFile
  }),
  LParenthesis: createSelector({
    type: TokenType.Punctuator,
    value: Operator.LParenthesis
  }),
  RParenthesis: createSelector({
    type: TokenType.Punctuator,
    value: Operator.RParenthesis
  }),
  CLBracket: createSelector({
    type: TokenType.Punctuator,
    value: Operator.CLBracket
  }),
  CRBracket: createSelector({
    type: TokenType.Punctuator,
    value: Operator.CRBracket
  }),
  SLBracket: createSelector({
    type: TokenType.Punctuator,
    value: Operator.SLBracket
  }),
  SRBracket: createSelector({
    type: TokenType.Punctuator,
    value: Operator.SRBracket
  }),
  Assign: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Assign
  }),
  AddShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.AddShorthand
  }),
  SubtractShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.SubtractShorthand
  }),
  MultiplyShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.MultiplyShorthand
  }),
  DivideShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.DivideShorthand
  }),
  PowerShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.PowerShorthand
  }),
  ModuloShorthand: createSelector({
    type: TokenType.Punctuator,
    value: Operator.ModuloShorthand
  }),
  Seperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  Function: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Function
  }),
  EndFunction: createSelector({
    type: TokenType.Keyword,
    value: Keyword.EndFunction
  }),
  EndWhile: createSelector({
    type: TokenType.Keyword,
    value: Keyword.EndWhile
  }),
  EndFor: createSelector({
    type: TokenType.Keyword,
    value: Keyword.EndFor
  }),
  EndIf: createSelector({
    type: TokenType.Keyword,
    value: Keyword.EndIf
  }),
  SliceSeperator: createSelector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  MapKeyValueSeperator: createSelector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  MapSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ListSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  CallSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ArgumentSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Comma
  }),
  ImportCodeSeperator: createSelector({
    type: TokenType.SliceOperator,
    value: Operator.SliceSeperator
  }),
  ElseIf: createSelector({
    type: TokenType.Keyword,
    value: Keyword.ElseIf
  }),
  Then: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Then
  }),
  Else: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Else
  }),
  In: createSelector({
    type: TokenType.Keyword,
    value: Keyword.In
  }),
  MemberSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Member
  }),
  NumberSeperator: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Member
  }),
  Reference: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Reference
  }),
  Isa: createSelector({
    type: TokenType.Keyword,
    value: Operator.Isa
  }),
  Or: createSelector({
    type: TokenType.Keyword,
    value: Operator.Or
  }),
  And: createSelector({
    type: TokenType.Keyword,
    value: Operator.And
  }),
  Minus: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Minus
  }),
  Plus: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Plus
  }),
  Times: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Asterik
  }),
  Power: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Power
  }),
  Divide: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Slash
  }),
  Mod: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Modulo
  }),
  Equal: createSelector({
    type: TokenType.Punctuator,
    value: Operator.Equal
  }),
  NotEqual: createSelector({
    type: TokenType.Punctuator,
    value: Operator.NotEqual
  }),
  Greater: createSelector({
    type: TokenType.Punctuator,
    value: Operator.GreaterThan
  }),
  GreaterEqual: createSelector({
    type: TokenType.Punctuator,
    value: Operator.GreaterThanOrEqual
  }),
  Lesser: createSelector({
    type: TokenType.Punctuator,
    value: Operator.LessThan
  }),
  LessEqual: createSelector({
    type: TokenType.Punctuator,
    value: Operator.LessThanOrEqual
  }),
  New: createSelector({
    type: TokenType.Keyword,
    value: Keyword.New
  }),
  Not: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Not
  }),
  Return: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Return
  }),
  If: createSelector({
    type: TokenType.Keyword,
    value: Keyword.If
  }),
  While: createSelector({
    type: TokenType.Keyword,
    value: Keyword.While
  }),
  For: createSelector({
    type: TokenType.Keyword,
    value: Keyword.For
  }),
  Continue: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Continue
  }),
  Break: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Break
  }),
  Repeat: createSelector({
    type: TokenType.Keyword,
    value: Keyword.Repeat
  }),
  Comment: createSelector({
    type: TokenType.Comment
  })
};

export interface SelectorGroup {
  (token: Token): boolean;
  selectors: Selector[];
  groupBit: number;
  name: string;
}

export function createSelectorGroup(
  name: string,
  selectors: Selector[]
): SelectorGroup {
  const entries = selectors.map((s) =>
    registerSelector(s.data.type, s.data.value)
  );
  const bit = registerSelectorGroup(entries);

  const groupf = function (token: Token): boolean {
    return token != null && (token.groupBits & bit) !== 0;
  } as SelectorGroup;

  Object.defineProperty(groupf, 'name', {
    value: `selector_group_${name}`,
    writable: false
  });

  groupf.selectors = selectors;
  groupf.groupBit = bit;
  return groupf;
}

export function getSelectorsFromGroup(group: SelectorGroup): Selector[] {
  return group.selectors;
}

export enum SelectorGroupType {
  BlockEndOfLine = 'BlockEndOfLine',
  AssignmentEndOfExpr = 'AssignmentEndOfExpr',
  AssignmentShorthand = 'AssignmentShorthand',
  AssignmentCommandArgs = 'AssignmentCommandArgs',
  ReturnStatementEnd = 'ReturnStatementEnd',
  FunctionDeclarationArgEnd = 'FunctionDeclarationArgEnd',
  ComparisonOperators = 'ComparisonOperators',
  MultiDivOperators = 'MultiDivOperators',
  CallArgsEnd = 'CallArgsEnd'
}

export const SelectorGroups: Record<SelectorGroupType, SelectorGroup> = {
  BlockEndOfLine: createSelectorGroup(SelectorGroupType.AssignmentEndOfExpr, [
    Selectors.EndOfLine,
    Selectors.Comment
  ]),
  AssignmentEndOfExpr: createSelectorGroup(
    SelectorGroupType.AssignmentEndOfExpr,
    [
      Selectors.EndOfFile,
      Selectors.EndOfLine,
      Selectors.Else,
      Selectors.Comment
    ]
  ),
  AssignmentShorthand: createSelectorGroup(
    SelectorGroupType.AssignmentShorthand,
    [
      Selectors.AddShorthand,
      Selectors.SubtractShorthand,
      Selectors.MultiplyShorthand,
      Selectors.DivideShorthand,
      Selectors.PowerShorthand,
      Selectors.ModuloShorthand
    ]
  ),
  AssignmentCommandArgs: createSelectorGroup(
    SelectorGroupType.AssignmentCommandArgs,
    [Selectors.ArgumentSeperator, Selectors.EndOfLine, Selectors.EndOfFile]
  ),
  ReturnStatementEnd: createSelectorGroup(
    SelectorGroupType.ReturnStatementEnd,
    [Selectors.EndOfLine, Selectors.Else, Selectors.Comment]
  ),
  FunctionDeclarationArgEnd: createSelectorGroup(
    SelectorGroupType.FunctionDeclarationArgEnd,
    [Selectors.RParenthesis, Selectors.EndOfFile, Selectors.EndOfLine]
  ),
  ComparisonOperators: createSelectorGroup(
    SelectorGroupType.ComparisonOperators,
    [
      Selectors.Equal,
      Selectors.NotEqual,
      Selectors.Greater,
      Selectors.GreaterEqual,
      Selectors.Lesser,
      Selectors.LessEqual
    ]
  ),
  MultiDivOperators: createSelectorGroup(SelectorGroupType.MultiDivOperators, [
    Selectors.Times,
    Selectors.Divide,
    Selectors.Mod
  ]),
  CallArgsEnd: createSelectorGroup(SelectorGroupType.CallArgsEnd, [
    Selectors.ArgumentSeperator,
    Selectors.RParenthesis
  ])
};
