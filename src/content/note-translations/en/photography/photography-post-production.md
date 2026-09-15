---
title: "2.2 Photography: Post-Processing"
description: "Preserves the original post-processing note: Lightroom corrections, global tone, local edits, sharpening/noise reduction, output, and HDR merge."
translationOf: "photography/photography-post-production"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

> **Note:** This page preserves the original VNote file boundary, chapter order, and learning-record style. Before publication in 2026, only clear factual errors, stale wording, and local image references that cannot render on the public site were minimally corrected. Fixed parameter values are historical experiments, not universal recipes.

## 1.1. Lightroom Post-Processing

### 1.1.1. Initial Corrections

#### 1.1.1.1. Lens

Some distortions and rendering defects come from the lens itself.

Common problems:

1. **Pincushion distortion** — often more visible toward the telephoto end; straight lines bow inward.
2. **Barrel distortion** — often more visible toward the wide end; straight lines bow outward.
3. **Vignetting** — darkening near the edges/corners, often stronger at wide apertures.
4. **Chromatic aberration** — colored fringes, often green/purple, near high-contrast boundaries.

Solution:

Use the lens-correction tools/profile when appropriate.

##### 1.1.1.1.1. Dust Spots

Problem:

Dust on the sensor may create repeated spots.

Solution:

Use the healing/removal tool. Historically, `Q` was used as the shortcut in my workflow.

##### 1.1.1.1.2. Crop

Historically, `R` was used for Crop. Holding Shift can constrain proportions depending on Lightroom version and current tool behavior.

`Ctrl + Alt + R` was recorded as a crop reset shortcut in the original workflow.

Example ratio:

`1:1`

##### 1.1.1.1.3. Perspective / Geometry

This is the normal geometric distortion caused by viewpoint and camera orientation, not a lens optical defect.

Typical problems:

1. **Vertical perspective convergence** — when pointing the camera upward at a building, lower parts appear larger and upper parts smaller.
2. **Tilted horizon** — the camera was not level, so lines that should be horizontal are angled.

Solutions:

1. Automatic geometry correction.
2. Guided correction by drawing horizontal and vertical reference lines.

#### 1.1.1.2. Global Tone and Rendering

##### 1.1.1.2.1. Camera Profile

Camera Picture Controls directly affect JPEG and are stored with RAW previews/metadata, but the rendered look is not permanently baked into the RAW sensor data.

Lightroom may not reproduce Nikon's in-camera rendering exactly. Use a suitable Profile / camera-matching profile as the starting point when you want a look closer to the camera JPEG.

##### 1.1.1.2.2. Basic Panel

The histogram places darker tonal information toward the left and brighter tonal information toward the right.

###### 1.1.1.2.2.1. White Balance

White balance primarily changes color relationships and can indirectly alter perceived brightness of individual color channels.

RAW provides much more freedom to reinterpret white balance after capture. JPEG can also be corrected, but with less latitude.

Historically, `W` was used to activate the white-balance picker.

###### 1.1.1.2.2.2. Tone

These controls primarily affect brightness rather than hue.

The histogram runs from darkest to brightest. Highlight/shadow clipping indicators can help identify lost detail.

The Exposure control mainly changes overall brightness. Highlights, Shadows, Whites, and Blacks target different tonal regions, but their influence overlaps; they should not be understood as five completely independent zones.

There is no universal fixed-number recipe for an underexposed image. A practical checking order is:

1. Decide whether overall Exposure really needs to be raised.
2. Check whether important highlights are approaching clipping; reduce Highlights if needed.
3. Recover Shadows according to what the subject requires.
4. Use Whites and Blacks to establish appropriate white/black points.
5. Fine-tune contrast or Curves last.

Holding Alt/Option while dragging Whites/Blacks can help inspect clipping.

The historical note contained fixed values such as `+0.5 to +1.5`, `-30 to -80`, and `+30 to +80`; these should be treated only as records of past experimentation, not universal rules.

Additional notes:

1. **Exposure** — controls overall brightness, with a strong visual effect on midtones.
2. **Contrast** — increases or decreases separation between light and dark; the histogram does not follow one fixed movement formula.
3. **Clarity** — changes medium-scale local contrast, strengthening or softening texture. It is related to perceived sharpness but is not the same as conventional sharpening.

###### 1.1.1.2.2.3. Color

These controls primarily affect color rather than overall brightness.

1. Temperature: left cooler/bluer, right warmer/yellower.
2. Tint: left greener, right more magenta.
3. Saturation: overall color intensity.
4. Vibrance: a more selective saturation adjustment; useful when you want a less uniform change.

#### 1.1.1.3. Targeted Adjustments

##### 1.1.1.3.1. Curves

Curves can modify brightness in selected tonal ranges. Because tonal changes alter channel relationships and contrast, curves can also affect color appearance.

##### 1.1.1.3.2. HSL

HSL adjusts hue, saturation, and luminance by color range.

#### 1.1.1.4. Local Enhancement

Current Lightroom Classic organizes local editing under the **Masking** workflow.

Tools include:

##### 1.1.1.4.1. Brush

##### 1.1.1.4.2. Radial Gradient

##### 1.1.1.4.3. Linear Gradient

Modern masking also includes automatic/assisted selections such as Subject, Sky, Background, People, Objects, Landscape, and range masks, depending on the Lightroom version.

#### 1.1.1.5. Effects

1. Vignette.
2. Dehaze.
3. Grain.

#### 1.1.1.6. Sharpening and Noise Reduction

Sharpen only to restore or emphasize useful detail; avoid halos and false texture. Noise reduction trades noise for detail, so judge it at an appropriate zoom level and output size.

#### 1.1.1.7. Export

Export settings should match the target: web/social sharing, archival output, print, or further editing.

# 2. HDR Merge

### 1. Auto Align

Purpose:

Correct small shifts between exposure-bracketed frames, especially when shooting handheld.

When to use:

- Handheld: usually enable it.
- Tripod and perfectly stable: it can often be disabled to save processing time.
- If there was any small movement, leaving alignment enabled is safer.

### 2. Auto Settings

Purpose:

Apply a starting set of tonal adjustments to the merged image.

It is essentially an automatic starting point, not a required part of HDR merging.

Use it when you want a quick starting point; disable it if you prefer to begin from a more neutral merged file and tune the image yourself.

### 3. Deghost Amount

Purpose:

Reduce artifacts caused by moving content between exposures.

Typical sources:

- people;
- leaves moving in wind;
- water;
- clouds.

Static scenes often need no or only low deghosting. Increase it only when movement requires it, and inspect the result for local artifacts.

### 4. Show Deghost Overlay

Purpose:

Highlight the regions Lightroom is treating as moving/deghosted areas.

Use it while diagnosing the merge and deciding whether the deghost strength is too high.

### 5. Create Stack

Purpose:

Group the source images and merged result in the Lightroom catalog.

This is only an organizational feature. Whether you enable it depends on your catalog-management preference; it does not change HDR merge quality.
