export class OpBuilder<T> {
  protected ops: T[] = [];

  add(op: T): this {
    this.ops.push(op);
    return this;
  }

  build(): T[] {
    return this.ops.slice();
  }
}
