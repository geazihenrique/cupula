import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js?module";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js?module";

const EDGE = 0x4c1d95;
const HIGHLIGHT = 0xc4b5fd;
const ENGRAVE = 0x4c1d95;
const TONES = {
  Base: 0x7c3aed,
  Frente: 0x8b5cf6,
  Fundo: 0xa78bfa,
  "Lateral esquerda": 0x6d28d9,
  "Lateral direita": 0x7e22ce,
  Tampa: 0xc4b5fd,
};
const textureCache = new Map();

function getTextTexture(content, variant = "dimension") {
  const key = `${variant}:${JSON.stringify(content)}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const canvas = document.createElement("canvas");
  const isGuide = variant === "guide";
  const isBrand = variant === "brand";
  const isPiece = variant === "piece";
  canvas.width = isGuide ? 1024 : 2048;
  canvas.height = isGuide ? 256 : 1024;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#4c1d95";
  context.font = "600 24px Arial, sans-serif";
  context.imageSmoothingEnabled = true;

  const drawText = (text, size, weight, alpha, y) => {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    context.fillStyle = `rgba(59, 7, 100, ${alpha})`;
    context.fillText(text, canvas.width / 2, y);
  };

  if (isBrand) {
    drawText(Array.isArray(content) ? content[0] : content, 240, 800, 0.92, canvas.height / 2);
  } else if (isPiece) {
    const [title, dimensions] = Array.isArray(content) ? content : [content, ""];
    drawText(title, 168, 800, 0.96, canvas.height * 0.39);
    drawText(dimensions, 100, 700, 0.84, canvas.height * 0.66);
  } else {
    drawText(Array.isArray(content) ? content[0] : content, 88, 650, 0.8, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function createEngravedPlane(text, width, height, variant = "dimension") {
  const material = new THREE.MeshBasicMaterial({
    map: getTextTexture(text, variant),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: variant === "brand" ? 0.9 : variant === "piece" ? 0.88 : 0.82,
    color: 0xffffff,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  plane.renderOrder = variant === "guide" ? 10 : variant === "brand" ? 8 : 6;
  return plane;
}

function createGuideLabel(text) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getTextTexture(text, "guide"),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.88,
      color: 0xffffff,
      toneMapped: false,
    })
  );
  sprite.scale.set(46, 13, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createDimensionLine(start, end, text, labelPosition) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ]);

  const halo = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.28 })
  );
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.96 })
  );

  const group = new THREE.Group();
  group.add(halo, line);
  const label = createGuideLabel(text);
  label.position.set(...labelPosition);
  group.add(label);
  return group;
}

function createPanel(width, height, depth, label) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshPhysicalMaterial({
    color: TONES[label] || 0x7c3aed,
    transparent: true,
    opacity: 0.54,
    transmission: 0.66,
    roughness: 0.08,
    thickness: 1.6,
    clearcoat: 0.95,
    clearcoatRoughness: 0.04,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.label = label;
  mesh.userData.baseColor = TONES[label] || 0x7c3aed;

  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgesGlow = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.36 })
  );
  edgesGlow.scale.setScalar(1.004);
  const edges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 1 })
  );
  edgesGlow.renderOrder = 1;
  edges.renderOrder = 2;
  mesh.add(edgesGlow, edges);

  return mesh;
}

function addWordmarkToFront(mesh, panelWidth, panelHeight, panelDepth) {
  const baseHeight = Math.min(panelWidth, panelHeight) * 0.13;
  const wordmarkWidth = Math.min(panelWidth * 0.48, baseHeight * 4.8);
  const wordmark = createEngravedPlane("Arcode", wordmarkWidth, baseHeight, "brand");
  wordmark.position.set(0, panelHeight * 0.12, (panelDepth / 2) + 0.74);
  mesh.add(wordmark);
}

function createDimensionText(valueA, valueB) {
  return `${Math.round(valueA)} × ${Math.round(valueB)} mm`;
}

function addPieceDimension(mesh, text, surfaceWidth, surfaceHeight, side, depth) {
  const title = mesh.userData.label || "";
  const labelHeight = Math.min(surfaceWidth, surfaceHeight) * 0.18;
  const labelWidth = Math.min(surfaceWidth * 0.82, Math.max(labelHeight * 6.2, surfaceWidth * 0.46));
  const label = createEngravedPlane([title, text], labelWidth, labelHeight, "piece");
  const verticalOffset = -surfaceHeight * 0.16;
  const inset = 0.7;

  if (side === "front") {
    label.position.set(0, verticalOffset, (depth / 2) + inset);
  } else if (side === "back") {
    label.rotation.y = Math.PI;
    label.position.set(0, verticalOffset, -(depth / 2) - inset);
  } else if (side === "left") {
    label.rotation.y = -Math.PI / 2;
    label.position.set(-(depth / 2) - inset, verticalOffset, 0);
  } else if (side === "right") {
    label.rotation.y = Math.PI / 2;
    label.position.set((depth / 2) + inset, verticalOffset, 0);
  } else if (side === "top") {
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, (depth / 2) + inset, verticalOffset);
  }

  label.renderOrder = 7;
  mesh.add(label);
}

function buildPieceMap(calculo) {
  const { medidasExternas, configuracao, alturaParede } = calculo;
  const espessura = configuracao.espessura;
  const fechada = configuracao.tipoCupula === "fechada";
  const lateraisPorDentro = configuracao.tipoMontagem === "dentro";
  const larguraFrenteFundo = lateraisPorDentro
    ? medidasExternas.largura
    : medidasExternas.largura - (2 * espessura);
  const profundidadeLaterais = lateraisPorDentro
    ? medidasExternas.profundidade - (2 * espessura)
    : medidasExternas.profundidade;
  const centerY = (espessura / 2) + (alturaParede / 2);

  return {
    base: {
      mesh: createPanel(medidasExternas.largura, espessura, medidasExternas.profundidade, "Base"),
      assembled: new THREE.Vector3(0, espessura / 2, 0),
      exploded: new THREE.Vector3(0, espessura / 2 - 18, 0),
      dimensionText: createDimensionText(medidasExternas.largura, medidasExternas.profundidade),
      dimensionSurface: {
        width: medidasExternas.largura,
        height: medidasExternas.profundidade,
        side: "top",
        depth: espessura,
      },
    },
    frente: {
      mesh: createPanel(larguraFrenteFundo, alturaParede, espessura, "Frente"),
      assembled: new THREE.Vector3(0, centerY, -medidasExternas.profundidade / 2 + espessura / 2),
      exploded: new THREE.Vector3(0, centerY, -medidasExternas.profundidade / 2 - 28),
      dimensionText: createDimensionText(larguraFrenteFundo, alturaParede),
      dimensionSurface: {
        width: larguraFrenteFundo,
        height: alturaParede,
        side: "front",
        depth: espessura,
      },
    },
    fundo: {
      mesh: createPanel(larguraFrenteFundo, alturaParede, espessura, "Fundo"),
      assembled: new THREE.Vector3(0, centerY, medidasExternas.profundidade / 2 - espessura / 2),
      exploded: new THREE.Vector3(0, centerY, medidasExternas.profundidade / 2 + 28),
      dimensionText: createDimensionText(larguraFrenteFundo, alturaParede),
      dimensionSurface: {
        width: larguraFrenteFundo,
        height: alturaParede,
        side: "back",
        depth: espessura,
      },
    },
    lateralEsquerda: {
      mesh: createPanel(espessura, alturaParede, profundidadeLaterais, "Lateral esquerda"),
      assembled: new THREE.Vector3(-medidasExternas.largura / 2 + espessura / 2, centerY, 0),
      exploded: new THREE.Vector3(-medidasExternas.largura / 2 - 28, centerY, 0),
      dimensionText: createDimensionText(profundidadeLaterais, alturaParede),
      dimensionSurface: {
        width: profundidadeLaterais,
        height: alturaParede,
        side: "left",
        depth: espessura,
      },
    },
    lateralDireita: {
      mesh: createPanel(espessura, alturaParede, profundidadeLaterais, "Lateral direita"),
      assembled: new THREE.Vector3(medidasExternas.largura / 2 - espessura / 2, centerY, 0),
      exploded: new THREE.Vector3(medidasExternas.largura / 2 + 28, centerY, 0),
      dimensionText: createDimensionText(profundidadeLaterais, alturaParede),
      dimensionSurface: {
        width: profundidadeLaterais,
        height: alturaParede,
        side: "right",
        depth: espessura,
      },
    },
    ...(fechada
      ? {
          tampa: {
            mesh: createPanel(medidasExternas.largura, espessura, medidasExternas.profundidade, "Tampa"),
            assembled: new THREE.Vector3(0, medidasExternas.altura - (espessura / 2), 0),
            exploded: new THREE.Vector3(0, medidasExternas.altura + 34, 0),
            dimensionText: createDimensionText(medidasExternas.largura, medidasExternas.profundidade),
            dimensionSurface: {
              width: medidasExternas.largura,
              height: medidasExternas.profundidade,
              side: "top",
              depth: espessura,
            },
          },
        }
      : {}),
  };
}

function setPieceVisual(piece, highlighted) {
  piece.mesh.material.color.setHex(highlighted ? HIGHLIGHT : piece.mesh.userData.baseColor);
  piece.mesh.material.opacity = highlighted ? 0.58 : 0.44;
}

export class GeradorModelo3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 5000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.controls = null;
    this.root = new THREE.Group();
    this.dimensions = new THREE.Group();
    this.pieces = {};
    this.viewMode = "montada";
    this.sequenceTimer = null;
    this.raf = null;
    this.initialize();
  }

  initialize() {
    this.scene.background = new THREE.Color(0xf7f7fb);
    this.scene.add(this.root);
    this.scene.add(this.dimensions);

    this.camera.position.set(420, 300, 420);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth || 800, this.container.clientHeight || 480);
    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.7);
    const key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(280, 420, 240);
    const fill = new THREE.DirectionalLight(0xd9d6ff, 0.85);
    fill.position.set(-240, 180, -180);
    this.scene.add(ambient, key, fill);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 180;
    this.controls.maxDistance = 900;
    this.controls.target.set(0, 60, 0);

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
    this.animate();
  }

  handleResize() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 480;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.raf = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clearScene() {
    while (this.root.children.length) {
      this.root.remove(this.root.children[0]);
    }
    while (this.dimensions.children.length) {
      this.dimensions.remove(this.dimensions.children[0]);
    }
    this.pieces = {};
    window.clearInterval(this.sequenceTimer);
    this.sequenceTimer = null;
  }

  clear() {
    this.clearScene();
  }

  buildDimensions(calculo) {
    const { largura, profundidade, altura } = calculo.medidasExternas;
    this.dimensions.add(
      createDimensionLine(
        [-largura / 2, -12, profundidade / 2 + 16],
        [largura / 2, -12, profundidade / 2 + 16],
        "Largura",
        [0, -19, profundidade / 2 + 16]
      ),
      createDimensionLine(
        [-largura / 2 - 14, -8, -profundidade / 2],
        [-largura / 2 - 14, -8, profundidade / 2],
        "Profundidade",
        [-largura / 2 - 32, -14, 0]
      ),
      createDimensionLine(
        [-largura / 2 - 16, 0, -profundidade / 2 - 14],
        [-largura / 2 - 16, altura, -profundidade / 2 - 14],
        "Altura",
        [-largura / 2 - 30, altura / 2, -profundidade / 2 - 14]
      )
    );
  }

  applyViewMode(mode) {
    this.viewMode = mode;
    const exploded = mode === "explodida";

    Object.values(this.pieces).forEach((piece) => {
      piece.mesh.position.copy(exploded ? piece.exploded : piece.assembled);
      setPieceVisual(piece, false);
    });

    window.clearInterval(this.sequenceTimer);
    this.sequenceTimer = null;
  }

  update(calculo, mode = this.viewMode) {
    this.clearScene();
    this.buildDimensions(calculo);

    const pieceMap = buildPieceMap(calculo);
    if (pieceMap.frente) {
      addWordmarkToFront(
        pieceMap.frente.mesh,
        pieceMap.frente.mesh.geometry.parameters.width,
        pieceMap.frente.mesh.geometry.parameters.height,
        pieceMap.frente.mesh.geometry.parameters.depth
      );
    }
    Object.entries(pieceMap).forEach(([key, piece]) => {
      if (piece.dimensionText && piece.dimensionSurface) {
        addPieceDimension(
          piece.mesh,
          piece.dimensionText,
          piece.dimensionSurface.width,
          piece.dimensionSurface.height,
          piece.dimensionSurface.side,
          piece.dimensionSurface.depth
        );
      }
      this.root.add(piece.mesh);
      this.pieces[key] = piece;
    });

    this.root.position.y = Math.max(-calculo.medidasExternas.altura * 0.1, -18);
    this.root.rotation.set(0, 0, 0);
    this.dimensions.rotation.set(0, 0, 0);
    this.controls.target.set(0, Math.max(calculo.medidasExternas.altura / 3, 34), 0);
    this.camera.position.set(
      calculo.medidasExternas.largura * 1.35,
      calculo.medidasExternas.altura * 1.7,
      calculo.medidasExternas.profundidade * 2.1
    );
    this.controls.update();
    this.applyViewMode(mode);
  }
}
