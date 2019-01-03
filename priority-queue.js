/// Based on js-priority-queue by Adam Hooper
/// https://github.com/adamhooper/js-priority-queue

function DefaultComparator(a, b) {
  return a - b;
}

export class ArrayStrategy {
  constructor(options = {}) {
    this.comparator = options.comparator || DefaultComparator;
    const providedData = options.initialValues;
    this.data = providedData ? providedData.slice() : [];
    this.update();
  }
  update() {
    this.data.sort((a, b) => -this.comparator(a, b));
  }
  queue(value) {
    const pos = ArrayStrategy.binarySearchForIndexReversed(this.data, value, this.comparator);
    this.data.splice(pos, 0, value);
  }
  dequeue() {
    return this.data.pop();
  }
  peek() {
    return this.data[this.data.length - 1];
  }
  clear() {
    this.data.length = 0;
  }
  static binarySearchForIndexReversed(array, value, comparator) {
    let low = 0;
    let high = array.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (comparator(array[mid], value) >= 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
}

export class BHeapStrategy {
  constructor(options = {}) {
    this.comparator = options.comparator ? options.comparator : function(a, b) {
      return a - b;
    };
    this.pageSize = options.pageSize ? options.pageSize : 512;
    this.length = 0;
    let shift = 0;
    while ((1 << shift) < this.pageSize) {
      shift += 1;
    }
    if (1 << shift !== this.pageSize) {
      throw 'pageSize must be a power of two';
    }
    this._shift = shift;
    const arr = [];
    this._emptyMemoryPageTemplate = arr;
    for (let i = 0, j = 0, ref = this.pageSize; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      arr.push(null);
    }
    this._memory = [];
    this._mask = this.pageSize - 1;
    if (options.initialValues) {
      const providedData = options.initialValues;
      for (let i = 0, len = providedData.length; i < len; i++) {
        const value = providedData[i];
        this.queue(value);
      }
    }
  }
  queue(value) {
    this.length += 1;
    this._write(this.length, value);
    this._bubbleUp(this.length, value);
  }
  dequeue() {
    const ret = this._read(1);
    const val = this._read(this.length);
    this.length -= 1;
    if (this.length > 0) {
      this._write(1, val);
      this._bubbleDown(1, val);
    }
    return ret;
  }
  peek() {
    return this._read(1);
  }
  clear() {
    this.length = 0;
    this._memory.length = 0;
  }
  update() {
    // TODO I have no idea if this is correct
    for (let i = 1, j = 1, ref = this.length; 1 <= ref ? j < ref : j > ref; i = 1 <= ref ? ++j : --j) {
      this._bubbleUp(i, this._read(i));
    }
  }
  _write(index, value) {
    const page = index >> this._shift;
    while (page >= this._memory.length) {
      this._memory.push(this._emptyMemoryPageTemplate.slice());
    }
    return this._memory[page][index & this._mask] = value;
  }
  _read(index) {
    return this._memory[index >> this._shift][index & this._mask];
  }
  _bubbleUp(index, value) {
    const compare = this.comparator;
    while (index > 1) {
      const indexInPage = index & this._mask;
      let parentIndex = 0;
      if (index < this.pageSize || indexInPage > 3) {
        parentIndex = (index & ~this._mask) | (indexInPage >> 1);
      } else if (indexInPage < 2) {
        parentIndex = (index - this.pageSize) >> this._shift;
        parentIndex += parentIndex & ~(this._mask >> 1);
        parentIndex |= this.pageSize >> 1;
      } else {
        parentIndex = index - 2;
      }
      const parentValue = this._read(parentIndex);
      if (compare(parentValue, value) < 0) {
        break;
      }
      this._write(parentIndex, value);
      this._write(index, parentValue);
      index = parentIndex;
    }
  }
  _bubbleDown(index, value) {
    const compare = this.comparator;
    while (index < this.length) {
      let childIndex1, childIndex2;
      if (index > this._mask && !(index & (this._mask - 1))) {
        childIndex1 = childIndex2 = index + 2;
      } else if (index & (this.pageSize >> 1)) {
        childIndex1 = (index & ~this._mask) >> 1;
        childIndex1 |= index & (this._mask >> 1);
        childIndex1 = (childIndex1 + 1) << this._shift;
        childIndex2 = childIndex1 + 1;
      } else {
        childIndex1 = index + (index & this._mask);
        childIndex2 = childIndex1 + 1;
      }
      let childValue1, childValue2;
      if (childIndex1 !== childIndex2 && childIndex2 <= this.length) {
        childValue1 = this._read(childIndex1);
        childValue2 = this._read(childIndex2);
        if (compare(childValue1, value) < 0 && compare(childValue1, childValue2) <= 0) {
          this._write(childIndex1, value);
          this._write(index, childValue1);
          index = childIndex1;
        } else if (compare(childValue2, value) < 0) {
          this._write(childIndex2, value);
          this._write(index, childValue2);
          index = childIndex2;
        } else {
          break;
        }
      } else if (childIndex1 <= this.length) {
        childValue1 = this._read(childIndex1);
        if (compare(childValue1, value) < 0) {
          this._write(childIndex1, value);
          this._write(index, childValue1);
          index = childIndex1;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }
}

export class BinaryHeapStrategy {
  constructor(options = {}) {
    this.comparator = options.comparator || DefaultComparator;
    this.length = 0;
    const providedData = options.initialValues;
    this.data = providedData ? providedData.slice() : [];
    this.update();
  }
  update() {
    if (this.data.length > 0) {
      for (let i = 1, j = 1, ref = this.data.length; 1 <= ref ? j < ref : j > ref; i = 1 <= ref ? ++j : --j) {
        this._bubbleUp(i);
      }
    }
  }
  queue(value) {
    this.data.push(value);
    this._bubbleUp(this.data.length - 1);
  }
  dequeue() {
    const ret = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._bubbleDown(0);
    }
    return ret;
  }
  peek() {
    return this.data[0];
  }
  clear() {
    this.length = 0;
    this.data.length = 0;
  }
  _bubbleUp(pos) {
    while (pos > 0) {
      const parent = (pos - 1) >>> 1;
      if (this.comparator(this.data[pos], this.data[parent]) < 0) {
        const x = this.data[parent];
        this.data[parent] = this.data[pos];
        this.data[pos] = x;
        pos = parent;
      } else {
        break;
      }
    }
  }
  _bubbleDown(pos) {
    const last = this.data.length - 1;
    while (true) {
      const left = (pos << 1) + 1;
      const right = left + 1;
      let minIndex = pos;
      if (left <= last && this.comparator(this.data[left], this.data[minIndex]) < 0) {
        minIndex = left;
      }
      if (right <= last && this.comparator(this.data[right], this.data[minIndex]) < 0) {
        minIndex = right;
      }
      if (minIndex !== pos) {
        const x = this.data[minIndex];
        this.data[minIndex] = this.data[pos];
        this.data[pos] = x;
        pos = minIndex;
      } else {
        break;
      }
    }
  }
}

class AbstractPriorityQueue {
  constructor(options) {
    if (!options || !options.strategy) {
      throw 'Must pass options.strategy, a strategy';
    }
    if (!options || !options.comparator) {
      throw 'Must pass options.comparator, a comparator';
    }
    this.priv = new options.strategy(options);
    const providedData = options.initialValues;
    this.length = providedData ? providedData.length : 0;
  }

  queue(value) {
    this.length++;
    this.priv.queue(value);
  }
  dequeue(value) {
    if (!this.length) {
      throw 'Empty queue';
    }
    this.length--;
    return this.priv.dequeue();
  }
  peek(value) {
    if (!this.length) {
      throw 'Empty queue';
    }
    return this.priv.peek();
  }
  clear() {
    this.length = 0;
    return this.priv.clear();
  }
  update() {
    this.priv.update();
  }
}

export default class PriorityQueue extends AbstractPriorityQueue {
  constructor(options = {}) {
    super(PriorityQueue.sanitizeOptions(options));
  }
  static sanitizeOptions(options) {
    options.strategy = options.strategy || BinaryHeapStrategy;
    options.comparator = options.comparator || DefaultComparator;
    return options;
  }
}
/// Legacy members
PriorityQueue.ArrayStrategy = ArrayStrategy;
PriorityQueue.BinaryHeapStrategy = BinaryHeapStrategy;
PriorityQueue.BHeapStrategy = BHeapStrategy;
