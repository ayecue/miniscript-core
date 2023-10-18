export enum CharacterCode {
  WHITESPACE = 32,
  QUOTE = 34,
  NUMBER_0 = 48,
  NUMBER_1 = 49,
  NUMBER_2 = 50,
  NUMBER_3 = 51,
  NUMBER_4 = 52,
  NUMBER_5 = 53,
  NUMBER_6 = 54,
  NUMBER_7 = 55,
  NUMBER_8 = 56,
  NUMBER_9 = 57,
  TAB = 9,
  NEW_LINE = 10,
  RETURN_LINE = 13,
  SLASH = 47,
  DOT = 46,
  EQUAL = 61,
  ASTERISK = 42, // *
  CARET = 94, // ^
  PERCENT = 37, // %
  COMMA = 44, // ,
  CURLY_BRACKET_LEFT = 123, // {
  CURLY_BRACKET_RIGHT = 125, // }
  SQUARE_BRACKETS_LEFT = 91, // [
  SQUARE_BRACKETS_RIGHT = 93, // ]
  PARENTHESIS_LEFT = 40, // (
  PARENTHESIS_RIGHT = 41, // )
  SEMICOLON = 59, // ;
  HASH = 35, // #
  MINUS = 45, // -
  PLUS = 43, // +,
  EXCLAMATION_MARK = 33, // !
  AT_SIGN = 64,
  COLON = 58,
  ARROW_LEFT = 60,
  ARROW_RIGHT = 62,
  VERTICAL_LINE = 124,
  AMPERSAND = 38,
  LETTER_E = 69,
  LETTER_e = 101
}

export const NumberCodes: CharacterCode[] = [
  CharacterCode.NUMBER_0,
  CharacterCode.NUMBER_1,
  CharacterCode.NUMBER_2,
  CharacterCode.NUMBER_3,
  CharacterCode.NUMBER_4,
  CharacterCode.NUMBER_5,
  CharacterCode.NUMBER_6,
  CharacterCode.NUMBER_7,
  CharacterCode.NUMBER_8,
  CharacterCode.NUMBER_9
];

export const LetterCodes: CharacterCode[] = [
  CharacterCode.LETTER_E,
  CharacterCode.LETTER_e
];
