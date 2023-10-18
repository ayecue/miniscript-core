import { Position } from './position';

export class Range {
  start: Position;
  end: Position;

  constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }

  toString(): string {
    return `${this.start} - ${this.end}`;
  }
}
