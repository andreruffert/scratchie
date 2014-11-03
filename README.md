# Scratchie.js

A standalone JavaScript micro-library to create HTML5 canvas based scratch off panels. Check out a [demo](). Scratchie.js works in IE9+.

```
bower install scratchie.js
```

Using scratchie.js is simple

```html
<script src="dist/scratchie.js"></script>
<script>
	var scratchie = new Scratchie('[data-scratchie="hotpink"]');
</script>
```

## .render()

The `render()` API takes a few options

```javascript
scratchie.render(value);
```

### value
Type: `String` Default: `black` 

Color Name, HEX or image e.g. `hotpink`, `#FF69B4`, `/path/to/image.png`
