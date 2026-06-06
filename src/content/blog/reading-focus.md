---
title: 'A spotlight for reading'
description: 'A keyboard-driven focus mode that dims everything but the block you are reading — built from a single oversized box-shadow.'
pubDate: 'Jun 06 2026'
tags: ['Accessibility', 'CSS']
---

I find long lines genuinely hard to track. My eye reaches the end of one and, on the way back, lands a row too high or too low — so I read the same sentence twice, or skip one without noticing. Tight line spacing makes it worse. So I built a reading mode into this blog.

Press **Focus** on any post — it's in the byline, next to *Copy link*. The post dims, one block lights up, and you step through it with **↑ / ↓** (or Space), one paragraph at a time, always kept near the top of the screen. It loosens the line spacing while it's on, too. Here it is on its own — hit **Focus reading**, then use the arrows:

<iframe src="/demos/reading-focus.html" title="Reading focus mode — live demo" loading="lazy" style="width:100%;height:460px;border:1px solid var(--color-stone-light);border-radius:0.6rem;"></iframe>

## The whole effect is one box-shadow

The dimming looks like a dark overlay with a hole punched through it. It isn't. It's a single empty `<div>` placed over the current block, with one wildly oversized shadow:

```css
.spotlight {
  position: fixed;
  box-shadow: 0 0 0 9999px rgba(22, 20, 17, 0.62);
  pointer-events: none; /* clicks pass straight through */
}
```

A `9999px` spread throws the shadow ~9999px in *every* direction, so the entire page goes dark — except the div's own rectangle, which stays a clear window. Move the div and the spotlight moves with it. No mask, no `clip-path`, no four-rectangles-around-a-hole. A `transition` on the div's position is what makes it glide from block to block.

## Finding the blocks

A "block" is just an element, so this part is easy — grab the readable ones and read their geometry:

```js
const blocks = [...article.querySelectorAll('p, li, h2, h3, pre, img')]
  .map((el) => el.getBoundingClientRect());
```

`getBoundingClientRect()` hands back the box; the spotlight copies it — plus a few pixels of breathing room for text, and *zero* for images and code blocks so it hugs their border exactly. Arrow keys move an index; `scrollIntoView` keeps the active block near the top of the viewport.

> An earlier version stepped one *visual* line at a time using `Range.getClientRects()`, which returns one rectangle per wrapped line. Neat — but block-by-block turned out calmer to actually read.

## The one bug worth mentioning

With focus mode on there's a little control bar at the bottom of the screen — the line counter plus the previous / next / exit buttons. It kept coming out greyed, dimmed by the very shadow it was supposed to float above, even though its `z-index` (60) was higher than the scrim's (55). The catch: **`z-index` only ranks elements within the same stacking context.** The bar was rendered deep inside the article, in a context that itself sat *below* the body-level scrim, so its number was competing in the wrong league.

The fix is to move the bar out to `<body>` so it and the scrim are siblings. In Svelte that's a tiny action:

```js
function portal(node) {
  document.body.appendChild(node);
  return { destroy: () => node.remove() };
}
```

```svelte
<div use:portal class="... z-[60]">…</div>
```

`appendChild` *moves* the node rather than copying it, and Svelte keeps it fully reactive even after the move — so the live `1 / 12` counter and the buttons all keep working from their new home on `<body>`. Now `60 > 55` actually means something.

That's the whole thing: `getBoundingClientRect` to find the blocks, one absurd box-shadow to dim the rest, and a portal so the controls stay on top. It's on every post here — the **Focus** button is up in the byline. I built it because I needed it; turns out one box-shadow goes a long way.
