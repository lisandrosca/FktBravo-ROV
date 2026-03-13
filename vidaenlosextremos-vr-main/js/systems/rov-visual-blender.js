/* global THREE, ROV */

/**
 * ROV Visual Blender System v2.1
 * Auto-generates a silhouette mask from model geometry and applies it as an edge fade.
 * Uses two-pass vertex projection for guaranteed bounds/drawing consistency.
 */
ROV.blender = {

  /**
   * Generates a top-down silhouette mask from the model's actual geometry.
   * PASS 1: Collects all world-space XZ vertex positions to compute precise bounds.
   * PASS 2: Projects triangles onto canvas using those same bounds.
   *
   * @param {THREE.Object3D} mesh - The loaded GLTF model.
   * @param {number} resolution - Canvas resolution in pixels (default 512).
   * @param {number} blurPasses - Number of box-blur passes for edge softness (default 4).
   * @param {number} blurRadius - Pixel radius per blur pass (default 8).
   * @param {number} padding - Fraction of bounds to add as padding for fade space (default 0.15).
   * @returns {{ texture: THREE.CanvasTexture, bounds: Object }}
   */
  generateSilhouetteMask: function (mesh, resolution = 512, blurPasses = 4, blurRadius = 6, padding = 0.10) {
    // 1. Ensure world matrices are fully up-to-date
    mesh.updateWorldMatrix(true, true);

    // ========== PASS 1: Compute bounds from EXACT same vertices used for drawing ==========
    let wMinX = Infinity, wMaxX = -Infinity;
    let wMinZ = Infinity, wMaxZ = -Infinity;
    const tmpV = new THREE.Vector3();

    mesh.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      node.updateWorldMatrix(true, false);
      const posAttr = node.geometry.attributes.position;
      if (!posAttr) return;

      for (let i = 0; i < posAttr.count; i++) {
        tmpV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        tmpV.applyMatrix4(node.matrixWorld);
        if (tmpV.x < wMinX) wMinX = tmpV.x;
        if (tmpV.x > wMaxX) wMaxX = tmpV.x;
        if (tmpV.z < wMinZ) wMinZ = tmpV.z;
        if (tmpV.z > wMaxZ) wMaxZ = tmpV.z;
      }
    });

    // Add padding for fade space
    const rangeX = wMaxX - wMinX;
    const rangeZ = wMaxZ - wMinZ;
    const padX = rangeX * padding;
    const padZ = rangeZ * padding;

    const bounds = {
      minX: wMinX - padX,
      maxX: wMaxX + padX,
      minZ: wMinZ - padZ,
      maxZ: wMaxZ + padZ
    };

    const bWidth = bounds.maxX - bounds.minX;
    const bHeight = bounds.maxZ - bounds.minZ;

    // DEBUG
    console.log('[Blender] Vertex extents:', JSON.stringify({
      minX: wMinX.toFixed(2), maxX: wMaxX.toFixed(2),
      minZ: wMinZ.toFixed(2), maxZ: wMaxZ.toFixed(2),
      spanX: rangeX.toFixed(2), spanZ: rangeZ.toFixed(2)
    }));
    console.log('[Blender] Padded bounds:', JSON.stringify({
      minX: bounds.minX.toFixed(2), maxX: bounds.maxX.toFixed(2),
      minZ: bounds.minZ.toFixed(2), maxZ: bounds.maxZ.toFixed(2)
    }));

    // ========== PASS 2: Project and draw triangles ==========
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, resolution, resolution);
    ctx.fillStyle = '#ffffff';

    mesh.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;

      const worldMatrix = node.matrixWorld;
      const posAttr = node.geometry.attributes.position;
      if (!posAttr) return;

      const index = node.geometry.index;
      const v = new THREE.Vector3();

      // Project vertex to canvas pixel coords
      // Canvas Y=0 is top, texture V=0 is bottom → flip Y so they match
      const project = (vi) => {
        v.set(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi));
        v.applyMatrix4(worldMatrix);
        const px = ((v.x - bounds.minX) / bWidth) * resolution;
        const py = (1.0 - (v.z - bounds.minZ) / bHeight) * resolution; // V-FLIP
        return { x: px, y: py };
      };

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const a = project(index.getX(i));
          const b = project(index.getX(i + 1));
          const c = project(index.getX(i + 2));
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          const a = project(i);
          const b = project(i + 1);
          const c = project(i + 2);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // 3. Solidify interior (close sub-pixel gaps)
    const solidifyData = ctx.getImageData(0, 0, resolution, resolution);
    const pixels = solidifyData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const val = pixels[i] > 0 ? 255 : 0;
      pixels[i] = val;
      pixels[i + 1] = val;
      pixels[i + 2] = val;
      pixels[i + 3] = 255;
    }
    ctx.putImageData(solidifyData, 0, 0);

    // 4. Blur edges
    this._boxBlur(ctx, resolution, resolution, blurRadius, blurPasses);

    // 5. Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    console.log(`[Blender] Silhouette mask generated (${resolution}x${resolution})`);

    // DEBUG: Show mask canvas in corner (uncomment to re-enable)
    // canvas.style.cssText = 'position:fixed;bottom:10px;left:10px;width:256px;height:256px;z-index:99999999;border:3px solid red;image-rendering:pixelated;pointer-events:none;';
    // canvas.id = 'debug-mask-canvas';
    // const old = document.getElementById('debug-mask-canvas');
    // if (old) old.remove();
    // document.body.appendChild(canvas);

    // DEBUG: Draw wireframe at bounds in 3D scene (uncomment to re-enable)
    // this._debugDrawBounds(bounds);

    return { texture, bounds };
  },

  /**
   * Generates a terrain heightmap from the model's geometry.
   * For each XZ cell, stores the maximum Y value of any vertex projecting there.
   * Used for terrain-following floor collision in physics.
   *
   * @param {THREE.Object3D} mesh - The loaded GLTF model.
   * @param {number} resolution - Grid resolution (default 128 — smaller than mask, sufficient for collision).
   * @param {number} hoverOffset - Y offset above the terrain surface (default 0.15m).
   * @returns {{ data: Float32Array, resolution: number, bounds: Object, minY: number, maxY: number }}
   */
  generateHeightmap: function (mesh, resolution = 128, hoverOffset = 0.15) {
    mesh.updateWorldMatrix(true, true);

    // Compute XZ bounds and Y range from all vertices
    let wMinX = Infinity, wMaxX = -Infinity;
    let wMinZ = Infinity, wMaxZ = -Infinity;
    let wMinY = Infinity, wMaxY = -Infinity;
    const tmpV = new THREE.Vector3();

    mesh.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      node.updateWorldMatrix(true, false);
      const posAttr = node.geometry.attributes.position;
      if (!posAttr) return;

      for (let i = 0; i < posAttr.count; i++) {
        tmpV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        tmpV.applyMatrix4(node.matrixWorld);
        if (tmpV.x < wMinX) wMinX = tmpV.x;
        if (tmpV.x > wMaxX) wMaxX = tmpV.x;
        if (tmpV.y < wMinY) wMinY = tmpV.y;
        if (tmpV.y > wMaxY) wMaxY = tmpV.y;
        if (tmpV.z < wMinZ) wMinZ = tmpV.z;
        if (tmpV.z > wMaxZ) wMaxZ = tmpV.z;
      }
    });

    const bounds = { minX: wMinX, maxX: wMaxX, minZ: wMinZ, maxZ: wMaxZ };
    const bWidth = wMaxX - wMinX;
    const bHeight = wMaxZ - wMinZ;

    // Initialize heightmap with -Infinity (no terrain)
    const data = new Float32Array(resolution * resolution);
    data.fill(-Infinity);

    // Project vertices and store max Y per cell
    mesh.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      const posAttr = node.geometry.attributes.position;
      if (!posAttr) return;

      for (let i = 0; i < posAttr.count; i++) {
        tmpV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        tmpV.applyMatrix4(node.matrixWorld);

        const cx = Math.floor(((tmpV.x - wMinX) / bWidth) * (resolution - 1));
        const cz = Math.floor(((tmpV.z - wMinZ) / bHeight) * (resolution - 1));

        if (cx >= 0 && cx < resolution && cz >= 0 && cz < resolution) {
          const idx = cz * resolution + cx;
          if (tmpV.y > data[idx]) {
            data[idx] = tmpV.y;
          }
        }
      }
    });

    // Fill gaps: cells with no vertices get the global minimum Y
    for (let i = 0; i < data.length; i++) {
      if (data[i] === -Infinity) {
        data[i] = wMinY;
      }
      // Apply hover offset
      data[i] += hoverOffset;
    }

    console.log(`[Blender] Heightmap generated (${resolution}x${resolution}), Y range: ${wMinY.toFixed(2)} to ${wMaxY.toFixed(2)}`);

    return { data, resolution, bounds, minY: wMinY, maxY: wMaxY };
  },

  /**
   * DEBUG: Creates a visible wireframe rectangle in the 3D scene at the mask bounds.
   */
  _debugDrawBounds: function (bounds) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const old = document.getElementById('debug-bounds-wireframe');
    if (old) old.remove();

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;

    const el = document.createElement('a-entity');
    el.id = 'debug-bounds-wireframe';
    el.setAttribute('position', { x: centerX, y: 0, z: centerZ });
    el.setAttribute('geometry', { primitive: 'plane', width: width, height: depth });
    el.setAttribute('rotation', '-90 0 0');
    el.setAttribute('material', { color: 'red', wireframe: true, opacity: 1 });
    scene.appendChild(el);
    console.log(`[Blender] DEBUG wireframe at center (${centerX.toFixed(2)}, ${centerZ.toFixed(2)}), size ${width.toFixed(2)}x${depth.toFixed(2)}`);
  },

  /**
   * Applies the generated silhouette mask as an alpha fade to all model materials.
   */
  applyMaskFade: function (mesh, maskData) {
    if (!mesh || !maskData) return;

    const { texture, bounds } = maskData;

    mesh.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((mat) => {
        mat.transparent = true;
        mat.depthWrite = true;

        mat.onBeforeCompile = (shader) => {
          // 1. Uniforms
          shader.uniforms.uMaskTex = { value: texture };
          shader.uniforms.uBoundsMinX = { value: bounds.minX };
          shader.uniforms.uBoundsMaxX = { value: bounds.maxX };
          shader.uniforms.uBoundsMinZ = { value: bounds.minZ };
          shader.uniforms.uBoundsMaxZ = { value: bounds.maxZ };

          // 2. Vertex: pass world position to fragment
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             varying vec3 vWorldPos;`
          );

          shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
             vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
          );

          // 3. Fragment: sample mask and apply alpha
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             varying vec3 vWorldPos;
             uniform sampler2D uMaskTex;
             uniform float uBoundsMinX;
             uniform float uBoundsMaxX;
             uniform float uBoundsMinZ;
             uniform float uBoundsMaxZ;`
          );

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
             // Map world XZ position to mask UV [0,1]
             float maskU = (vWorldPos.x - uBoundsMinX) / (uBoundsMaxX - uBoundsMinX);
             float maskV = (vWorldPos.z - uBoundsMinZ) / (uBoundsMaxZ - uBoundsMinZ);
             vec2 maskUV = clamp(vec2(maskU, maskV), 0.0, 1.0);
             float maskAlpha = texture2D(uMaskTex, maskUV).r;
             maskAlpha = pow(maskAlpha, 5.0); // Steepen curve: center stays solid, edges drop fast
             gl_FragColor.a *= maskAlpha;`
          );
        };

        mat.needsUpdate = true;
      });
    });

    console.log('[Blender] Mask fade applied to model materials');
  },

  /**
   * Multi-pass box blur on canvas ImageData.
   * @private
   */
  _boxBlur: function (ctx, w, h, radius, passes) {
    for (let p = 0; p < passes; p++) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const src = imageData.data;
      const dst = new Uint8ClampedArray(src.length);

      // Horizontal pass
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0, count = 0;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < w) {
              sum += src[(y * w + nx) * 4];
              count++;
            }
          }
          dst[(y * w + x) * 4] = sum / count;
          dst[(y * w + x) * 4 + 1] = sum / count;
          dst[(y * w + x) * 4 + 2] = sum / count;
          dst[(y * w + x) * 4 + 3] = 255;
        }
      }

      // Vertical pass
      const dst2 = new Uint8ClampedArray(src.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0, count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            if (ny >= 0 && ny < h) {
              sum += dst[(ny * w + x) * 4];
              count++;
            }
          }
          dst2[(y * w + x) * 4] = sum / count;
          dst2[(y * w + x) * 4 + 1] = sum / count;
          dst2[(y * w + x) * 4 + 2] = sum / count;
          dst2[(y * w + x) * 4 + 3] = 255;
        }
      }

      ctx.putImageData(new ImageData(dst2, w, h), 0, 0);
    }
  }
};
