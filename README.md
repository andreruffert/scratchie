# Scratchcard.js

A standalone JavaScript micro-library to create HTML5 canvas based scratch cards. Check out a [demo](). Scratchcard.js works in IE9+.

```
bower install scratchcard.js
```

Using scratchcard.js is simple

```html
<script src="dist/scratchcard.js"></script>
<script>
	var var scratchcard = new Scratchcard('[data-provide=scratchcard]');
	scratchcard.render('image', 'image1.png');
</script>
```

## .render()

The `render()` API takes a few options

```js
scratchcard.render(type, value);
```

### type
Type: `String` Default: `color`

### value
Type: `String` Default: `black` 

Color Name or HEX e.g. `hotpink`, `#FF69B4`
