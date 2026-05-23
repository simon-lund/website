# Image Guide

Card images for the website. The goal is visual cohesion with the Ghibli profile portrait and ASCII art aesthetic.

## Palette reference

Match these tones from the profile portrait:
- Sky blue: `#5b9ec9`
- Cloud white: `#e8ddd0`
- Grass green: `#6a9b4f`
- Warm skin: `#d4a574`
- Dark olive: `#3d4a2e`
- Warm brown: `#5c4a3a`

## Specs

- **Aspect ratio**: 3:1 (wide banner)
- **Min resolution**: 900×300
- **Format**: JPG or WebP
- **Location**: `src/assets/` or `public/images/`
- **Usage**: `<LinkCard image="/images/my-image.jpg" ... />`

## Style variants

### 1. Watercolor wash (default)

Abstract color bleeds, no defined shapes. Soft, warm, works for anything.

```
Prompt: abstract watercolor wash, warm earth tones, soft edges,
no text, no objects, 3:1 banner aspect ratio,
colors: olive green, sky blue, warm brown, aged paper white
```

Good for: blog posts, links, anything without a specific visual subject.

### 2. Pixel art scenes

16-bit retro style, bridges the ASCII portrait aesthetic. Specific objects or landscapes.

```
Prompt: 16-bit pixel art, [subject], warm muted palette,
Studio Ghibli colors, dark background, 3:1 banner,
no text, clean pixels, retro game aesthetic
```

Good for: project posts, technical writing, work entries.

Examples:
- AI post → pixel art neural network or glowing terminal
- Design post → pixel art desk with tools and warm lamp
- Code post → pixel art IDE or editor in a cozy room

### 3. Ghibli illustration

Hand-painted landscapes or objects in the same style as the profile portrait.

```
Prompt: Studio Ghibli style illustration, warm earth tones, soft sky,
painterly, no text, no people, 3:1 banner aspect ratio, [subject]
```

Good for: longer essays, featured posts, anything personal.

### 4. Ink sketch

Simple line drawings with slight warmth. Minimal, editorial.

```
Prompt: simple ink line drawing, [subject], minimal detail,
warm off-white background, single fine line weight,
no shading, no color, 3:1 banner, sketch style
```

Good for: notes, shorter posts, links with commentary.

### 5. Halftone / risograph

Dotted texture, limited color palette. Print-aesthetic, editorial.

```
Prompt: risograph print style, [subject], halftone dots,
two-color (warm brown and teal), textured paper background,
3:1 banner, no text, vintage print aesthetic
```

Good for: curated links, reading lists, bookmarks.

### 6. Film grain photography

Real photos processed to feel analog. Warm-toned, slightly faded.

```
Prompt: analog film photograph, [subject], warm tones,
slight grain, soft focus, golden hour light,
3:1 banner, nostalgic, no text
```

Good for: personal posts, travel, non-technical writing.

## Consistency tips

- Avoid pure white or pure black — always warm
- No gradients or corporate stock imagery
- Dark mode: images with darker backgrounds work better (pixel art, watercolor on dark paper)
- When in doubt, use a watercolor wash — it never clashes
- One style per page is fine. Mixing within a page is fine too — the warm palette holds it together.

## Fallback

When no image is provided, the card shows a warm solid color (`bg-cream-dark`) that adapts to dark mode automatically.
