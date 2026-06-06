---
title: 'Clip-Path Theme Switcher'
description: 'A circular ripple that reveals the new theme, built on the View Transitions API. Not new — but it looks cool, and here is how I did it.'
pubDate: 'Jun 06 2026'
tags: ['Web', 'CSS']
---

Every site has a dark-mode toggle, and most of them just *flip*. The colours snap, or cross-fade if someone was feeling fancy. But there's a nicer move going around: the new theme **ripples out from the toggle button** in an expanding circle, like dropping a stone in a pond.

It's not new — people have been doing this since the [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) shipped. But it looks cool, it's a handful of lines, and it's the toggle in the corner of this very site. Here's a standalone version — hit the sun:

<iframe src="/demos/theme-switch.html" title="Clip-path theme switcher — live demo" loading="lazy" style="width:100%;height:360px;border:1px solid var(--color-stone-light);border-radius:0.6rem;"></iframe>

## The trick

The View Transitions API does the heavy lifting. When you call `document.startViewTransition`, the browser snapshots the current page, runs your callback (which changes the theme), snapshots the new page, and cross-fades between them.

We don't want the cross-fade — we want the new theme **revealed** by a growing circle. So: kill the default animation, and animate a `clip-path` circle on the new snapshot instead.

```js
toggle.addEventListener("click", (e) => {
  // origin = centre of the button, so the wave radiates from it
  const r = e.currentTarget.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  // radius that reaches the farthest corner of the viewport
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const t = document.startViewTransition(() => applyTheme());
  t.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${end}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 520,
        easing: "cubic-bezier(.4, 0, .2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
});
```

And the CSS that turns off the cross-fade so the circle is the only thing animating:

```css
::view-transition-old(root),
::view-transition-new(root) { animation: none; }

::view-transition-new(root) { z-index: 1; } /* new theme on top */
::view-transition-old(root) { z-index: 0; } /* old theme underneath */
```

That's the whole effect. The new theme sits on top, clipped to a zero-radius circle at the button, and we grow that circle until it covers the screen.

## The details that make it feel right

- **Origin from the button.** Anchoring the circle to the button's exact coordinates is what makes it feel like the toggle *caused* the wave, instead of a generic reveal from nowhere.
- **Reach the far corner.** `Math.hypot(Math.max(x, innerWidth - x), …)` gives the radius to the farthest corner, so the circle always finishes covering the viewport — no matter which corner the button is in.
- **Spin the icon.** Give the toggle its own `view-transition-name` and it gets its own snapshot, so it can rotate out and in *on top of* the ripple while everything else is being revealed underneath.
- **Respect reduced motion.** If `prefers-reduced-motion` is set — or the browser doesn't support View Transitions — skip all of it and switch instantly. Nobody asked for motion sickness.

```js
if (!document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches) {
  applyTheme();
  return;
}
```

## The one gotcha (if you're on a framework)

This site runs on Astro, which already uses View Transitions for page navigation. That bites you: Astro gives the persisted nav and the animated `<main>` their own snapshots, so during the theme ripple they'd cross-fade *separately* from the background — and the page fractures into pieces instead of rippling as one.

The fix is to fold them back into the root snapshot, just for the theme switch: temporarily set their `view-transition-name` to `none`, run the transition, then restore it.

```js
const named = document.querySelectorAll(
  '[data-astro-transition-persist],[data-astro-transition-scope]'
);
named.forEach((el) => (el.style.viewTransitionName = "none"));
// …run the transition…
t.finished.finally(() =>
  named.forEach((el) => (el.style.viewTransitionName = ""))
);
```

Now the whole page ripples together.

---

That's it. Like I said — not new. But every time I toggle the theme I smile a little, and that's worth fifteen lines.
