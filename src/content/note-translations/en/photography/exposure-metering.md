---
title: "1.2 Exposure and Metering"
description: "Understand aperture, shutter time, ISO, metering, exposure compensation, and histograms through constraints rather than fixed recipes."
translationOf: "photography/exposure-metering"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

## 1. What Exposure Means

Exposure describes how much light reaches the sensor during capture. How bright the final picture looks also depends on camera processing, raw conversion, and editing, so exposure and final rendered brightness are related but not identical concepts.

## 2. The Three Core Variables

### 2.1 Aperture

Aperture controls the size of the lens opening.

A lower f-number represents a larger opening:

- more light passes through per unit time;
- depth of field is usually shallower.

Aperture also affects diffraction, lens sharpness, and aberrations. There is no rule that every photograph should use either the widest or the smallest possible aperture.

### 2.2 Shutter Time

Shutter time controls how long light is collected.

- Short exposures are better at freezing motion.
- Long exposures record motion paths and are more vulnerable to camera movement.

The first question for shutter speed should be how motion is meant to appear.

### 2.3 ISO

In digital cameras, ISO is better understood as part of the camera's signal-gain and output-brightness calibration. Raising ISO **does not increase the number of photons the lens captures**.

With aperture and shutter time unchanged, a higher ISO makes the output brighter but also makes the limitations of a low-light exposure more visible. When motion must be frozen, raising ISO can be preferable to letting the shutter become too slow.

It is therefore too simplistic to say that “high ISO always causes bad image quality.” The amount of captured light, shutter requirement, and the camera's noise behavior all matter.

## 3. Stops and Equivalent Exposure Changes

One stop means doubling or halving the amount of light.

For example, all else equal:

- 1/250 s → 1/125 s collects about one stop more light;
- f/4 → f/5.6 passes about one stop less light.

Changing one variable and compensating with another can preserve a similar sensor exposure, but depth of field, motion rendering, and noise characteristics will not be identical.

## 4. Metering

Metering estimates scene brightness and provides a reference for automatic or semi-automatic exposure.

Common modes include:

- **Matrix / Evaluative metering**: analyzes a large part of the frame;
- **Center-weighted metering**: gives extra weight to the center;
- **Spot metering**: meters a very small region;
- some cameras also offer **highlight-weighted metering** to reduce highlight clipping.

Spot-meter size and algorithms vary by camera, so a percentage from one model should not be treated as a universal rule.

## 5. Exposure Compensation

Exposure compensation tells an automatic exposure system that you want an image brighter or darker than its metered recommendation.

“Add for white, subtract for black” is a useful way to understand reflective metering: a large snow field may be rendered too dark, while a mostly black scene may be rendered too bright. But it is only a starting heuristic.

The final decision should consider:

- creative intent;
- which highlights matter;
- raw-processing latitude;
- histograms and highlight warnings.

Do not assign a fixed positive EV to every white subject or a fixed negative EV to every black subject.

## 6. Exposure Modes

- **A / Av Aperture Priority**: you choose aperture, the camera chooses shutter time; useful when depth of field is the main constraint.
- **S / Tv Shutter Priority**: you choose shutter time, the camera chooses aperture; useful when motion is the main constraint.
- **M Manual Exposure**: you control aperture and shutter; with Auto ISO it can still adapt quickly to changing light.
- **P Program Auto**: the camera chooses an aperture/shutter combination while leaving many other controls available.

No mode is inherently more “professional.” The right mode is the one that gives fast control over the variable that matters most.

## 7. Histograms

A histogram describes brightness distribution: darker values are on the left and brighter values on the right.

It helps reveal:

- large areas of shadow clipping;
- important highlight clipping;
- whether the tonal distribution matches the intended image.

“A histogram should be pushed right without ever touching the edge” is not a universal law. The sun, bulbs, and specular reflections can reasonably clip. Whether faces, clouds, or architecture may clip depends on the photograph's purpose.

## References

- Nikon: *A Basic Look at the Basics of Exposure*
- Nikon Z5 Online Manual: *Metering*
