export class Position {
  line: number;
  character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }

  toString(): string {
    return `${this.line}:${this.character}`;
  }
}
