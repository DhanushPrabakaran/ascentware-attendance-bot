---


name: Ascentware Design 


colors:


  surface: '#00161f'


  surface-dim: '#00161f'


  surface-bright: '#243c47'


  surface-container-lowest: '#001018'


  surface-container-low: '#031e28'


  surface-container: '#08222d'


  surface-container-high: '#142d37'


  surface-container-highest: '#1f3843'


  on-surface: '#cce6f4'


  on-surface-variant: '#bdc8cf'


  inverse-surface: '#cce6f4'


  inverse-on-surface: '#1b333e'


  outline: '#879299'


  outline-variant: '#3e484e'


  surface-tint: '#6dd2ff'


  primary: '#6dd2ff'


  on-primary: '#003547'


  primary-container: '#2bb3e4'


  on-primary-container: '#004157'


  inverse-primary: '#006686'


  secondary: '#c6c6c7'


  on-secondary: '#2f3131'


  secondary-container: '#454747'


  on-secondary-container: '#b4b5b5'


  tertiary: '#97ceee'


  on-tertiary: '#003549'


  tertiary-container: '#77aecd'


  on-tertiary-container: '#004159'


  error: '#ffb4ab'


  on-error: '#690005'


  error-container: '#93000a'


  on-error-container: '#ffdad6'


  primary-fixed: '#bfe8ff'


  primary-fixed-dim: '#6dd2ff'


  on-primary-fixed: '#001f2a'


  on-primary-fixed-variant: '#004d65'


  secondary-fixed: '#e2e2e2'


  secondary-fixed-dim: '#c6c6c7'


  on-secondary-fixed: '#1a1c1c'


  on-secondary-fixed-variant: '#454747'


  tertiary-fixed: '#c3e8ff'


  tertiary-fixed-dim: '#97ceee'


  on-tertiary-fixed: '#001e2c'


  on-tertiary-fixed-variant: '#034c67'


  background: '#00161f'


  on-background: '#cce6f4'


  surface-variant: '#1f3843'


typography:


  headline-lg:


    fontFamily: Manrope


    fontSize: 40px


    fontWeight: '700'


    lineHeight: 48px


    letterSpacing: -0.02em


  headline-lg-mobile:


    fontFamily: Manrope


    fontSize: 30px


    fontWeight: '700'


    lineHeight: 36px


    letterSpacing: -0.02em


  headline-md:


    fontFamily: Manrope


    fontSize: 24px


    fontWeight: '600'


    lineHeight: 32px


    letterSpacing: -0.01em


  body-lg:


    fontFamily: Manrope


    fontSize: 18px


    fontWeight: '400'


    lineHeight: 28px


  body-md:


    fontFamily: Manrope


    fontSize: 16px


    fontWeight: '400'


    lineHeight: 24px


  label-md:


    fontFamily: Manrope


    fontSize: 14px


    fontWeight: '600'


    lineHeight: 20px


    letterSpacing: 0.01em


  label-sm:


    fontFamily: Manrope


    fontSize: 12px


    fontWeight: '500'


    lineHeight: 16px


    letterSpacing: 0.05em


rounded:


  sm: 0.125rem


  DEFAULT: 0.25rem


  md: 0.375rem


  lg: 0.5rem


  xl: 0.75rem


  full: 9999px


spacing:


  unit: 4px


  gutter: 24px


  margin-desktop: 64px


  margin-mobile: 16px


  container-max: 1200px


---
 
## Brand & Style
 
This design system adopts a specialized **High-Contrast Dark Mode** centered around a vibrant, architectural blue. The brand personality is precise, technical, and high-energy, designed for professionals who require a focused environment that feels both cutting-edge and structurally sound.
 
The aesthetic blends **Minimalism** with a **Technological Glow**. By using a primary surface color of #2BB3E4, the UI moves away from traditional neutral dark modes into a branded, immersive space. The emotional response should be one of clarity and digital sophistication, utilizing intense saturation to highlight structural importance while maintaining extreme legibility through high-contrast typography.
 
## Colors
 
The palette is anchored by the primary surface color, creating a "Luminous Dark" environment.
 
- **Primary (#2BB3E4):** Used as the foundational background for large surface areas and active states.


- **Secondary (#FFFFFF):** Reserved for primary text and high-priority iconography to ensure maximum contrast against the blue.


- **Tertiary (#004B66):** A deep, "Midnight Azure" used for inset containers, secondary navigation backgrounds, and subtle depth.


- **Neutral (#001A24):** A near-black blue used for heavy borders and deep shadows to provide grounding for the vibrant primary surfaces.
 
Text contrast is strictly managed: use pure white for primary content and a 70% opacity white for secondary metadata to maintain hierarchy without introducing muddy greys.
 
## Typography
 
The typography system utilizes **Manrope** to maintain an "Architectural Light" feel. The typeface’s geometric yet modern construction complements the vibrant blue surfaces.
 
Tight letter spacing is applied to headlines to maintain a compact, technical appearance. Because the background is a high-luminance blue, font weights are slightly increased (semi-bold instead of medium) to prevent "thinning" of white text against the saturated background. Headlines should always be White (#FFFFFF) to punch through the primary surface color.
 
## Layout & Spacing
 
This design system uses a **Fixed Grid** philosophy with a minimalist, airy rhythm. The layout is structured on a strict 4px base unit to ensure alignment and technical precision.
 
- **Desktop:** 12-column grid with 24px gutters. Wide margins (64px) focus the content in the center of the luminous screen.


- **Mobile:** 4-column fluid grid with 16px gutters and margins. 


- **Rhythm:** Use generous vertical padding (80px+) between major sections to allow the #2BB3E4 surface to "breathe," preventing the vibrant color from feeling claustrophobic.
 
## Elevation & Depth
 
Depth is achieved through **Tonal Inversion** rather than standard shadows. Because the primary background is already light/vibrant (#2BB3E4), traditional shadows can appear dirty.
 
1.  **Recessed Layers:** Use the Tertiary color (#004B66) for inputs and wells to create a "punched-out" effect from the main surface.


2.  **Raised Layers:** Use pure White (#FFFFFF) with 0.1 opacity for elevated cards, creating a subtle "glass" overlay that lightens the blue underneath.


3.  **Outlines:** Instead of shadows, use 1px solid borders in White at 0.2 opacity to define element boundaries. This maintains the "Architectural" aesthetic without adding visual weight.
 
## Shapes
 
The shape language is **Soft (0.25rem)**. This subtle rounding provides a modern, engineered feel that is more approachable than sharp corners but more professional than pill shapes.
 
Large containers use `rounded-lg` (0.5rem) to provide a clear structural container against the high-contrast background. Buttons and input fields use the base 4px (0.25rem) radius to maintain a crisp, precise profile.
 
## Components
 
- **Buttons:** Primary buttons are Solid White (#FFFFFF) with Bold Blue text (#004B66). Secondary buttons use a White ghost border (1px, 40% opacity) with White text.


- **Input Fields:** Recessed backgrounds using the Tertiary blue (#004B66). Borders should be a subtle Darker Blue (#001A24) that turns White on focus.


- **Cards:** Use a semi-transparent White fill (10% opacity) with a 1px White border (20% opacity). This creates a "Frosted Azure" look.


- **Chips:** Small, high-contrast badges using White text on the Deep Neutral (#001A24) background to act as focal points.


- **Lists:** Separated by thin, low-opacity White lines (10% opacity). Hover states should subtly brighten the background blue rather than changing the color entirely.


- **Checkboxes/Radios:** Pure White when active, with a deep navy checkmark to ensure visibility against the primary blue background.
 