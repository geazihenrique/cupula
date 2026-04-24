import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const BRAND = 0x6f57d9;
const EDGE = 0x7f66f1;
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
  const material = new THREE.MeshPhysicalMaterial({
    color: BRAND,
    transparent: true,
    opacity: 0.40,
    transmission: 0.82,
    roughness: 0.08,
    thickness: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.label = label;

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
  piece.mesh.material.color.setHex(highlighted ? HIGHLIGHT : BRAND);
  piece.mesh.material.opacity = highlighted ? 0.58 : 0.40;
}

export class GeradorModelo3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 5000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.root = new THREE.Group();
    this.dimensions = new THREE.Group();
    this.pieces = {};
    this.viewMode = "montada";
    this.rotation = { x: -0.28, y: 0.56 };
    this.pointer = { x: 0, y: 0, active: false };
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

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(360, 72),
      new THREE.MeshBasicMaterial({ color: 0xeae8f6, transparent: true, opacity: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    this.scene.add(floor);

    this.bindPointerEvents();
    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
    this.animate();
  }

  bindPointerEvents() {
    this.container.addEventListener("pointerdown", (event) => {
      this.pointer.active = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.container.setPointerCapture(event.pointerId);
    });

    this.container.addEventListener("pointermove", (event) => {
      if (!this.pointer.active) {
        return;
      }

      const deltaX = event.clientX - this.pointer.x;
      const deltaY = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.rotation.y += deltaX * 0.01;
      this.rotation.x = Math.max(-0.95, Math.min(0.2, this.rotation.x + (deltaY * 0.008)));
      this.applyRotation();
    });

    const stop = () => {
      this.pointer.active = false;
    };

    this.container.addEventListener("pointerup", stop);
    this.container.addEventListener("pointercancel", stop);
    this.container.addEventListener("pointerleave", stop);
  }

  applyRotation() {
    this.root.rotation.x = this.rotation.x;
    this.root.rotation.y = this.rotation.y;
    this.dimensions.rotation.y = this.rotation.y;
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
    if (!this.pointer.active) {
      this.rotation.y += 0.002;
      this.applyRotation();
    }
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

    this.root.position.y = Math.max(-calculo.medidasExternas.altura * 0.16, -28);
    this.camera.lookAt(0, Math.max(calculo.medidasExternas.altura / 3, 30), 0);
    this.applyRotation();
    this.applyViewMode(mode);
  }
}