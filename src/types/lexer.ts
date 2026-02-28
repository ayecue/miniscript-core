export interface LexerShape {
  index: number;
  line: number;
  lineStart: number;
  offset: number;
  tokenStart: number | null;
  errors: Error[];
}