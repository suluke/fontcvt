import { drawLinesToCtx, drawLineToCtx, intToCSSRgb } from './utils.js';
import CharApproximator, { CharApproximation } from './algorithm.js';

const Bounds = { width: 12, height: 18 };
const NumLineElts = 4;
const NumLines = 32

const ASCII = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const Font = 'serif';

class FontConverter {
  constructor() {
    this.charcvt = new CharApproximator(Bounds.width, Bounds.height, NumLines);
    for (let i = 0; i < ASCII.length; i++) {
      const char = ASCII.charAt(i);
      const charCanvas = this.makeCharCanvas(char);
      document.body.appendChild(charCanvas);
      const algolines = this.charcvt.approximate(char, Font);
      const linesCanvas = this.makeLinesCanvas(algolines);
      document.body.appendChild(linesCanvas);
      //document.body.appendChild(document.createElement('br'));
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
    this.submitBtn = document.getElementById('fontcvt-btn-submit');
    this.charInput = document.getElementById('fontcvt-input-char');
    this.grayscaleCanvas = document.getElementById('fontcvt-canvas-grayscale');
    this.remainingCanvas = document.getElementById('fontcvt-canvas-remaining');
    this.linesCanvas = document.getElementById('fontcvt-canvas-lines');
    this.numLinesDisplay = document.getElementById('fontcvt-text-numlines');
    this.lossDisplay = document.getElementById('fontcvt-text-loss');
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
    const loss = this.approximation.getLoss();
    if (loss < 0.05)
      return;
    this.approximation.addNewLine();
    this.renderRemaining();
    this.renderLines();
  }
}
new Visualizer();
