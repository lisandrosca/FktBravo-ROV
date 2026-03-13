# Pre-Baked Navigation Assets

## Status: Future Optimization
**Priority**: Low — runtime generation adds ~250ms to load time, negligible vs model download (2-5s).
**Trigger**: Implement when manual control over navigation boundaries is needed.

## Concept

The runtime-generated heightmap and silhouette mask can be exported as static image assets and loaded instead of computed. This saves ~250ms of load time and enables **manual editing** of navigation boundaries.

## Current Runtime Pipeline

```
Model loads → vertex traversal → generates:
  1. Silhouette mask (512x512 canvas → CanvasTexture) — used for edge fade
  2. Heightmap (512x512 Float32Array) — used for terrain-following floor
```

Both use the same two-pass vertex projection in `rov-visual-blender.js`.

## Pre-Baked Pipeline (Future)

### Export Phase (one-time per model)
1. Uncomment debug canvas in `rov-visual-blender.js` (lines ~148-157)
2. Load the habitat in browser
3. Right-click the debug canvas → "Save Image As" → `mask.png`
4. Export heightmap as grayscale PNG (add export button or console command)
5. Place files in `assets/models/{habitat}/`

### Load Phase (runtime)
```
dives.json has "mask_path" and "heightmap_path"?
  → YES: Load PNGs as textures (fast, ~50ms)
  → NO:  Generate at runtime (current behavior, ~250ms)
```

### Manual Editing Benefits
- **Paint no-go zones** onto the heightmap in Photoshop (invisible walls)
- **Smooth jagged collision** areas without changing the model
- **Artificially raise terrain** where the ROV shouldn't reach
- **Add visual-only boundaries** to the silhouette mask (custom fade shapes)

## File Structure
```
assets/models/whale-fall/
  ├── scene.gltf
  ├── textures/
  ├── mask.png          ← pre-baked silhouette mask (optional)
  └── heightmap.png     ← pre-baked terrain heightmap (optional)
```

## dives.json Schema Addition
```json
{
  "whale-fall": {
    "mask_path": "assets/models/whale-fall/mask.png",
    "heightmap_path": "assets/models/whale-fall/heightmap.png"
  }
}
```

## Implementation Notes
- Silhouette mask: standard RGBA PNG, only red channel used
- Heightmap: grayscale PNG, 0=lowest point (bbox.min.y), 255=highest (bbox.max.y)
- Both must store their bounds metadata (minX, maxX, minZ, maxZ) — embed in dives.json or as PNG metadata
- Fallback to runtime generation ensures new models work immediately without assets
