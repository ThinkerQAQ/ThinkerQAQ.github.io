---
title: "1.1 Photography Fundamentals"
description: "Preserves the original Photography note structure: framing, exposure, focus/depth, motion, and composition."
translationOf: "photography/photography"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

> **Note:** This page preserves the original VNote file boundary, chapter order, and learning-record style. Before publication in 2026, only clear factual errors, stale wording, and local image references that cannot render on the public site were minimally corrected. Fixed parameter values are historical experiments, not universal recipes.

![](https://raw.githubusercontent.com/TDoct/images/master/1685458014_20230530224644829_1451.png =100x)

## 1. What Is Photography?

Photography is recording the scenes and moments that you reach, discover, and that move you.

## 2. How to Photograph

### 2.1. Framing

#### 2.1.1. What Is Framing?

What elements appear in the frame, and in what state they appear.

#### 2.1.2. How to Frame

Framing content, framing range, timing, and viewpoint.

##### 2.1.2.1. Framing Range

Choose what to include and what to exclude. Elements included in the frame should contribute to the subject as much as possible.

###### 2.1.2.1.1. Focal Length

Focal length is one of the parameters of a lens. With camera position and sensor format unchanged, it mainly determines angle of view and subject magnification.

A 70–200 mm lens covers focal lengths from 70 mm to 200 mm. Its zoom ratio is `200 / 70 ≈ 2.86×`.

A shorter focal length gives a wider field of view and renders objects smaller in the frame.
A longer focal length gives a narrower field of view and renders objects larger.

![](https://raw.githubusercontent.com/TDoct/images/master/1686466796_20230611145952412_19011.png)

###### 2.1.2.1.2. How to Adjust Focal Length

On a phone: see [Mobile Photography](/en/notes/photography/mobile-photography/).

##### 2.1.2.2. Viewpoint

Different viewpoints create different perspective relationships.

###### 2.1.2.2.1. Perspective

Perspective is the familiar "near objects look larger, distant objects look smaller" relationship.

Perspective is determined by camera position. When the camera is farther from the subject, relative size differences between foreground and background objects become smaller and space appears more compressed. When the camera is closer, near/far size differences become stronger.

In practice, photographers often use a longer focal length after moving farther away, or a wider lens after moving closer, in order to keep the subject at a similar size. That is why focal length is often mistakenly described as the cause of perspective.

###### 2.1.2.2.2. How to Adjust Perspective

First move the camera to choose the perspective. Then select a focal length that gives the framing you want. To strengthen near-large/far-small perspective, the key is moving closer.

##### 2.1.2.3. Timing

A good photograph may come from waiting. Burst shooting can help capture a short-lived moment.

### 2.2. Exposure

#### 2.2.1. What Is Exposure?

First, understand tonal rendering. Tone describes the distribution and visual impression of brightness in a photograph.

- High key: an overall bright image.
- Low key: an overall dark image.
- Mid key: neither especially bright nor especially dark.

More precisely, reflected-light metering estimates exposure from the light reflected by the scene. Camera meters work around a middle-brightness reference, but this should not be interpreted as "all real-world objects reflect 18% of light."

Exposure determines how much light reaches the sensor. The final tonal appearance also depends on the scene, in-camera rendering, and post-processing, so exposure and tone are not the same concept.

Reflective metering tends to map scene brightness toward a middle reference. Snow, white walls, and other bright/high-reflectance scenes therefore often need positive exposure compensation, while dark subjects or dark backgrounds may need negative compensation. "Add for white, subtract for black" is a useful metering heuristic, not a universal law.

##### 2.2.1.1. Metering

###### 2.2.1.1.1. What Is Metering?

Metering is the camera's way of measuring brightness in selected parts of the frame so that the exposure system has a reference.

Common metering modes include:

- Matrix/evaluative metering: evaluates much or all of the frame.
- Spot metering: measures a very small area. It is useful when you deliberately want a particular local region to fall at a known brightness. The exact spot size depends on the camera.

###### 2.2.1.1.2. How to Meter

A camera continuously meters while its exposure system is active.

On a phone: see [Mobile Photography](/en/notes/photography/mobile-photography/).

##### 2.2.1.2. Relationship Between Metering and Exposure

After metering, an automatic or semi-automatic exposure mode calculates some combination of aperture, shutter speed, and ISO. The photographer can then accept or bias that result to obtain the intended exposure.

#### 2.2.2. How to Control Exposure

##### 2.2.2.1. Exposure Parameters

A wider aperture admits light faster. A longer exposure time records more light. A higher ISO can make the output look brighter, but ISO does not increase the number of photons captured when aperture and shutter are unchanged.

###### 2.2.2.1.1. Aperture

`f/1.0`, `f/1.4`, and so on are f-numbers. A smaller f-number means a wider aperture.

Most phone camera modules use a fixed aperture, although some phones provide a mechanically variable aperture.

Aperture has two major effects:

1. It controls the rate at which light passes through the lens.
2. It affects depth of field and therefore how much foreground/background blur appears.

###### 2.2.2.1.2. Shutter Speed

Shutter speed is the exposure time, such as `1/1000 s` or `1/60 s`.

A faster shutter gives a shorter exposure and normally records less light.
A slower shutter gives a longer exposure and normally records more light.

###### 2.2.2.1.3. ISO

On a digital camera, ISO is better understood as signal gain/output brightness calibration. Raising ISO does not make the sensor collect more photons at the same aperture and shutter speed.

Higher ISO can make the rendered image brighter in low light, but usually leaves less exposure headroom and makes noise more visible. Choose it together with shutter speed, aperture, and the image quality you can accept.

###### 2.2.2.1.4. Reciprocity / Exposure Equivalence

![](https://raw.githubusercontent.com/TDoct/images/master/1685802966_20230603223542491_19053.png)

For equivalent rendered brightness, aperture, shutter speed, and ISO can compensate for one another in "stops." However, physical exposure is primarily set by aperture and shutter time; ISO changes signal amplification/output brightness.

Even when final brightness is similar, depth of field, motion blur, and noise can be very different.

##### 2.2.2.2. Exposure Modes

###### 2.2.2.2.1. M Mode

Manual mode. You set aperture, shutter speed, and ISO yourself. It is flexible but requires more decisions. Typical uses include:

- scenes with stable lighting;
- very dark scenes or long exposures;
- flash photography;
- sequences where exposure should remain fixed.

###### 2.2.2.2.2. A Mode

Aperture-priority mode. You choose the aperture and the camera calculates shutter speed. ISO can be fixed or set to Auto ISO. Exposure compensation tells the automatic system that you want a brighter or darker result.

It is useful when depth of field is the main priority, for example portraits or landscapes.

###### 2.2.2.2.3. S Mode

Shutter-priority mode. You choose shutter speed and the camera calculates aperture. ISO can be fixed or automatic.

It is useful when motion rendering is the priority.

###### 2.2.2.2.4. Auto Mode

The camera controls most exposure parameters automatically. It is useful when learning or when speed is more important than manual control.

###### 2.2.2.2.5. P Mode

Program auto. The camera chooses an aperture/shutter combination, while you can still influence brightness with exposure compensation and, on many cameras, program shift.

##### 2.2.2.3. How Much Exposure Compensation?

`0 EV` is a reasonable starting point. When large white or black areas mislead the meter, try positive or negative compensation and judge the result with the histogram, highlight warning, and the tone you actually want.

###### 2.2.2.3.1. Subjective Appearance

###### 2.2.2.3.2. Histogram

##### 2.2.2.4. Light

###### 2.2.2.4.1. Categories of Light

- Natural light: sunlight, skylight, and other naturally occurring outdoor light.
- Ambient/practical light: light already present in the environment.
- Added/artificial light: light placed or controlled by the photographer, such as flashes or continuous lights.

Light differs in intensity, direction, softness, and color.

###### 2.2.2.4.2. Light Intensity

The brightness of the light, affected by source power, distance, modifiers, and the propagation environment.

It affects exposure.

###### 2.2.2.4.3. Light Direction

Common directions include:

- Front light — the light comes from the front of the subject. It can work well for landscapes and can make portraits look flatter.
![](https://raw.githubusercontent.com/TDoct/images/master/1686317192_20230609212523712_20525.png =100x)

- Side light — the light comes from the side, often around 45 degrees. It can make form look more three-dimensional.
![](https://raw.githubusercontent.com/TDoct/images/master/1686317196_20230609212610098_10375.png =100x)

- Top light — the light comes mainly from above.
![](https://raw.githubusercontent.com/TDoct/images/master/1686317197_20230609212629190_28286.png =100x)

- Backlight — the light is behind the subject. It can create rim light, translucent texture, flare, and high contrast. Whether to add fill or change exposure depends on the subject and dynamic range.
![](https://raw.githubusercontent.com/TDoct/images/master/1686317193_20230609212532012_12213.png =100x)

- Bottom light.
![](https://raw.githubusercontent.com/TDoct/images/master/1686317195_20230609212555333_1849.png =100x)

###### 2.2.2.4.4. Color Temperature

Physical correlated color temperature is usually described in Kelvin: a higher-CCT light source tends to look bluer, while a lower-CCT source tends to look warmer/redder.

White balance compensates for the color of the illuminant so that neutral objects can remain neutral.

Do not confuse source color temperature with the camera's Kelvin white-balance control: increasing the Kelvin WB setting normally makes the rendered image warmer because the camera is compensating for a cooler assumed light source.

Auto white balance is a useful default, especially with RAW, because white balance can be refined later.

##### 2.2.2.5. Adjusting Exposure

On a phone, normal camera mode commonly provides an exposure slider after tapping the screen. Pro/manual modes often expose a dedicated EV control.

### 2.3. Sharpness and Blur

#### 2.3.1. What Does "Sharp vs. Blurred" Mean?

Which elements are rendered sharply and which are blurred.

##### 2.3.1.1. Focus

###### 2.3.1.1.1. What Is Sharp After Focusing?

1. The intended focus point.
2. The focal plane.
3. Areas inside the acceptable depth of field.

A small depth of field is called shallow depth of field; a large one is deep depth of field.

###### 2.3.1.1.2. Why Can Focus Fail?

1. The subject is outside the lens/camera focus range.
2. The target has too little contrast.
3. The subject moves faster or less predictably than the AF system can follow.
4. Light may be too low for the AF system.

###### 2.3.1.1.3. Focus Modes

Two broad families:

1. Manual focus (MF).
2. Autofocus, commonly including AF-S (single AF) and AF-C (continuous AF).

Autofocus also uses AF-area modes such as single point, dynamic/expanded area, wide area, or auto area. Which area modes can be combined with AF-S or AF-C depends on the specific camera; they should not be treated as universally tied to one focus mode.

#### 2.3.2. Using Depth of Field

##### 2.3.2.1. Blurring the Background

Keep the subject inside the depth of field and the background outside it.

Common levers include:

###### 2.3.2.1.1. Move the Background Farther Away

The farther the background is from the subject, the easier it is to blur.

###### 2.3.2.1.2. Move the Camera Closer

Moving closer to the subject reduces depth of field, although it also changes perspective and framing.

###### 2.3.2.1.3. Use a Wider Aperture

A wider aperture reduces depth of field.

###### 2.3.2.1.4. Use a Longer Focal Length

A longer focal length can help produce a blurred background, especially when the final composition and subject distance are considered together. In practice, longer lenses often require more photographer-subject distance, which also changes perspective.

##### 2.3.2.2. Keeping Near and Far Areas Sharp

Use enough depth of field to include both the subject and background.

###### 2.3.2.2.1. Stop Down

Use a smaller aperture when appropriate, while watching diffraction.

###### 2.3.2.2.2. Use an Appropriate Focal Length and Focus Distance

A shorter focal length and/or a farther focus distance can make deep depth of field easier, but the final framing still matters.

#### 2.3.3. Shutter and Motion

A fast shutter records a shorter slice of time and tends to freeze motion.
A slow shutter records motion over a longer interval and can deliberately create blur.

##### 2.3.3.1. Static Subject, Moving Background

Use a long exposure with a stable camera/tripod. The static subject can remain sharp while moving elements blur.

##### 2.3.3.2. Moving Subject, Background Becomes Blurred

Use a relatively slow shutter and move the camera with the subject during the exposure (panning). The subject can remain relatively sharp while the background becomes directionally blurred.

### 2.4. Composition

#### 2.4.1. What Is Composition?

Composition determines where visual elements are placed and how they relate inside the frame.

#### 2.4.2. How to Compose

##### 2.4.2.1. Horizontal vs. Vertical Orientation

Horizontal framing makes it easier to express width and lateral space. It is common for large landscapes, street scenes, and documentary/humanistic subjects, but it is not a fixed rule.

Vertical framing more naturally emphasizes height, depth, and vertical relationships.

##### 2.4.2.2. Composition Patterns

###### 2.4.2.2.1. Centered Composition

Useful when:

1. the subject occupies a large portion of the frame;
2. the scene is strongly symmetrical.

###### 2.4.2.2.2. Rule of Thirds

![](https://raw.githubusercontent.com/TDoct/images/master/1685882567_20230604204243605_8730.png)

The four intersections can be used as visual anchor points. The horizontal and vertical third-lines are useful references for major structural lines.

For a horizon, place it according to whether the sky or ground carries more visual information. For a subject facing sideways, leaving more space in the direction of gaze or movement is a common starting point.

###### 2.4.2.2.3. Repetition

Repeat a simple element so that the pattern itself becomes part of the composition.

###### 2.4.2.2.4. Triangular Composition

Arrange subjects or lines so that they form a triangle.

## References

[新摄影笔记 (Douban)](https://book.douban.com/subject/35567282/)
