// script.js (Corrected Version: Using Points without Point Size Manipulation)

// Retrieve CSS variables
const rootStyles = getComputedStyle(document.documentElement);

const ANIMATION_POSITION = new THREE.Vector3(
  parseFloat(rootStyles.getPropertyValue('--animation-position-x')),
  parseFloat(rootStyles.getPropertyValue('--animation-position-y')),
  parseFloat(rootStyles.getPropertyValue('--animation-position-z'))
);

const ANIMATION_SCALE = parseFloat(rootStyles.getPropertyValue('--animation-scale')) || 1;

const NUM_ORIGINS = parseInt(rootStyles.getPropertyValue('--num-origins')) || 6;

// Parse colors from CSS variables
const colorsString = rootStyles.getPropertyValue('--colors').replace(/\"/g, '').trim();
const colorsArray = colorsString.split(';').map(colorStr => {
  const rgb = colorStr.split(',').map(Number);
  return rgb.map(value => value / 255); // Normalize to [0,1]
});

// ==== Key Settings ====
const CANVAS_SIZE = 512;
const MOVEMENT_SPEED = 0.5;
const POINT_SIZE_BASE = 3.0; // Set a constant base point size
const ROTATION_SPEED = 0.005;
const WOBBLE_INTENSITY = 0.02;
const WOBBLE_SPEED = 0.001;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.getElementById('animation-canvas'),
  alpha: true // Enable transparency
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Transparent background

// Create gradient background
const gradientTexture = createGradientTexture();
scene.background = gradientTexture;

function createGradientTexture() {
  // Create a canvas that matches the window size
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const context = canvas.getContext('2d');

  // Create a vertical gradient that fills the entire window
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a1a');  // Darker at the top
  gradient.addColorStop(1, '#3a3a5a');  // Lighter at the bottom

  // Fill the canvas with the gradient
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);

  // Ensure the texture does not repeat
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

// Handle window resize to update the gradient dynamically
function updateGradientBackground() {
  const newTexture = createGradientTexture();
  scene.background = newTexture;
}

// Call updateGradientBackground on window resize
window.addEventListener('resize', updateGradientBackground);

// Render target for dynamic texture
const dynamicTexture = new THREE.WebGLRenderTarget(CANVAS_SIZE, CANVAS_SIZE);

const paletteScene = new THREE.Scene();
const paletteCamera = new THREE.OrthographicCamera(0, CANVAS_SIZE, CANVAS_SIZE, 0, -1, 1);

const origins = Array.from({ length: NUM_ORIGINS }, () => ({
  position: new THREE.Vector2(Math.random() * CANVAS_SIZE, Math.random() * CANVAS_SIZE),
  velocity: new THREE.Vector2(
    (Math.random() - 0.5) * MOVEMENT_SPEED * 10,
    (Math.random() - 0.5) * MOVEMENT_SPEED * 10
  )
}));

const paletteMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_colors: { value: colorsArray.map(c => new THREE.Vector3(...c)) },
    u_origins: { value: origins.map(o => o.position) }
  },
  fragmentShader: `
    uniform vec3 u_colors[${NUM_ORIGINS}];
    uniform vec2 u_origins[${NUM_ORIGINS}];
    void main() {
      vec2 uv = gl_FragCoord.xy / ${CANVAS_SIZE}.0;
      vec3 color = vec3(0.0);
      float totalWeight = 0.0;

      for (int i = 0; i < ${NUM_ORIGINS}; i++) {
        float dist = distance(uv, u_origins[i] / ${CANVAS_SIZE}.0);
        float weight = 1.0 / (dist + 0.001);
        totalWeight += weight;
        color += u_colors[i] * weight;
      }
      color /= totalWeight;
      gl_FragColor = vec4(color, 1.0);
    }
  `
});

const palettePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(CANVAS_SIZE, CANVAS_SIZE),
  paletteMaterial
);
palettePlane.position.set(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0);
paletteScene.add(palettePlane);

const container = new THREE.Group();
scene.add(container);

const modelGroup = new THREE.Group();
container.add(modelGroup);

const loader = new THREE.GLTFLoader();
loader.load('./brain_areas.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.computeBoundingBox();
      const boundingBox = child.geometry.boundingBox;

      const positions = child.geometry.attributes.position.array;
      const uvs = [];

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        const uvX = (x - boundingBox.min.x) / (boundingBox.max.x - boundingBox.min.x);
        const uvY = (y - boundingBox.min.y) / (boundingBox.max.y - boundingBox.min.y);
        uvs.push(uvX, uvY);
      }

      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      pointGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

      const pointMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_texture: { value: dynamicTexture.texture },
          u_pointSizeBase: { value: POINT_SIZE_BASE }
        },
        vertexShader: `
          precision mediump float;

          uniform sampler2D u_texture;
          uniform float u_pointSizeBase;
          varying vec3 vColor;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Set a constant point size
            gl_PointSize = u_pointSizeBase;

            // Sample the texture color
            vec3 color = texture2D(u_texture, uv).rgb;
            vColor = color;
          }
        `,
        fragmentShader: `
          precision mediump float;
          varying vec3 vColor;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) discard;

            gl_FragColor = vec4(vColor, 1.0);
          }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });

      const points = new THREE.Points(pointGeometry, pointMaterial);
      modelGroup.add(points);
    }
  });

  const box = new THREE.Box3().setFromObject(modelGroup);
  const center = box.getCenter(new THREE.Vector3());
  modelGroup.position.sub(center);

  container.position.copy(ANIMATION_POSITION);
  container.scale.set(ANIMATION_SCALE, ANIMATION_SCALE, ANIMATION_SCALE);
});

function updateOrigins() {
  origins.forEach(origin => {
    origin.position.add(origin.velocity);
    if (origin.position.x <= 0 || origin.position.x >= CANVAS_SIZE) origin.velocity.x *= -1;
    if (origin.position.y <= 0 || origin.position.y >= CANVAS_SIZE) origin.velocity.y *= -1;
  });
  paletteMaterial.uniforms.u_origins.value = origins.map(o => o.position);
}

function animate() {
  requestAnimationFrame(animate);
  updateOrigins();

  renderer.setRenderTarget(dynamicTexture);
  renderer.render(paletteScene, paletteCamera);
  renderer.setRenderTarget(null);

  modelGroup.rotation.y -= ROTATION_SPEED;
  modelGroup.rotation.x = Math.sin(Date.now() * WOBBLE_SPEED) * WOBBLE_INTENSITY;
  modelGroup.rotation.z = Math.cos(Date.now() * WOBBLE_SPEED) * WOBBLE_INTENSITY;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

