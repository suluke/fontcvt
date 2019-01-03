import MersenneTwister from './mersenne-twister.js';

export function grayscaleFromCtx(ctx, width, height) {
  const img = ctx.getImageData(0, 0, width, height);
  const grayscale = []; //new Uint8Array(img.data.length / 4 /* rgba */);
  Array.prototype.reduce.call(img.data, function(acc, val) {
    // We expect all colors to be 0,0,0 and only the alpha channel
    // is responsible for making 'black' visible on screen
    if (acc === 3) {
      grayscale.push(val / 255);
      return 0;
    }
    return acc + 1;
  }, 0);
  if (grayscale.length != width * height)
    throw new Error('Expected to have one grayscale value per pixel');
  return grayscale;
}

export function intToCSSRgb(i) {
  const rand = new MersenneTwister(i);
  const bin = rand.random_int31();
  const r = (bin & 0xff0000) >> 16;
  const g = (bin & 0x00ff00) >>  8;
  const b = (bin & 0x0000ff) >>  0;
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawLinesToCtx(lines, ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  const n = lines.length;

  for (let i = 0; i < n; i++) {
    const line = lines[i];
    drawLineToCtx(line, ctx, width, height)
  }
}

export function drawLineToCtx(line, ctx, width, height) {
  ctx.beginPath();
  const [x0, y0, x1, y1] = line.map(function(c) { return c + 0.5; });
  ctx.moveTo(x0 * width, y0 * height);
  ctx.lineTo(x1 * width, y1 * height);
  ctx.closePath();
  ctx.stroke();
}

// https://stackoverflow.com/a/1501725/1468532
export function pointToLineDist(p, v, w) {
  function sub(v, w) {
    return { x: v.x - w.x, y: v.y - w.y };
  }
  function len(v) {
    return Math.sqrt(Math.pow(v.x, 2), Math.pow(v.y, 2));
  }
  function distance(v, w) {
    return len(sub(v, w));
  }
  function dot(v, w) {
    return v.x * w.x + v.y * w.y;
  }
  // Return minimum distance between line segment vw and point p
  const l2 = Math.pow(distance(v, w), 2.);  // i.e. |w-v|^2 -  avoid a sqrt
  if (l2 == 0.)
    return distance(p, v);   // v == w case
  // Consider the line extending the segment, parameterized as v + t (w - v).
  // We find projection of point p onto the line.
  // It falls where t = [(p-v) . (w-v)] / |w-v|^2
  // We clamp t from [0,1] to handle points outside the segment vw.
  const t = Math.max(0., Math.min(1., dot(sub(p, v), sub(w, v)) / l2));
  // Projection falls on the segment
  const projection = { x: v.x + t * (w.x - v.x),
                       y: v.y + t * (w.y - v.y) };
  return distance(p, projection);
}

export function lerp(x, y, t) {
  return (1 - t) * x + t * y;
}
