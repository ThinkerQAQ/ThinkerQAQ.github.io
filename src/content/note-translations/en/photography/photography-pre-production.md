---
title: "2.1 Photography: Shooting Workflow"
description: "Preserves the original pre-production note: camera setup, light, exposure, white balance, metering, focal length, composition, focus, and field practice."
translationOf: "photography/photography-pre-production"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

> **Note:** This page preserves the original VNote file boundary, chapter order, and learning-record style. Before publication in 2026, only clear factual errors, stale wording, and local image references that cannot render on the public site were minimally corrected. Fixed parameter values are historical experiments, not universal recipes.

## 1. Fresh, Light Portrait Style

### 1.1. What Is the Style?

A relatively simple color palette, lower saturation, and lower contrast, producing a quiet, comfortable, and calm feeling.

### 1.2. Suitable Scenes

Scenes with a relatively unified color palette, for example blue/cyan environments such as sea and sky, campuses, parks, woods, or grass.

### 1.3. Clothing

Keep colors relatively simple and coordinated with the environment.

## 2. Shooting Methodology

### 2.1. In-Camera JPEG / Picture Control

#### 2.1.1. Portraits

1. **Sharpness and clarity** both affect the visual impression of detail, but they are different controls. Sharpening mainly enhances fine edges; clarity mainly changes local contrast. Similar controls exist both in camera Picture Controls and in post-processing, so it is not accurate to say "sharpness is only capture-side and clarity is only post-processing." The numerical values below are historical style experiments rather than fixed recipes.

A simple check:

```text
1. Zoom to 100%.
2. Inspect fine structures such as eyelashes, window frames, or leaves.

If fine structures separate cleanly -> there is useful detail.
If edges have obvious halos -> sharpening/local contrast may be too strong.
If detail is simply mushy -> the source may be soft or out of focus.
```

2. **Contrast** controls brightness separation. A fresh/light portrait style often avoids excessive contrast, but the exact setting depends on the light, Picture Control, and planned post-processing.
3. **Saturation** controls color intensity. Landscape and portrait work do not have one universal saturation setting; judge skin, environmental color, and the intended expression.
4. **Hue** is Picture-Control-specific. It is not a universal rule that one direction always means "rosy" and the other "retro."
5. **White balance**: raising the camera Kelvin WB setting normally makes the rendered image warmer. Skin color also depends on Tint, illumination, and later editing.

A useful stylistic description is:

> Fresh/light portrait = softer detail + restrained contrast + bright tone + controlled color.

It is a style description, not a parameter formula.

Historical Nikon Z5 Picture Control experiments for this style:

- Quick Sharpening: -2
  - Sharpening: -1
  - Mid-range Sharpening: -2
  - Clarity: -1.5
- Contrast: -2
- Brightness: +1
- Saturation: +2
- Hue: -1

Another historical experiment:

- Quick Sharpening: -1
- Mid-range Sharpening: -1
- Sharpening: 0 or -0.5
- Clarity: -0.8
- Contrast: -1.8
- Brightness: +1
- Saturation: +1
- Hue: 0 or -1

These are records of experimentation, not recommended defaults.

##### 2.1.1.1. Full-Body Portrait

##### 2.1.1.2. Half-Body Portrait

##### 2.1.1.3. Headshot

### 2.2. Lighting Situations

#### 2.2.1. Front Light

The subject generally faces the main light. Low-angle light near sunrise or sunset is often softer, but front light is not limited to a specific time of day.

Typical characteristics:

1. The face/body receives relatively even light.
2. Form can look flatter.
3. It can fit a bright, low-contrast portrait style.

#### 2.2.2. Backlight

The subject faces away from the main light. Low-angle backlight often creates rim light and flare, but backlight is not restricted to a fixed time window.

Typical characteristics:

1. Rim light / glow.
2. Bright, airy results are possible when subject exposure is handled appropriately.

#### 2.2.3. Side Light

The main light comes from the subject's side, commonly around 45–90 degrees.

Characteristics:

1. Stronger three-dimensional modeling.
2. Often useful for moodier portraits.

#### 2.2.4. Top Light

The main light comes from above. Midday sun often approaches this geometry.

Characteristics:

1. It can create deep shadows in the eye sockets and under the nose. Portraits often benefit from changing position, moving into shade, or adding fill, but top light is not categorically unusable.

#### 2.2.5. Diffused Light

The light does not hit the subject as a hard direct beam—for example, overcast light or a large patch of shade under trees.

Characteristics:

1. Often soft and low contrast.
2. Useful for bright, gentle portrait styles.

### 2.3. Exposure Modes and the Exposure Triangle

#### 2.3.1. Aperture, Shutter Speed, and ISO

You can use aperture, shutter speed, and ISO to control physical exposure, motion rendering, depth of field, and output brightness. Exposure compensation is a bias applied to automatic/semi-automatic metering; it is not the same thing as M mode, and it is not the same thing as high-key/low-key styling.

##### Aperture

- Smaller f-number -> wider aperture.
- "Wide" and "small" aperture are relative descriptions rather than hard categories at f/2.8 or f/8.
- A lens does not always reach peak quality exactly two or three stops down from maximum aperture.
- Very small apertures can lose detail to diffraction.

Practical thinking:

1. Portrait background blur: start with a wider aperture if you want shallow depth of field.
2. Environmental portrait/documentary portrait: stop down enough to retain useful context.
3. Landscape/deep focus: choose aperture together with focus distance and diffraction; do not automatically use f/11.

##### Shutter Speed

"Slow" and "fast" depend on subject speed, focal length, stabilization, and the intended motion effect. There is no universal dividing line at 1/60 or 1/250.

A rough historical motion table:

| Subject | Possible starting shutter |
| --- | --- |
| Standing still | 1/60 |
| Small body movement | 1/125 |
| Walking | 1/200 |
| Running | 1/500 |

These are starting points, not guarantees.

A rough hand-holding rule is `1 / equivalent focal length`, but actual requirements change with pixel density, photographer stability, IBIS/lens stabilization, and subject motion.

Historical scene examples:

- Documentary/news-like people: around 1/125.
- Walking children: around 1/500.
- Sports/birds: around 1/1000.
- Very fast movement: sometimes 1/2000 or faster.
- Rain streaks: often 1/15–1/60 depending on desired streak length.
- Water blur, traffic trails, fireworks: exposure time depends on speed and the visual path you want; several seconds can be a starting point.

##### ISO

Historical starting ranges in the original note:

- Bright daylight / bright interiors: around ISO 100.
- Overcast, shade, average interiors: perhaps ISO 200–320.
- Dawn/dusk/night/dim interiors: perhaps ISO 640–800.
- If the scene is too dark, consider more light, flash, continuous light, a slower shutter, or a wider aperture before simply pushing ISO.

These values are not universal. Modern cameras differ greatly in sensor performance, and the required shutter/aperture usually matters more than keeping ISO at a specific number.

#### 2.3.2. Exposure Modes

1. When depth of field is the first priority, A mode is useful. ISO can be fixed or Auto ISO.
2. When motion rendering is the first priority, S mode is useful. ISO can also be fixed or automatic.
3. M mode is useful when you need fixed exposure parameters, stable lighting, flash, long exposures, or consistent exposure across a sequence. It is not reserved only for "extremely black or white" scenes.

### 2.4. White Balance for the Lighting Situation

1. **Source color temperature**
   - Higher-CCT sources usually look cooler/bluer.
2. **Camera Kelvin white-balance setting**
   - Raising the WB Kelvin number normally warms the rendered image.
3. **Relationship**
   - If the chosen WB matches the illuminant, neutral objects can look neutral.
   - Choosing a lower WB value than needed tends to make the rendered image cooler.
   - Choosing a higher WB value tends to make it warmer.

Auto white balance is a good starting point, but it estimates what should be neutral—it does not "turn every object white." Mixed light, stage lighting, or deliberate warm/cool looks may need manual WB or post-processing.

#### 2.4.1. Portraits

Historical style note: I once experimented with shifting white balance toward a cooler direction and a particular Tint offset. The direction and numeric value depend on the camera's coordinate system and the actual light; it is not a universal recipe.

### 2.5. Metering by Lighting Situation

1. Matrix/evaluative metering is a good default for most scenes.
2. Center-weighted metering is useful when you deliberately want the central area to have more weight.
3. Spot metering is useful when you know how bright a small area should be. Backlight does not automatically require spot metering.
4. Check exposure compensation, histogram, and highlight warnings.

### 2.6. Choosing Focal Length

- Wide focal lengths make it easier to include environmental context.
- Longer focal lengths narrow the field of view and usually require a farther camera position to keep the same subject size.
- Full-body, half-body, and close-up portraits do not have fixed focal lengths.
- "50 mm for round faces, 85 mm for pointed faces" is not a reliable rule. Facial perspective is primarily determined by camera-to-subject distance.

### 2.7. Composition

- High angle, eye level, and low angle can all work; choose based on proportions and background.
- First use camera position to choose perspective, then use focal length to choose field of view. Walking and zooming are not interchangeable.
- Burst shooting can help capture short-lived gestures.
- Headroom and foot placement should support movement, gaze, and visual balance rather than a mechanical "feet on the edge, space over the head" formula.

### 2.8. Focusing

Autofocus/tracking can often be used as the default.

Common causes of AF failure:

- The subject is closer than the lens minimum focus distance.
- The target has too little contrast.
- The AF system is not capable enough for the situation.
- The subject moves too fast or unpredictably.
- Light is too low.

Focus modes:

- **MF**
  - macro or precise fixed focus;
  - very low contrast or very low light when AF cannot lock.
  - Fast irregular motion is usually better handled by capable AF-C/subject detection rather than defaulting to MF.
- **AF**
  - Static subjects can start from AF-S with an appropriate AF-area mode.
  - Moving subjects usually use AF-C with dynamic, wide-area, auto-area, or subject-detection modes depending on the camera.

### 2.9. Exposure Compensation

1. Useful when the meter is misled by very bright or very dark scenes.
2. The histogram runs from dark tones on the left to bright tones on the right; height represents the amount of image data at a brightness range.
3. "Expose to the right" only makes sense when important highlights remain protected and you understand the post-processing goal. For ordinary shooting, expose for the subject and critical highlights first.

### 2.10. Blur and Depth Effects

#### Depth of Field

1. Increase subject-background distance when possible.
2. Move the camera closer to the subject when the resulting perspective is acceptable.
3. Use a wider aperture.
4. A longer focal length can help blur the background in many portrait compositions, but it also changes required shooting distance and communication with the subject.

#### Shutter / Motion

1. A faster shutter more easily freezes motion.
   - Flash sync speed is related to how focal-plane shutter curtains expose the sensor. Above the normal sync speed, the sensor is often not fully uncovered at one instant, so a conventional flash can illuminate only part of the frame. High-speed sync uses a different firing method.
2. A slower shutter records movement over time.
   - **Front-curtain sync:** the flash fires near the beginning of the exposure.
   - **Rear-curtain sync:** the flash fires near the end of the exposure, which can make motion trails appear behind the moving subject.

## 3. Field Practice

### 3.1. Flowers Against a Black Background

1. Use a sufficiently dark background such as a black umbrella.
2. Light the subject much more strongly than the background, with sunlight or flash.
3. Control exposure for the subject/background relationship. Spot metering and negative exposure compensation are optional tools, not mandatory steps.

**The key is luminance contrast.**

### 3.2. Photographing Rain Streaks

1. Backlight or side-backlight often makes rain streaks easier to see, though it is not the only possible direction.
2. Add or use existing light to separate the main subject.
3. If the scene looks too yellow/white, correct white balance as needed.
4. A slower shutter turns droplets into longer streaks; a faster shutter freezes shorter droplets. Aperture and ISO then follow the required exposure.

**Slow shutter vs. fast shutter is the creative control.**

### 3.3. Water-Drop Experiments

1. Macro depth of field is very shallow. You may need to stop down, adjust the focus plane, or use focus stacking. Do not treat "never use a wide aperture" as an absolute rule; diffraction and background rendering still matter.
2. Manual focus plus magnified live view can be useful for macro work.

**Macro often benefits from deliberate focus and enough depth of field.**

### Indoor Backlight

Spot metering can be one option, and manual focus can help when AF struggles, but neither is mandatory if the camera can meter and focus reliably.

### 3.4. Outdoor Front-Lit Portrait

Historical starting recipe:

1. Light
   - Main light: sunlight/front light.
   - Fill/secondary direction: side light.
2. Exposure mode
   - A mode.
   - Aperture: f/1.8.
   - Shutter: about 1/4000.
   - ISO: 100.
   - EV: about +1.
3. White balance: Auto.
4. Metering: matrix/evaluative.
5. Composition: side-seated pose.
6. Focus: autofocus.

The numbers above are records of one setup, not universal portrait settings.

#### 3.4.1. When the Light Is Harsh

1. Turn hard front light into diffused light by moving the subject toward open shade.
2. Use a translucent object such as an umbrella to soften or block direct light.
3. Use perforated clothing/hats or environmental objects to shape light.

### 3.5. Indoor Front-Lit Portrait

Historical starting recipe:

- Window/front light with some side direction.
- A mode.
- f/1.8, roughly 1/4000, ISO 100, about +1 EV in the original example.
- Auto WB, matrix metering, autofocus.

#### 3.5.1. Notes

##### 3.5.1.1. No Universal "Best Time"

Indoor window light can work throughout the day; direction and intensity change with the sun and the room.

##### 3.5.1.2. A Camera With Good High-ISO Performance Can Help

##### 3.5.1.3. Light-Colored Rooms Can Create a Brighter Look

##### 3.5.1.4. Overcast Days Can Also Work

Overcast window light is often softer, although lower in intensity. Adjust shutter, ISO, or fill light as needed.

##### 3.5.1.5. Window Direction Changes the Light

A south-facing window was part of the original example, but any orientation can work depending on time and weather.

##### 3.5.1.6. Curtains Can Soften the Light

##### 3.5.1.7. Moving the Subject Closer to the Window Increases Light

### 3.6. Outdoor Backlit Portrait

Historical starting recipe:

1. Main light: sun behind the subject.
2. A mode, f/1.8, about 1/2000, ISO 100, around +1 EV in the original example.
3. Auto WB.
4. Spot metering was used in the original example.
5. Side-seated composition.
6. Focus: put the critical focus on the eyes/eyelashes. Autofocus or manual focus can both work depending on light and AF performance.

#### 3.6.1. Notes

##### 3.6.1.1. Face Too Dark

Options:

- add exposure compensation if appropriate;
- meter for the face or use matrix/highlight-weighted metering depending on the camera and desired highlight protection;
- bracket/HDR only when the subject and scene allow it;
- add fill with a reflector, white page/wall, flash, or continuous light.

##### 3.6.1.2. AF Struggles in Backlight

- Shade the lens from direct flare if flare is reducing contrast.
- Switch to manual focus if autofocus cannot lock.
- Reposition slightly so the sun is not directly entering the lens.

##### 3.6.1.3. Light Is Too Harsh

- Move sideways to turn full backlight into more side-backlight.
- Change camera angle.
- Use nearby objects, books, foliage, or your hand as a flag.
- Find a darker background if you want stronger subject separation.

### 3.7. Indoor Backlit Portrait

Historical setup:

- Window behind the subject.
- A mode.
- f/1.8, roughly 1/250, ISO 100, around +1 EV in the original example.
- Auto WB.
- Matrix metering.
- Side-seated pose.
- Focus on the eyes/eyelashes or another critical facial feature; use AF or MF according to conditions.

#### 3.7.1. Notes

- Light-colored rooms can help create an airy look.
- Overcast days are usable and may produce softer window light.
- Window orientation changes direction/intensity but does not determine whether a portrait is possible.
- Curtains can diffuse the light.
- Move the subject closer to the window for more light.
- If the face is too dark, adjust exposure or add fill.
- If AF fails, reduce flare, choose a higher-contrast feature, or use manual focus.

### 3.8. Outdoor Diffused-Light Portrait

Historical recipe:

- Sun/sky as the main source with soft side direction.
- A mode.
- f/1.8, about 1/2000, ISO 100, +0.3 to +1 EV in the original example.
- Auto WB.
- Spot metering in the original setup.
- Autofocus.

Again, use the numbers as a record, not as fixed settings.

### 3.9. Low-Key Portrait

Historical idea:

1. Side light plus some backlight.
2. A mode.
3. Auto WB.
4. Spot metering in the original example.
5. Dark background/dark clothing.
6. Focus on the eyes or other critical facial detail.
7. Negative exposure compensation can help if the automatic meter makes the scene brighter than intended.

### 3.10. High-Key Portrait

Historical idea:

1. Front light with some side light.
2. A mode.
3. Auto WB.
4. Matrix/evaluative metering.
5. Bright background and clothing.
6. Focus on the eyes. Metering/exposure compensation, not focus placement, controls the high-key brightness.

### 3.11. Soft-Focus Portrait

1. Similar overall visual direction to high-key portraits.
2. Avoid excessive sharpening/clarity.
3. Diffusion filters or improvised diffusion can soften highlights, but watch flare and loss of contrast.

### 3.12. Night Portrait

Historical idea:

- Multiple point lights / backlights.
- Optional side fill.
- A mode or M mode depending on how stable the lighting is.
- Auto WB as a starting point.
- Choose metering and focusing based on the actual scene.

Historical Nikon starting point: a flatter Picture Control, Active D-Lighting off or adjusted as needed, tripod, and a longer exposure. Whether to disable these functions depends on RAW/JPEG workflow and contrast.

```text
if the subject is moving:
    choose a shutter fast enough for the motion
else:
    if using a tripod:
        use a low ISO
        choose aperture for the required depth of field
    else:
        protect the minimum hand-holdable shutter speed

choose aperture for the desired depth of field
if exposure is still insufficient:
    raise ISO as needed
```

### 3.13. Multiple-Exposure Portrait

The original note reserved this section for later study.

### 3.14. Making Legs Look Longer

1. Use a relatively low camera position when it supports the intended perspective; waist-to-knee height was the original practical range.
2. Keep feet near the lower frame edge and leave appropriate headroom, but judge the final proportions rather than following a fixed one-third formula.

Reference:
[这些显腿长的拍照技巧，让你"长高"10厘米！ - 知乎](https://zhuanlan.zhihu.com/p/62937435)

## 4. References

[Photography aperture tutorial - Bilibili](https://www.bilibili.com/video/BV1WV5kzyEis/?spm_id_from=333.1387.favlist.content.click&vd_source=79c9f80f56384444d88bfb3e4cf579df)
