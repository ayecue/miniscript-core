export class Stack<T> {
  private _items: T[] = [];
  private _last: T = null;
  private _default: T = null;

  setDefault(item: T) {
    this._default = item;
  }

  push(value: T): number {
    return this._items.push((this._last = value));
  }

  pop(): T {
    switch (this._items.length) {
      case 0:
        return this._default;
      case 1: {
        this._last = null;
        return this._items.pop();
      }
    }

    const ret = this._items.pop();
    this._last = this._items[this._items.length - 1];
    return ret;
  }

  peek(): T {
    return this._last || this._default;
  }
}
