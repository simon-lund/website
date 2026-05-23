# Image Guide

Generate card images for the website using a consistent Ghibli-style aesthetic that matches the profile portrait.

## Style

All images should feel like they belong in the same world as the profile picture — hand-painted, warm, Studio Ghibli-inspired.

## Prompt template

Use this as a base prompt in ChatGPT, Midjourney, or similar:

```
Studio Ghibli style illustration, warm earth tones, soft sky, painterly,
no text, no people, 16:9 aspect ratio, [your subject here]
```

## By content type

### Writing (blog posts)
Illustrate the *feeling* of the topic, not the literal subject.

- Post about AI → a quiet workshop with glowing tools
- Post about design → an open notebook on a wooden desk with soft light
- Post about code → a cozy room with floating symbols and warm lamplight

### Work (projects)
Show the *environment* the project lives in.

- A productivity tool → a tidy desk overlooking green hills
- A developer tool → a treehouse workshop with instruments and screens
- An AI project → a library with books that glow faintly

### Links (curated reading)
Abstract or atmospheric — the image sets a mood, not a summary.

- A landscape with a path (discovery)
- A window with light streaming in (insight)
- Clouds and sky (perspective)

## Specs

- **Aspect ratio**: 16:9
- **Min resolution**: 800×450
- **Format**: JPG or WebP
- **File location**: `src/assets/` or `public/images/`
- **Usage**: Pass as `image` prop to LinkCard: `<LinkCard image="/images/my-image.jpg" ... />`

## Palette reference

Match these tones from the profile portrait:
- Sky blue: `#5b9ec9`
- Cloud white: `#e8ddd0`
- Grass green: `#6a9b4f`
- Warm skin: `#d4a574`
- Dark olive: `#3d4a2e`
- Warm brown: `#5c4a3a`

## Fallback

When no image is provided, the card shows a warm solid color derived from the title. This is intentionally minimal — add an image when you have one, don't force it.
