/*
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
type Node<T> = {
  value: T;
  next?: Node<T>;
};

export default class Queue<T extends Object> {
  private _head: Node<T> | null = null;
  private _tail: Node<T> | null = null;
  private _size: number = 0;

  enqueue(value: T) {
    const node: Node<T> = { value };
    if (this._head) this._tail.next = node;
    else this._head = node;
    this._tail = node;
    this._size++;
  }

  dequeue(): T {
    const current = this._head.value;

    if (!current) {
      return;
    }

    this._head = this._head.next;
    this._size--;

    return current;
  }

  peek(): T {
    return this._head?.value || null;
  }

  clear() {
    this._head = null;
    this._tail = null;
    this._size = 0;
  }

  copyInto(queue: Queue<T>) {
    this._head = queue._head;
    this._tail = queue._tail;
    this._size = queue._size;
  }

  get size() {
    return this._size;
  }

  *[Symbol.iterator]() {
    let current = this._head;

    while (current) {
      yield current;
      current = current.next;
    }
  }
}
