import { ASTBase } from "./ast";

export class LineRegistry {
  private _lines: Record<number, ASTBase[]>;

  get lines() {
    return this._lines;
  }

  constructor() {
    this._lines = {};
  }

  addItemToLines(item: ASTBase) {
    this.addItemToRange(item.start.line, item.end.line, item);
  }

  addItemToLine(line: number, item: ASTBase) {
    this.addItemToRange(line, line, item);
  }

  addItemToRange(startLine: number, endLine: number, item: ASTBase) {
    const lines = this._lines;

    for (let line = startLine; line <= endLine; line++) {
      const statements = lines[line];
      statements ? statements.push(item) : (lines[line] = [item]);
    }
  }
}