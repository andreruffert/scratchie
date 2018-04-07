const instances = [];
const moduleName = 'scratchie';
const defaultClasses = {
  element: 'scratchie',
  canvas: 'scratchie-canvas'
};
const defaultOptions = {
  brush:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAJ0lEQVR42u3NoQEAAAjAoP3/tJ6hgUCmao6IxWKxWCwWi8VisfhrvDDIgKphXmDUAAAAAElFTkSuQmCC',
  disabled: false,
  onRenderEnd: null,
  onScratch: null
};

/**
 * Module
 * @param {String} element  A selector e.g `.container`
 * @param {Object} options
 */
class Module {
  constructor(element, options) {
    const { onRenderEnd, onScratch, brush, disabled } = options;

    this.isDisabled = disabled;
    this.element = element;
    this.options = Object.assign({}, defaultOptions, options);
    this.options.classes = Object.assign(
      {},
      defaultClasses,
      options.classes || {}
    );

    this.brush = new Image();
    this.brush.src = this.options.brush;
    this.canvasWidth = this.element.clientWidth;
    this.canvasHeight = this.element.clientHeight;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.element.appendChild(this.canvas);
    this.element.classList.add(`${this.options.classes.element}`);
    this.canvas.classList.add(`${this.options.classes.canvas}`);

    this.handleStart = this.handleStart.bind(this);
    this.handelMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.onRenderEnd = onRenderEnd && onRenderEnd.bind(this);
    this.onScratch = onScratch && onScratch.bind(this);

    this.addEvents();

    // Required styles
    if (instances.length > 0) return;

    appendStyle(`
      .${this.options.classes.element} {
        position: relative;
      }
      .${this.options.classes.canvas} {
        position: absolute;
        top: 0;
        left: 0;
      }
    `);
  }

  addEvents() {
    this.canvas.addEventListener('mousedown', this.handleStart, true);
    this.canvas.addEventListener('touchstart', this.handleStart, true);
    this.canvas.addEventListener('mouseup', this.handleEnd, true);
    this.canvas.addEventListener('touchend', this.handleEnd, true);
  }

  render(value) {
    const type = value.includes('.') ? 'image' : 'color';
    const _this = this;

    this.isScratching = false;
    this.lastPoint = null;

    // The canvas size is defined by its container element.
    // Also triggers a redraw
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    const fill = {
      color(color, cb) {
        _this.ctx.rect(0, 0, _this.canvasWidth, _this.canvasHeight);
        _this.ctx.fillStyle = color;
        _this.ctx.fill();
        cb();
      },
      image(src, cb) {
        const image = new Image();

        // workaround to prevent flicker of html behind canvas
        fill['color']('white', cb);

        image.onload = () => {
          _this.ctx.drawImage(image, 0, 0);
          cb();
        };

        // Fixes `onload()` for cached images
        image.src = `${src}?${new Date().getTime()}`;
      }
    };

    fill[type](value, () => {
      if (_this.onRenderEnd && typeof _this.onRenderEnd === 'function') {
        _this.onRenderEnd();
      }
    });
  }

  getScratchedPixels() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );
    const pixels = imageData.data;
    const numPixels = imageData.width * imageData.height;
    let count = 0;

    // Iterate over the `pixels` data buffer
    for (let i = 0; i < numPixels; i++) {
      // rgba +3 is alpha
      if (parseInt(pixels[i * 4 + 3]) === 0) {
        count++;
      }
    }

    return Math.floor(count / (this.canvasWidth * this.canvasHeight) * 100);
  }

  // Returns mouse position relative to the `canvas` parent
  getRelativePosition(e, canvas) {
    let offsetX = 0;
    let offsetY = 0;
    let pageX = 0;
    let pageY = 0;

    if (canvas.offsetParent !== undefined) {
      while (canvas !== null) {
        offsetX += canvas.offsetLeft;
        offsetY += canvas.offsetTop;
        canvas = canvas.offsetParent;
      }
    }

    pageX = e.pageX || e.touches[0].pageX;
    pageY = e.pageY || e.touches[0].pageY;

    return {
      x: pageX - offsetX,
      y: pageY - offsetY
    };
  }

  handleStart(e) {
    if (this.isDisabled) return;

    this.isScratching = true;
    this.lastPoint = this.getRelativePosition(e, this.canvas);

    this.canvas.addEventListener('mousemove', this.handelMove, true);
    this.canvas.addEventListener('touchmove', this.handelMove, true);
  }

  handleMove(e) {
    if (!this.isScratching) return;

    // Prevent scrolling on touch devices
    e.preventDefault();

    const currentPoint = this.getRelativePosition(e, this.canvas);
    const dist = distanceBetween(this.lastPoint, currentPoint);
    const angle = angleBetween(this.lastPoint, currentPoint);
    const scratchedPixels = this.getScratchedPixels();

    let x;
    let y;

    for (let i = 0; i < dist; i++) {
      x = this.lastPoint.x + Math.sin(angle) * i - 25;
      y = this.lastPoint.y + Math.cos(angle) * i - 25;
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.drawImage(this.brush, x, y);
    }

    this.lastPoint = currentPoint;

    if (this.onScratch && typeof this.onScratch === 'function') {
      this.onScratch(scratchedPixels);
    }
  }

  handleEnd(e) {
    if (this.disabled) return;

    this.isScratching = false;
    this.canvas.removeEventListener('mousemove', this.handleMove);
    this.canvas.removeEventListener('touchmove', this.handleMove);
  }
}

// Module wrapper
export default function Scratchie(selector, options) {
  const elements = document.querySelectorAll(selector);

  for (let i = 0, l = elements.length; i < l; i++) {
    elements[i].scratchie = new Module(elements[i], options);
    instances.push(elements[i]);
    elements[i].scratchie.render(elements[i].getAttribute('data-scratchie'));
  }

  // Returns all elements that are initialized
  return instances;
}

function appendStyle(styles) {
  const css = document.createElement('style');
  css.type = 'text/css';

  if (css.styleSheet) {
    css.styleSheet.cssText = styles;
  } else {
    css.appendChild(document.createTextNode(styles));
  }
  document.getElementsByTagName('head')[0].appendChild(css);
}

function distanceBetween(point1, point2) {
  return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
}

function angleBetween(point1, point2) {
  return Math.atan2(point2.x - point1.x, point2.y - point1.y);
}
