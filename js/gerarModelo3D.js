import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const BRAND = 0x6f57d9;
const EDGE = 0x4c1d95;
const HIGHLIGHT = 0xb38bff;

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

function createLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");

  context.fillStyle = "rgba(255,255,255,0.92)";
  drawRoundedRect(context, 8, 8, 240, 80, 28);
  context.fill();
  context.strokeStyle = "rgba(111,87,217,0.20)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#17171b";
  context.font = "600 28px Segoe UI";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(68, 26, 1);
  return sprite;
}

function createDimensionLine(start, end, text) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ]);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.92 })
  );

  const label = createLabelSprite(text);
  label.position.set(
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  );

  const group = new THREE.Group();
  group.add(line);
  group.add(label);
  return group;
}

function createPanel(width, height, depth, label) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const toneByLabel = {
    Base: 0x6f57d9,
    Frente: 0x7c3aed,
    Fundo: 0x8b5cf6,
    Lateral: 0x6d28d9,
    Tampa: 0xa78bfa,
  };
  const material = new THREE.MeshPhysicalMaterial({
    color: toneByLabel[label] || BRAND,
    transparent: true,
    opacity: 0.44,
    transmission: 0.78,
    roughness: 0.08,
    thickness: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.label = label;
  mesh.userData.baseColor = toneByLabel[label] || BRAND;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 1 })
  );
  mesh.add(edges);

  return mesh;
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
    },
    frente: {
      mesh: createPanel(larguraFrenteFundo, alturaParede, espessura, "Frente"),
      assembled: new THREE.Vector3(0, centerY, -medidasExternas.profundidade / 2 + espessura / 2),
      exploded: new THREE.Vector3(0, centerY, -medidasExternas.profundidade / 2 - 28),
    },
    fundo: {
      mesh: createPanel(larguraFrenteFundo, alturaParede, espessura, "Fundo"),
      assembled: new THREE.Vector3(0, centerY, medidasExternas.profundidade / 2 - espessura / 2),
      exploded: new THREE.Vector3(0, centerY, medidasExternas.profundidade / 2 + 28),
    },
    lateralEsquerda: {
      mesh: createPanel(espessura, alturaParede, profundidadeLaterais, "Lateral"),
      assembled: new THREE.Vector3(-medidasExternas.largura / 2 + espessura / 2, centerY, 0),
      exploded: new THREE.Vector3(-medidasExternas.largura / 2 - 28, centerY, 0),
    },
    lateralDireita: {
      mesh: createPanel(espessura, alturaParede, profundidadeLaterais, "Lateral"),
      assembled: new THREE.Vector3(medidasExternas.largura / 2 - espessura / 2, centerY, 0),
      exploded: new THREE.Vector3(medidasExternas.largura / 2 + 28, centerY, 0),
    },
    ...(fechada
      ? {
          tampa: {
            mesh: createPanel(medidasExternas.largura, espessura, medidasExternas.profundidade, "Tampa"),
            assembled: new THREE.Vector3(0, medidasExternas.altura - (espessura / 2), 0),
            exploded: new THREE.Vector3(0, medidasExternas.altura + 34, 0),
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

    this.camera.position.set(0, 190, 470);

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
    this.root.clear();
    this.dimensions.clear();
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
        "Largura"
      ),
      createDimensionLine(
        [largura / 2 + 18, -8, -profundidade / 2],
        [largura / 2 + 18, -8, profundidade / 2],
        "Profundidade"
      ),
      createDimensionLine(
        [-largura / 2 - 20, 0, -profundidade / 2 - 18],
        [-largura / 2 - 20, altura, -profundidade / 2 - 18],
        "Altura"
      )
    );
  }

  applyViewMode(mode) {
    this.viewMode = mode;
    const exploded = mode !== "montada";

    Object.values(this.pieces).forEach((piece) => {
      piece.mesh.position.copy(exploded ? piece.exploded : piece.assembled);
      setPieceVisual(piece, false);
    });

    window.clearInterval(this.sequenceTimer);
    this.sequenceTimer = null;

    if (mode === "ordem") {
      const sequence = ["base", "frente", "fundo", "lateralEsquerda", "lateralDireita", "tampa"].filter((key) => this.pieces[key]);
      let index = 0;
      const highlight = () => {
        Object.values(this.pieces).forEach((piece) => setPieceVisual(piece, false));
        setPieceVisual(this.pieces[sequence[index % sequence.length]], true);
        index += 1;
      };
      highlight();
      this.sequenceTimer = window.setInterval(highlight, 1200);
    }
  }

  update(calculo, mode = this.viewMode) {
    this.clearScene();
    this.buildDimensions(calculo);

    const pieceMap = buildPieceMap(calculo);
    Object.entries(pieceMap).forEach(([key, piece]) => {
      this.root.add(piece.mesh);
      this.pieces[key] = piece;
    });

    this.root.position.y = Math.max(-calculo.medidasExternas.altura * 0.14, -24);
    this.root.rotation.set(0, 0, 0);
    this.dimensions.rotation.set(0, 0, 0);
    this.controls.target.set(0, Math.max(calculo.medidasExternas.altura / 3, 34), 0);
    this.controls.update();
    this.applyViewMode(mode);
  }
}
