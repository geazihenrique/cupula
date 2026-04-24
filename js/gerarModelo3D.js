(function () {
  const COLOR_BRAND = 0x6f57d9;
  const COLOR_EDGE = 0x7f66f1;
  const COLOR_HIGHLIGHT = 0xb38bff;

  function createLabelSprite(text) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 96;
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.beginPath();
    context.roundRect(8, 8, 240, 80, 28);
    context.fill();
    context.strokeStyle = "rgba(111,87,217,0.22)";
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
    sprite.scale.set(70, 26, 1);
    return sprite;
  }

  function createDimensionLine(start, end, text) {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: COLOR_EDGE, transparent: true, opacity: 0.9 })
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
      color: COLOR_BRAND,
      transmission: 0.72,
      transparent: true,
      opacity: 0.44,
      roughness: 0.08,
      thickness: 1.2,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.label = label;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: COLOR_EDGE, transparent: true, opacity: 0.95 })
    );
    mesh.add(edges);

    return mesh;
  }

  function pieceMapFromCalculo(calculo) {
    const { external, espessura, alturaParede, tipoCupula, tipoMontagem } = calculo;
    const isOpen = tipoCupula === "aberta";
    const insideAssembly = tipoMontagem === "dentro";
    const larguraFrente = insideAssembly ? external.largura : external.largura - (2 * espessura);
    const profundidadeLateral = insideAssembly ? external.profundidade - (2 * espessura) : external.profundidade;
    const zCentroParede = (espessura / 2) + (alturaParede / 2);

    return {
      base: {
        key: "base",
        title: "Base",
        mesh: createPanel(external.largura, espessura, external.profundidade, "Base"),
        assembled: new THREE.Vector3(0, espessura / 2, 0),
        exploded: new THREE.Vector3(0, espessura / 2 - 18, 0),
      },
      frente: {
        key: "frente",
        title: "Frente",
        mesh: createPanel(larguraFrente, alturaParede, espessura, "Frente"),
        assembled: new THREE.Vector3(0, zCentroParede, -external.profundidade / 2 + espessura / 2),
        exploded: new THREE.Vector3(0, zCentroParede, -external.profundidade / 2 - 28),
      },
      fundo: {
        key: "fundo",
        title: "Fundo",
        mesh: createPanel(larguraFrente, alturaParede, espessura, "Fundo"),
        assembled: new THREE.Vector3(0, zCentroParede, external.profundidade / 2 - espessura / 2),
        exploded: new THREE.Vector3(0, zCentroParede, external.profundidade / 2 + 28),
      },
      lateralEsquerda: {
        key: "lateralEsquerda",
        title: "Lateral",
        mesh: createPanel(espessura, alturaParede, profundidadeLateral, "Lateral"),
        assembled: new THREE.Vector3(-external.largura / 2 + espessura / 2, zCentroParede, 0),
        exploded: new THREE.Vector3(-external.largura / 2 - 28, zCentroParede, 0),
      },
      lateralDireita: {
        key: "lateralDireita",
        title: "Lateral",
        mesh: createPanel(espessura, alturaParede, profundidadeLateral, "Lateral"),
        assembled: new THREE.Vector3(external.largura / 2 - espessura / 2, zCentroParede, 0),
        exploded: new THREE.Vector3(external.largura / 2 + 28, zCentroParede, 0),
      },
      ...(isOpen
        ? {}
        : {
            tampa: {
              key: "tampa",
              title: "Tampa",
              mesh: createPanel(external.largura, espessura, external.profundidade, "Tampa"),
              assembled: new THREE.Vector3(0, external.altura - espessura / 2, 0),
              exploded: new THREE.Vector3(0, external.altura + 34, 0),
            },
          }),
    };
  }

  function setPieceVisual(piece, highlighted) {
    piece.mesh.material.color.setHex(highlighted ? COLOR_HIGHLIGHT : COLOR_BRAND);
    piece.mesh.material.opacity = highlighted ? 0.62 : 0.44;
  }

  function GeradorModelo3D(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.root = new THREE.Group();
    this.dimensionGroup = new THREE.Group();
    this.pieces = {};
    this.viewMode = "montada";
    this.sequenceIndex = 0;
    this.sequenceTimer = null;
    this.animationFrame = null;
    this.init();
  }

  GeradorModelo3D.prototype.init = function init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7f7fb);
    this.scene.add(this.root);
    this.scene.add(this.dimensionGroup);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    this.camera.position.set(340, 280, 360);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 120;
    this.controls.maxDistance = 1200;

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const spot = new THREE.DirectionalLight(0xffffff, 1.5);
    spot.position.set(300, 420, 240);
    const fill = new THREE.DirectionalLight(0xd9d6ff, 0.8);
    fill.position.set(-260, 160, -220);
    this.scene.add(ambient, spot, fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(340, 72),
      new THREE.MeshBasicMaterial({ color: 0xeae8f6, transparent: true, opacity: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    this.scene.add(floor);

    window.addEventListener("resize", this.handleResize.bind(this));
    this.animate();
  };

  GeradorModelo3D.prototype.handleResize = function handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  GeradorModelo3D.prototype.animate = function animate() {
    this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  GeradorModelo3D.prototype.clearRoot = function clearRoot() {
    this.root.clear();
    this.dimensionGroup.clear();
    this.pieces = {};
    window.clearInterval(this.sequenceTimer);
    this.sequenceTimer = null;
  };

  GeradorModelo3D.prototype.clear = function clear() {
    this.clearRoot();
  };

  GeradorModelo3D.prototype.buildDimensions = function buildDimensions(calculo) {
    const { external } = calculo;
    const widthLine = createDimensionLine(
      [-external.largura / 2, -16, external.profundidade / 2 + 22],
      [external.largura / 2, -16, external.profundidade / 2 + 22],
      "Largura"
    );
    const depthLine = createDimensionLine(
      [external.largura / 2 + 18, -10, -external.profundidade / 2],
      [external.largura / 2 + 18, -10, external.profundidade / 2],
      "Profundidade"
    );
    const heightLine = createDimensionLine(
      [-external.largura / 2 - 20, 0, -external.profundidade / 2 - 16],
      [-external.largura / 2 - 20, external.altura, -external.profundidade / 2 - 16],
      "Altura"
    );
    this.dimensionGroup.add(widthLine, depthLine, heightLine);
  };

  GeradorModelo3D.prototype.applyViewMode = function applyViewMode(mode) {
    this.viewMode = mode;
    const exploded = mode !== "montada";

    Object.values(this.pieces).forEach((piece) => {
      piece.mesh.position.copy(exploded ? piece.exploded : piece.assembled);
      setPieceVisual(piece, false);
    });

    if (mode === "ordem") {
      const sequence = ["base", "frente", "fundo", "lateralEsquerda", "lateralDireita", "tampa"].filter((key) => this.pieces[key]);
      this.sequenceIndex = 0;
      const highlightStep = () => {
        Object.values(this.pieces).forEach((piece) => setPieceVisual(piece, false));
        const key = sequence[this.sequenceIndex % sequence.length];
        if (key) {
          setPieceVisual(this.pieces[key], true);
        }
        this.sequenceIndex += 1;
      };
      highlightStep();
      this.sequenceTimer = window.setInterval(highlightStep, 1300);
    }
  };

  GeradorModelo3D.prototype.update = function update(calculo, mode) {
    this.clearRoot();
    this.buildDimensions(calculo);

    const map = pieceMapFromCalculo(calculo);
    Object.values(map).forEach((piece) => {
      this.root.add(piece.mesh);
      this.pieces[piece.key] = piece;
    });

    this.root.position.y = 0;
    this.controls.target.set(0, Math.max(calculo.external.altura / 3, 30), 0);
    this.controls.update();
    this.applyViewMode(mode || this.viewMode);
  };

  window.Cupula3D = {
    GeradorModelo3D,
  };
})();