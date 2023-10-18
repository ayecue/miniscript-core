import { Range } from './range';

export class LexerException extends Error {
  range: Range;

  constructor(message: string, range: Range) {
    super(message);
    this.range = range;
  }
}

export class ParserException extends Error {
  range: Range;

  constructor(message: string, range: Range) {
    super(message);
    this.range = range;
  }
}
