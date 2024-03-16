export class Stack<T> {
  private stack: T[];
  private last: T;
  private default: T;

  constructor(value?: T) {
    this.stack = [];
    this.default = null;
    if (value != null) this.push(value);
  }

  setDefault(item: T): this {
    this.default = item;
    return this;
  }

  push(value: T): number {
    const len = this.stack.push(value);
    this.last = value;
    return len;
  }

  pop(): T {
    const ret = this.stack.pop();
    this.last = this.stack[this.stack.length - 1];
    return ret ?? this.default;
  }

  peek(): T {
    return this.last ?? this.default;
  }

  includes(value: T): boolean {
    return this.stack.includes(value);
  }

  values(): T[] {
    return this.stack.slice(0);
  }

  get length(): number {
    return this.stack.length;
  }

  clear() {
    this.stack = [];
    this.last = undefined;
  }
}
