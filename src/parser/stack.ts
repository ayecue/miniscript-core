export class Stack<T> {
  private stack: T[];
  private last: T;

  constructor(value?: T) {
    this.stack = [];
    if (value != null) this.push(value);
  }

  push(value: T): number {
    const len = this.stack.push(value);
    this.last = value;
    return len;
  }

  pop(): T {
    const ret = this.stack.pop();
    this.last = this.stack[this.stack.length - 1];
    return ret;
  }

  peek(): T {
    return this.last;
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
