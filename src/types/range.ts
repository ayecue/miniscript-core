export class Range {
  start: [number, number];
  end: [number, number];

  constructor(start: [number, number], end: [number, number]) {
    this.start = start;
    this.end = end;
  }

  toString(): string {
    return `${this.start} - ${this.end}`;
  }
}
