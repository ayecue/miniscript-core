import { Token, TokenType } from '../lexer/token';
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
  name: string;
}

export function createSelector(options: createSelectorOptions): Selector {
  let selectorf: Selector;
  if (options.value === undefined) {
    selectorf = new Function(
      'token',
      `if (token == null) return false;return token.type === "${options.type}";`
    ) as Selector;
    Object.defineProperty(selectorf, 'name', {
      value: `selector_${options.type}`,
      writable: false
    });
  } else {
    selectorf = new Function(
      'token',
      `if (token == null) return false;return token.value === "${options.value}" && token.type === "${options.type}";`
    ) as Selector;
    Object.defineProperty(selectorf, 'name', {
      value: `selector_${options.type}_${options.value}`,
      writable: false
    });
  }
  selectorf.data = options;
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
  Comment: createSelector({
    type: TokenType.Comment
  })
};

export interface SelectorGroup {
  (token: Token): boolean;
  selectors: Selector[];
  name: string;
}

export function createSelectorGroup(
  name: string,
  selectors: Selector[]
): SelectorGroup {
  const selectorsWithValue = selectors.filter(
    (item) => item.data.value !== undefined
  );
  const casesWithValue = selectorsWithValue
    .map((selector) => {
      return `case "${selector.data.value}": return token.type === "${selector.data.type}";`;
    })
    .join('\n');
  const selectorsWithoutValue = selectors.filter(
    (item) => item.data.value === undefined
  );
  const casesWithoutValue = selectorsWithoutValue
    .map((selector) => {
      return `case "${selector.data.type}":`;
    })
    .join('\n');
  const groupf = new Function(
    'token',
    `
  ${
    casesWithoutValue.length > 0
      ? `switch(token.type) {
    ${casesWithoutValue}
      return true;
  }`
      : ''
  }
  ${
    casesWithValue.length > 0
      ? `switch(token.value) {
    ${casesWithValue}
  }`
      : ''
  }
  return false;`
  ) as SelectorGroup;
  Object.defineProperty(groupf, 'name', {
    value: `selector_group_${name}`,
    writable: false
  });
  groupf.selectors = selectors;
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
    [Selectors.RParenthesis, Selectors.EndOfFile]
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
