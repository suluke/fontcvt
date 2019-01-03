import { drawLinesToCtx } from './utils.js';
import CharApproximator, { CharApproximation } from './algorithm.js';

const Bounds = { width: 12, height: 18 };
const NumLineElts = 4;
const NumLines = 32

const ASCII = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const Font = 'serif';

function makeCharCanvas(char) {
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

function showLines(lines) {
  const { width, height } = Bounds;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  document.body.appendChild(canvas);
  drawLinesToCtx(lines, ctx, width, height);
}

const charcvt = new CharApproximator(Bounds.width, Bounds.height, NumLines);

for (let i = 0; i < ASCII.length; i++) {
  const char = ASCII.charAt(i);
  const canvas = makeCharCanvas(char);
  document.body.appendChild(canvas);
  const algolines = charcvt.approximate(char, Font);
  showLines(algolines);
  //document.body.appendChild(document.createElement('br'));
}

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
    const grayscale = charcvt.convertToGrayscale(char, Font);
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
    lossDisplay.innerHTML = `${approximation.getLoss()}`;
  }

  renderLines() {
    const { linesCtx, approximation, numLinesDisplay } = this;
    const { lines } = approximation;
    const { width, height } = Bounds;
    linesCtx.clearRect(0, 0, width, height);
    drawLinesToCtx(lines, linesCtx, width, height);
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
