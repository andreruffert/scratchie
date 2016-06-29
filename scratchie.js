(function() {

    'use strict';

    /**
     * Extend a given object with all the properties in passed-in object(s).
     *
     * @param  {Object} obj
     * @return {Object}
     */
    function extend(obj) {
        var i, l, prop, source;
        for (i=1, l=arguments.length; i<l; ++i) {
            source = arguments[i];
            for (prop in source) {
                if (hasOwnProperty.call(source, prop)) {
                    obj[prop] = source[prop];
                }
            }
        }
        return obj;
    }

    function appendStyle(styles) {
        var css = document.createElement('style');
        css.type = 'text/css';

        if (css.styleSheet) {
            css.styleSheet.cssText = styles;
        }
        else {
            css.appendChild(document.createTextNode(styles));
        }
        document.getElementsByTagName('head')[0].appendChild(css);
    }

    function distanceBetween(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    }

    function angleBetween(point1, point2) {
        return Math.atan2( point2.x - point1.x, point2.y - point1.y );
    }

    // Module Configuration
    var instances = [],
        identifier = 0,
        moduleName = 'scratchie',
        defaults = {
            canvasClassName: 'scratchie-canvas',
            brush: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAJ0lEQVR42u3NoQEAAAjAoP3/tJ6hgUCmao6IxWKxWCwWi8VisfhrvDDIgKphXmDUAAAAAElFTkSuQmCC',
            onRenderEnd: null,    // Callback fn
            onScratchMove: null   // Callback fn
        };

    /**
     * Module
     * @param {String} element  A selector e.g `.container`
     * @param {Object} options
     */
    function Module(element, options) {
        this.element            = element;
        this.options            = extend(defaults, options);
        this.id                 = 'js-' + moduleName + '-' + identifier++;
        this.enabled            = true;
        this.handleStart        = this.handleStart.bind(this);
        this.handelMove         = this.handleMove.bind(this);
        this.handleEnd          = this.handleEnd.bind(this);
        this.onRenderEnd        = this.options.onRenderEnd && this.options.onRenderEnd.bind(this);
        this.onScratchMove      = this.options.onScratchMove && this.options.onScratchMove.bind(this);

        this.brush              = new Image();
        this.brush.src          = this.options.brush;
        this.canvasWidth        = this.element.clientWidth;
        this.canvasHeight       = this.element.clientHeight;
        this.canvas             = document.createElement('canvas');
        this.canvas.className   = this.options.canvasClassName + ' js-' + moduleName + '-canvas';
        this.canvas.id          = this.id;
        this.ctx                = this.canvas.getContext('2d');
        this.element.className  = this.element.className + ' js-' + moduleName;
        this.element.id         = this.id;

        this.element.appendChild(this.canvas);
        this.addEvents();

        // Required styles
        if (identifier !== 1) { return; }
        appendStyle([
            '.js-' + moduleName + ' {',
                'position: relative;',
                '-webkit-user-select: none;',
                '-moz-user-select: none;',
                '-ms-user-select: none;',
                '-o-user-select: none;',
                'user-select: none;',
            '}',
            '.js-' + moduleName + '-canvas {',
                'position: absolute;',
                'top: 0;',
            '}'
        ].join('\n'));
    }

    Module.prototype.addEvents = function() {
        this.canvas.addEventListener('mousedown', this.handleStart, false);
        this.canvas.addEventListener('touchstart', this.handleStart, false);
        this.canvas.addEventListener('mouseup', this.handleEnd, false);
        this.canvas.addEventListener('touchend', this.handleEnd, false);
    };

    Module.prototype.render = function(value) {
        var type = (value.indexOf('.') > -1) ? 'image' : 'color'
        var _this = this;
        this.isDrawing = false;
        this.lastPoint = null;

        // The canvas size is defined by its container element.
        // Also triggers a redraw
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        var fill = {
            color: function(color, cb) {
                _this.ctx.rect(0, 0, _this.canvasWidth, _this.canvasHeight);
                _this.ctx.fillStyle = color;
                _this.ctx.fill();
                cb();
            },
            image: function(src, cb) {
                var image = new Image();

                // workaround to prevent flicker of html behind canvas
                fill['color']('white', cb);

                image.onload = function() {
                    _this.ctx.drawImage(this, 0, 0);
                    cb();
                }

                // Fixes `onload()` for cached images
                image.src = src + '?' + new Date().getTime();
            }
        };

        fill[type](value, function() {
            if (_this.onRenderEnd && typeof _this.onRenderEnd === 'function') {
                _this.onRenderEnd();
            }
        });
    };

    Module.prototype.getFilledInPixels = function() {
        var imageData   = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight),
            pixels      = imageData.data,
            numPixels   = imageData.width * imageData.height,
            count       = 0;

        // Iterate over the `pixels` data buffer
        for (var i = 0; i < numPixels; i++) {
            // rgba +3 is alpha
            if (parseInt(pixels[i*4+3]) === 0) {
                count++;
            }
        }

        return Math.floor((count / (this.canvasWidth * this.canvasHeight)) * 100);
    };

    // Returns mouse position relative to the `canvas` parent
    Module.prototype.getRelativePosition = function(e, canvas) {
        var offsetX = 0,
            offsetY = 0,
            pageX = 0,
            pageY = 0;



        if (canvas.offsetParent !== undefined) {
            while (canvas !== null) {
                offsetX += canvas.offsetLeft;
                offsetY += canvas.offsetTop;
                canvas = canvas.offsetParent
            }
        }

        
        pageX = e.pageX || e.touches[0].pageX;
        pageY = e.pageY || e.touches[0].pageY;


        return {
            x: pageX - offsetX,
            y: pageY - offsetY
        };
    };

    Module.prototype.handleStart = function(e) {
        if (!this.enabled) { return; }

        this.isDrawing = true;
        this.lastPoint = this.getRelativePosition(e, this.canvas);

        this.canvas.addEventListener('mousemove', this.handelMove, false);
        this.canvas.addEventListener('touchmove', this.handelMove, false);
    };

    Module.prototype.handleMove = function(e) {
        if (!this.isDrawing) { return; }

        // Prevent scrolling on touch devices
        e.preventDefault();

        var currentPoint = this.getRelativePosition(e, this.canvas),
            dist         = distanceBetween(this.lastPoint, currentPoint),
            angle        = angleBetween(this.lastPoint, currentPoint),
            x, y;

        for (var i = 0; i < dist; i++) {
            x = this.lastPoint.x + (Math.sin(angle) * i) - 25;
            y = this.lastPoint.y + (Math.cos(angle) * i) - 25;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.drawImage(this.brush, x, y);
        }

        this.lastPoint = currentPoint;

        if (this.onScratchMove && typeof this.onScratchMove ==='function') {
            this.onScratchMove(this.getFilledInPixels());
        }
    };

    Module.prototype.handleEnd = function(e) {
        if (!this.enabled) { return; }

        this.isDrawing = false;

        this.canvas.removeEventListener('mousemove', this.handleMove, false);
        this.canvas.removeEventListener('touchmove', this.handleMove, false);
    };


    // Module wrapper
    function Scratchie(selector, options) {
        var elements = document.querySelectorAll(selector);

        for (var i = 0, l = elements.length; i < l; i++) {
            elements[i].scratchie = new Module(elements[i], options);
            instances.push(elements[i]);

            elements[i].scratchie.render(elements[i].getAttribute('data-scratchie'));
        }
    }

    // Returns all elements that are initialized with Scratchie
    Scratchie.prototype.elements = instances;

    // Global expose
    window.Scratchie = Scratchie;
})();
