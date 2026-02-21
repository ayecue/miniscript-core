import { ASTBase } from './ast';

export class LineRegistry {
  readonly items: ASTBase[];

  constructor() {
    this.items = [];
  }

  register(item: ASTBase): void {
    this.items.push(item);
  }

  build(): LineRegistryView {
    const view = new LineRegistryView(this.items);
    return view;
  }
}

export class LineRegistryView {
  readonly items: ASTBase[];

  private _n: number;            // half-size, always a power of 2
  private _store: number[];     // flat item refs, grouped by node
  private _offset: Uint32Array;  // start offset in _store for each node
  private _count: Uint16Array;   // item count per node

  constructor(items: ASTBase[]) {
    const len = items.length;

    this.items = items;

    if (len === 0) {
      this._n = 0;
      this._store = [];
      this._offset = new Uint32Array(0);
      this._count = new Uint16Array(0);
      return;
    }

    // Determine tree range – covers lines [0, n) where n > maxLine
    let maxLine = 0;
    for (let i = 0; i < len; i++) {
      const e = items[i].endLine;
      if (e > maxLine) maxLine = e;
    }
    let n = 1;
    while (n <= maxLine) n <<= 1;
    this._n = n;
    const size = n << 1; // total tree nodes

    // --- Pass 1: count how many items land on each tree node ---
    const count = new Uint16Array(size);
    for (let i = 0; i < len; i++) {
      let lo = items[i].startLine + n;
      let hi = items[i].endLine + n + 1; // half-open
      while (lo < hi) {
        if (lo & 1) count[lo++]++;
        if (hi & 1) count[--hi]++;
        lo >>= 1;
        hi >>= 1;
      }
    }

    // Prefix sum → per-node offsets into the flat store
    const offset = new Uint32Array(size + 1);
    for (let i = 0; i < size; i++) {
      offset[i + 1] = offset[i] + count[i];
    }

    // --- Pass 2: distribute items into the flat store ---
    const total = offset[size];
    const store: number[] = new Array(total);
    // Temporary write cursors (reuses offset values)
    const cursor = new Uint32Array(size);
    for (let i = 0; i < size; i++) cursor[i] = offset[i];

    for (let i = 0; i < len; i++) {
      const item = items[i];
      let lo = item.startLine + n;
      let hi = item.endLine + n + 1;
      while (lo < hi) {
        if (lo & 1) store[cursor[lo++]++] = i;
        if (hi & 1) store[cursor[--hi]++] = i;
        lo >>= 1;
        hi >>= 1;
      }
    }

    this._store = store;
    this._offset = offset;
    this._count = count;
  }

  get(line: number): ASTBase[] {
    const n = this._n;
    if (n === 0 || line < 1 || line >= n) return undefined;

    const store = this._store;
    const offset = this._offset;
    const count = this._count;
    let result: ASTBase[] = [];

    // Walk from leaf to root, collecting items at each node
    for (let p = line + n; p > 0; p >>= 1) {
      const c = count[p];
      if (c > 0) {
        const o = offset[p];
        for (let j = 0; j < c; j++) result.push(this.items[store[o + j]]);
      }
    }

    return result;
  }
}
