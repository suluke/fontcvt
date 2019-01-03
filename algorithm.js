import { drawLinesToCtx, grayscaleFromCtx, pointToLineDist } from './utils.js';
import PriorityQueue from './priority-queue.js';

class Cover {
  constructor(newCover = 0, totalCover = 0) {
    this.newCover = newCover;
    this.totalCover = totalCover;
  }
  isGT(other) {
    return this.newCover > other.newCover ||
           (this.newCover === other.newCover &&
            this.totalCover > other.totalCover);
  }
}

export class CharApproximation {
  constructor(grayscale, width, height, strokeWidth = 1) {
    this.width = width;
    this.height = height;
    this.lines = [];
    this.remainingInk = grayscale.slice();
    this.allInk = grayscale.slice();
    this.strokeWidth = strokeWidth;
    this.pixelPriorities = new PriorityQueue({
      comparator: (a, b) => {
        const ink = this.remainingInk;
        return ink[b] - ink[a];
      },
      initialValues: grayscale.map(function(_, idx) { return idx; })
    });
  }
  selectStartPixel() {
    const { pixelPriorities } = this;
    pixelPriorities.update();
    const idx = pixelPriorities.dequeue();
    return idx;
  }
  visitLinePixels(visitor, line) {
    const vec = { dx: line.x1 - line.x0, dy: line.y1 - line.y0 }
    const len = Math.sqrt(Math.pow(vec.dx, 2) + Math.pow(vec.dy, 2));
    const unit = { dx: vec.dx / len, dy: vec.dy / len };
    const ortho = { dx: unit.dy, dx: -unit.dx };
    const indices = new Set();
    const addPixel = (x, y) => {
      if (x < 0 || x >= this.width)
        return
      if (y < 0 || y >= this.height)
        return;
      const idx = Math.floor(pos.x) + this.width * Math.floor(pos.y);
      indices.add(idx);
    };
    const pos = { x: line.x0, y: line.y0 };
    const sigX = line.x1 - line.x0;
    const sigY = line.y1 - line.y0;
    do {
      addPixel(pos.x, pos.y);
      for (let i = 0; i < this.strokeWidth; i++) {
        const xt = pos.x + .5 * ortho.dx;
        const yt = pos.y + .5 * ortho.dy;
        addPixel(xt, yt);
        const xb = pos.x - .5 * ortho.dx;
        const yb = pos.y - .5 * ortho.dy;
        addPixel(xb, yb);
      }
      pos.x += unit.dx;
      pos.y += unit.dy;
    } while((line.x1 - pos.x) * sigX > 0 || (line.y1 - pos.y) * sigY > 0);
    const iterator = indices.values();
    for (let i = 0; i < indices.size; i++) {
      const idx = iterator.next().value;
      const x = idx % this.width;
      const y = Math.floor(idx / this.width);
      visitor(x, y);
    }
  }
  computeCover(line) {
    const cover = new Cover();
    const l1 = { x: line.x0, y: line.y0};
    const l2 = { x: line.x1, y: line.y1};
    this.visitLinePixels((x, y) => {
      // pixels always have integer coordinates, so don't forget to add .5
      const dist = pointToLineDist({x: x + .5, y: y + .5}, l1, l2);
      if (dist !== dist)
        throw new Error();
      const maxCover = Math.max(this.strokeWidth - 2 * dist, 0);
      const idx = x + this.width * y;
      const remainingCover = Math.min(this.remainingInk[idx], maxCover);
      const allCover = Math.min(this.allInk[idx], maxCover);
      cover.newCover += remainingCover;
      cover.totalCover += allCover;
    }, line);
    return cover;
  }
  commitLine(line) {
    const l1 = { x: line.x0, y: line.y0};
    const l2 = { x: line.x1, y: line.y1};
    this.visitLinePixels((x, y) => {
      const dist = pointToLineDist({x: x + .5, y: y + .5}, l1, l2);
      const maxCover = Math.max(this.strokeWidth - 2 * dist, 0);
      const idx = this.width * y + x;
      const remainingCover = Math.min(this.remainingInk[idx], maxCover);
      this.remainingInk[idx] -= remainingCover;
    }, line);
  }
  addNewLine() {
    const idx = this.selectStartPixel();
    const { width, height } = this;
    const x = idx % width + .5;
    const y = Math.floor(idx / width) + .5;
    const l = { x0: x, y0: y , x1: x, y1: y};
    const iterate = (line) => {
      const currentCover = this.computeCover(line);
      let bestCover = currentCover;
      let bestLine = line;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0)
            continue;
          const line1 = { x0: line.x0 + dx, y0: line.y0 + dy,
                          x1: line.x1,      y1: line.y1 };
          const line2 = { x0: line.x0,      y0: line.y0,
                          x1: line.x1 + dx, y1: line.y1 + dy };
          const cover1 = this.computeCover(line1);
          const cover2 = this.computeCover(line2);
          if (cover1.isGT(bestCover)) {
            bestCover = cover1;
            bestLine = line1;
          }
          if (cover2.isGT(bestCover)) {
            bestCover = cover2;
            bestLine = line2;
          }
        }
      }
      if (bestCover.isGT(currentCover)) {
        line.x0 = bestLine.x0;
        line.y0 = bestLine.y0;
        line.x1 = bestLine.x1;
        line.y1 = bestLine.y1;
        return true;
      }
      return false;
    };
    while (iterate(l))
      continue;
    this.commitLine(l);
    this.lines.push([l.x0 / width - .5, l.y0 / height - .5,
                     l.x1 / width - .5, l.y1 / height - .5]);
  }
  createLines(numLines) {
    for(let i = 0; i < numLines; i++)
      this.addNewLine();
  }
  getLoss() {
    return this.remainingInk.reduce((acc, val) => acc + val, 0);
  }
}

export default class CharApproximator {
  constructor(width, height, numLines) {
    this.width = width;
    this.height = height;
    this.numLines = numLines;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }
  convertToGrayscale(char, font) {
    const { ctx, width, height } = this;
    const fontDesc = `${this.width}px ${font}`;
    ctx.clearRect(0, 0, width, height);
    ctx.font = fontDesc;
    ctx.fillText(char, 0, height * .75);
    return grayscaleFromCtx(ctx, width, height);
  }
  approximate(char, font = 'serif') {
    const { width, height } = this;
    const grayscale = this.convertToGrayscale(char, font);
    // Algorithm:
    // - Build priority queue of all pixels where the pixel's value
    //   indicates priority
    // - Begin with any of the darkest-colored pixels
    // - Place two points in this pixel to describe a new line
    // - Increase cover of the line by wiggling the line ends by 1 in
    //   every direction.
    // - Once cover cannot be increased any more `commit` line
    const approx = new CharApproximation(grayscale, width, height);
    approx.createLines(this.numLines);
    return approx.lines;
  }
}
