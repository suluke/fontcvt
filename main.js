import { drawLinesToCtx, drawLineToCtx, intToCSSRgb } from './utils.js';
import CharApproximator, { CharApproximation } from './algorithm.js';

const Bounds = { width: 12, height: 18 };
const NumLineElts = 4;
const NumLines = 32;

const ASCII = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const Font = 'serif';

class FontConverter {
  constructor() {
    this.container = document.getElementById('fontcvt-section-font-converter');
    this.charcvt = new CharApproximator(Bounds.width, Bounds.height, NumLines);
    for (let i = 0; i < ASCII.length; i++) {
      const char = ASCII.charAt(i);
      const charCanvas = this.makeCharCanvas(char);
      this.container.appendChild(charCanvas);
      const algolines = this.charcvt.approximate(char, Font);
      const linesCanvas = this.makeLinesCanvas(algolines);
      this.container.appendChild(linesCanvas);
      //this.container.appendChild(document.createElement('br'));
      this.colorize = false;
    }
  }
  makeCharCanvas(char) {
    const { width, height } = Bounds;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 1;
    ctx.font = `${width}px ${Font}`;
    ctx.fillText(char, 0, height * .75);
    return canvas;
  }
  makeLinesCanvas(lines) {
    const { width, height } = Bounds;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 1;
    if (this.colorize) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        ctx.strokeStyle = intToCSSRgb(i);
        drawLineToCtx(line, ctx, width, height);
      }
    } else {
      ctx.strokeStyle = 'black';
      drawLinesToCtx(lines, ctx, width, height);
    }
    return canvas;
  }
}
new FontConverter();

class Visualizer {
  constructor() {
    const ClassPrefix = 'fontcvt-visualizer';
    this.container = document.getElementById('fontcvt-section-visualizer');
    this.submitBtn = this.container.querySelector(`.${ClassPrefix}-btn-submit`);
    this.charInput = this.container.querySelector(`.${ClassPrefix}-input-char`);
    this.grayscaleCanvas = this.container.querySelector(`.${ClassPrefix}-canvas-grayscale`);
    this.remainingCanvas = this.container.querySelector(`.${ClassPrefix}-canvas-remaining`);
    this.linesCanvas = this.container.querySelector(`.${ClassPrefix}-canvas-lines`);
    this.numLinesDisplay = this.container.querySelector(`.${ClassPrefix}-text-numlines`);
    this.lossDisplay = this.container.querySelector(`.${ClassPrefix}-text-loss`);
    const { width, height } = Bounds;
    const {
      submitBtn, charInput,
      grayscaleCanvas, remainingCanvas, linesCanvas,
    } = this;
    grayscaleCanvas.width = width;
    grayscaleCanvas.height = height;
    remainingCanvas.width = width;
    remainingCanvas.height = height;
    linesCanvas.width = width;
    linesCanvas.height = height;
    this.grayscaleCtx = grayscaleCanvas.getContext('2d');
    this.remainingCtx = remainingCanvas.getContext('2d');
    this.linesCtx = linesCanvas.getContext('2d');
    this.charcvt = new CharApproximator(Bounds.width, Bounds.height, NumLines);
    this.currentChar = '';
    this.grayscale = null;
    this.approximation = null;

    this.colorize = true;

    submitBtn.addEventListener('click', () => this.nextStep());
  }

  reset() {
    this.currentChar = '';
    this.approximation = null;
    const {
      grayscaleCtx, remainingCtx, linesCtx,
      numLinesDisplay, lossDisplay
    } = this;
    const { width, height } = Bounds;
    grayscaleCtx.clearRect(0, 0, width, height);
    remainingCtx.clearRect(0, 0, width, height);
    linesCtx.clearRect(0, 0, width, height);
    numLinesDisplay.innerHTML = '0';
    lossDisplay.innerHTML = 'infinity';
  }

  renderGrayscale() {
    const { grayscaleCtx } = this;
    const { width, height } = Bounds;
    const char = this.currentChar;
    const grayscale = this.charcvt.convertToGrayscale(char, Font);
    const imgData = grayscaleCtx.createImageData(width, height);
    for (let i = 0; i < grayscale.length; i++) {
      imgData.data[4 * i + 0] = 255 - grayscale[i] * 255;
      imgData.data[4 * i + 1] = 255 - grayscale[i] * 255;
      imgData.data[4 * i + 2] = 255 - grayscale[i] * 255;
      imgData.data[4 * i + 3] = 255;
    }
    grayscaleCtx.putImageData(imgData, 0, 0);
    this.grayscale = grayscale;
  }

  renderRemaining() {
    const { remainingCtx, lossDisplay, approximation } = this;
    const { width, height } = Bounds;
    remainingCtx.clearRect(0, 0, width, height);
    const imgData = remainingCtx.createImageData(width, height);
    const remaining = approximation.remainingInk;
    for (let i = 0; i < remaining.length; i++) {
      imgData.data[4 * i + 0] = 255 - remaining[i] * 255;
      imgData.data[4 * i + 1] = 255 - remaining[i] * 255;
      imgData.data[4 * i + 2] = 255 - remaining[i] * 255;
      imgData.data[4 * i + 3] = 255;
    }
    remainingCtx.putImageData(imgData, 0, 0);
    lossDisplay.innerHTML = `${approximation.getLoss().toFixed(3)}`;
  }

  renderLines() {
    const { linesCtx, approximation, numLinesDisplay } = this;
    const { lines } = approximation;
    const { width, height } = Bounds;
    linesCtx.clearRect(0, 0, width, height);
    if (this.colorize) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        linesCtx.strokeStyle = intToCSSRgb(i);
        drawLineToCtx(line, linesCtx, width, height);
      }
    } else {
      linesCtx.strokeStyle = 'black';
      drawLinesToCtx(lines, linesCtx, width, height);
    }
    numLinesDisplay.innerHTML = `${lines.length}`;
  }

  nextStep() {
    const { charInput, grayscale } = this;
    const { width, height } = Bounds;
    const text = charInput.value;
    if (text.length === 0) {
      this.reset();
      return;
    }
    const char = text.charAt(0);
    if (char !== this.currentChar) {
      this.reset();
      this.currentChar = char;
      this.renderGrayscale();
      return;
    }
    if (this.approximation === null) {
      this.approximation = new CharApproximation(grayscale, width, height);
      this.renderRemaining();
      return;
    }
    const { approximation } = this;
    const loss = approximation.getLoss();
    if (loss < 0.05)
      return;
    if (approximation.lines.length >= width * height)
      return
    // FIXME detect no-change situations before we try adding a new
    // line
    const numLinesBefore = approximation.lines.length;
    approximation.addNewLine();
    const numLinesAfter = approximation.lines.length;
    if (numLinesAfter === numLinesBefore)
      return;
    this.renderRemaining();
    this.renderLines();
  }
}
new Visualizer();

class LinePixelsVisualizer {
  constructor() {
    const ClassPrefix = 'fontcvt-linepixels';
    const canvasWidth = 200;
    const canvasHeight = 200;
    this.container = document.getElementById('fontcvt-section-linepixels');
    this.genBtn = this.container.querySelector(`.${ClassPrefix}-btn-generate`);
    this.refCanvas = this.container.querySelector(`.${ClassPrefix}-canvas-reference`);
    this.algoCanvas = this.container.querySelector(`.${ClassPrefix}-canvas-algorithm`);

    this.approx = new CharApproximation([], canvasWidth, canvasHeight);

    this.refCanvas.width = canvasWidth;
    this.refCanvas.height = canvasHeight;
    this.algoCanvas.width = canvasWidth;
    this.algoCanvas.height = canvasHeight;

    const refCtx = this.refCanvas.getContext('2d');
    const algoCtx = this.algoCanvas.getContext('2d');

    this.genBtn.addEventListener('click', () => {
      const width = canvasWidth;
      const height = canvasHeight;
      const x0 = Math.random()* width;
      const y0 = Math.random()* height;
      const x1 = Math.random()* width;
      const y1 = Math.random()* height;
      refCtx.clearRect(0, 0, width, height);
      refCtx.beginPath();
      refCtx.moveTo(x0, y0);
      refCtx.lineTo(x1, y1);
      refCtx.closePath();
      refCtx.stroke();

      algoCtx.clearRect(0, 0, width, height);
      const imgData = algoCtx.getImageData(0, 0, width, height);
      const line = {x0, y0, x1, y1};
      const l1 = {x: x0, y: y0};
      const l2 = {x: x1, y: y1};
      this.approx.visitLinePixels((x, y, idx) => {
        const p = {x: x + .5, y: y + .5};
        const cover = this.approx.getPixelCoverForLine(p, l1, l2);
        imgData.data[4 * idx + 3] = cover * 255;
        if (cover < 0.05) {
          imgData.data[4 * idx + 0] = 255;
          imgData.data[4 * idx + 1] = 0;
          imgData.data[4 * idx + 2] = 0;
          imgData.data[4 * idx + 3] = 255;
        }
      }, line);
      algoCtx.putImageData(imgData, 0, 0);
    });
  }
}
new LinePixelsVisualizer();
