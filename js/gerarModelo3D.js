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

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
}

function getTextTexture(text, variant = "dimension") {
  const key = `${variant}:${text}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (variant === "brand") {
    context.fillStyle = "rgba(76,29,149,0.68)";
    context.font = "700 196px Segoe UI";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  } else {
    context.fillStyle = "rgba(76,29,149,0.42)";
    context.font = "600 120px Segoe UI";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

function createEngravedPlane(text, width, height, variant = "dimension") {
  const material = new THREE.MeshBasicMaterial({
    map: getTextTexture(text, variant),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: variant === "brand" ? 0.7 : 0.78,
    color: ENGRAVE,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  return plane;
}

function createGuideLabel(text) {
  const plane = createEngravedPlane(text, 58, 18, "brand");
  plane.material.opacity = 0.92;
  return plane;
}

function createDimensionLine(start, end, text, labelPosition) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ]);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.92 })
  );

  const group = new THREE.Group();
  group.add(line);
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
    opacity: 0.46,
    transmission: 0.74,
    roughness: 0.1,
    thickness: 1.4,
    clearcoat: 0.95,
    clearcoatRoughness: 0.04,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.label = label;
  mesh.userData.baseColor = TONES[label] || 0x7c3aed;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 1 })
  );
  mesh.add(edges);

  return mesh;
}

function addWordmarkToFront(mesh, panelWidth, panelHeight, panelDepth) {
  const baseHeight = Math.min(panelWidth, panelHeight) * 0.15;
  const wordmarkWidth = Math.min(panelWidth * 0.52, baseHeight * 4.4);
  const wordmark = createEngravedPlane("Arcode", wordmarkWidth, baseHeight, "brand");
  wordmark.position.set(0, -panelHeight * 0.03, (panelDepth / 2) + 0.7);
  mesh.add(wordmark);
}

function createDimensionText(valueA, valueB) {
  return `${Math.round(valueA)} × ${Math.round(valueB)} mm`;
}

function addPieceDimension(mesh, text, surfaceWidth, surfaceHeight, side, depth) {
  const labelHeight = Math.min(surfaceWidth, surfaceHeight) * 0.12;
  const labelWidth = Math.min(surfaceWidth * 0.72, labelHeight * 5.2);
  const label = createEngravedPlane(text, labelWidth, labelHeight, "dimension");
  const verticalOffset = -surfaceHeight * 0.1;
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
        [-largura / 2, -14, profundidade / 2 + 22],
        [largura / 2, -14, profundidade / 2 + 22],
        "Largura",
        [0, -24, profundidade / 2 + 22]
      ),
      createDimensionLine(
        [-largura / 2 - 18, -8, -profundidade / 2],
        [-largura / 2 - 18, -8, profundidade / 2],
        "Profundidade",
        [-largura / 2 - 44, -18, 0]
      ),
      createDimensionLine(
        [-largura / 2 - 20, 0, -profundidade / 2 - 18],
        [-largura / 2 - 20, altura, -profundidade / 2 - 18],
        "Altura",
        [-largura / 2 - 44, altura / 2, -profundidade / 2 - 18]
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
