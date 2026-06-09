const state = {
  materials: [],
  lastSimulation: null,
};

const rowsEl = document.querySelector("#compositionRows");
const rowTemplate = document.querySelector("#rowTemplate");
const addRowButton = document.querySelector("#addRowButton");
const runButton = document.querySelector("#runButton");
const materialSearch = document.querySelector("#materialSearch");
const metricsGrid = document.querySelector("#metricsGrid");
const articlesList = document.querySelector("#articlesList");
const statusText = document.querySelector("#statusText");
const researchQuery = document.querySelector("#researchQuery");
const queryLink = document.querySelector("#queryLink");
const atomicCanvas = document.querySelector("#atomicCanvas");
const crystalCanvas = document.querySelector("#crystalCanvas");
const atomicStructureCanvas = document.querySelector("#atomicStructureCanvas");
const propertyChart = document.querySelector("#propertyChart");
const xrdChart = document.querySelector("#xrdChart");
const xrdImage = document.querySelector("#xrdImage");
const xrdWavelength = document.querySelector("#xrdWavelength");
const xrdXMin = document.querySelector("#xrdXMin");
const xrdXMax = document.querySelector("#xrdXMax");
const xrdXStep = document.querySelector("#xrdXStep");
const xrdElementCount = document.querySelector("#xrdElementCount");
const icsdReference = document.querySelector("#icsdReference");
const stoichEquation = document.querySelector("#stoichEquation");
const stoichCoefficients = document.querySelector("#stoichCoefficients");
const stoichBase = document.querySelector("#stoichBase");
const stoichQuantity = document.querySelector("#stoichQuantity");
const stoichUnit = document.querySelector("#stoichUnit");
const stoichButton = document.querySelector("#stoichButton");
const stoichResults = document.querySelector("#stoichResults");
const mpQuery = document.querySelector("#mpQuery");
const mpLimit = document.querySelector("#mpLimit");
const mpButton = document.querySelector("#mpButton");
const mpResults = document.querySelector("#mpResults");
const mpStructureCanvas = document.querySelector("#mpStructureCanvas");

const metricLabels = {
  formula_aproximada: "Formula aproximada",
  massa_molar_g_mol: "Massa molar aproximada (g/mol)",
  densidade_g_cm3: "Densidade (g/cm3)",
  modulo_elastico_gpa: "Modulo elastico (GPa)",
  condutividade_termica_w_mk: "Condutividade termica (W/mK)",
  condutividade_eletrica_s_m: "Condutividade eletrica (S/m)",
  resistividade_ohm_m: "Resistividade (ohm m)",
  band_gap_ev: "Band gap bibliografico/estimado (eV)",
  confianca_band_gap: "Confianca do band gap",
  base_bibliografica_band_gap: "Base bibliografica do band gap",
  ponto_fusao_c: "Ponto de fusao (C)",
  raio_atomico_pm: "Raio atomico medio (pm)",
  eletronegatividade_media: "Eletronegatividade media",
  dureza_vickers_hv: "Dureza Vickers estimada (HV)",
  seebeck_uv_k: "Coeficiente Seebeck (uV/K)",
  fator_potencia_w_mk2: "Fator de potencia (W/mK2)",
  zt_300k: "ZT estimado em 300 K",
  estrutura_predominante: "Estrutura predominante",
  confianca_estrutura: "Confianca da estrutura",
  base_cristalografica: "Base cristalografica",
  estrutura_confirmada: "Estrutura confirmada?",
  classe_eletrica: "Classe eletrica",
  confianca_classe: "Confianca da classe",
  criterio_classe_eletrica: "Criterio da classe eletrica",
  base_bibliografica: "Base bibliografica da classe",
  indicacao: "Indicacao",
};

const chartMetrics = [
  ["atomic_mass_u", "Massa molar"],
  ["density_g_cm3", "Densidade"],
  ["elastic_modulus_gpa", "Modulo"],
  ["thermal_conductivity_w_mk", "Cond. termica"],
  ["electrical_conductivity_s_m", "Cond. eletrica"],
  ["hardness_vickers_hv", "Dureza HV"],
  ["melting_point_c", "Fusao"],
  ["seebeck_uv_k", "Seebeck"],
  ["zt_300k", "ZT 300K"],
];

const elementColors = {
  H: "#f5f7fb",
  C: "#2d2f33",
  N: "#4d73c9",
  O: "#d94b40",
  F: "#84b66f",
  P: "#c08a30",
  S: "#d8bd3f",
  Se: "#8a5a2b",
  Te: "#7b6f9f",
  Sn: "#aeb9bd",
  Pb: "#6d7583",
  Bi: "#b7a5ba",
  Ti: "#9aa1aa",
  Sr: "#a9b88f",
  Ba: "#b5a36f",
  Ca: "#c5c9b8",
  La: "#b8c7b8",
  Al: "#a8b7c7",
  Mn: "#9b8f9d",
  Fe: "#8d9496",
  Co: "#6f86aa",
  Ni: "#a7a08a",
  Zn: "#9daab3",
  Y: "#91afa9",
  Gd: "#8aa08f",
  Nd: "#a893c8",
  Sm: "#d4c0aa",
  I: "#71518e",
  Br: "#8f4230",
  Cs: "#a68d56",
};

function materialText(material) {
  return [
    material.id,
    material.name,
    material.formula,
    material.symbol,
    material.category,
    material.search_terms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filteredMaterials(selectedId = "") {
  const query = materialSearch?.value.trim().toLowerCase() || "";
  const selected = state.materials.find((material) => material.id === selectedId);
  let materials = state.materials;

  if (query) {
    materials = state.materials.filter((material) => materialText(material).includes(query));
  }

  if (selected && !materials.some((material) => material.id === selected.id)) {
    materials = [selected, ...materials];
  }

  return materials;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erro na requisicao.");
  }
  return data;
}

function setStatus(message) {
  statusText.textContent = message;
}

function addRow(materialId, fraction = 0.5) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  const select = row.querySelector(".material-select");
  const input = row.querySelector(".fraction-input");
  const removeButton = row.querySelector(".remove-button");

  const initialMaterial = materialId || state.materials[0]?.id || "";
  fillMaterialSelect(select, initialMaterial);
  input.value = fraction;
  removeButton.addEventListener("click", () => {
    row.remove();
    if (!rowsEl.children.length) {
      addRow();
    }
  });

  rowsEl.append(row);
}

function fillMaterialSelect(select, selectedId = "") {
  const previous = selectedId || select.value;
  select.innerHTML = "";

  for (const material of filteredMaterials(previous)) {
    const option = document.createElement("option");
    option.value = material.id;
    option.textContent = `${material.symbol || material.formula} - ${material.name}`;
    select.append(option);
  }

  if (previous && [...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function refreshMaterialSelects() {
  for (const select of rowsEl.querySelectorAll(".material-select")) {
    fillMaterialSelect(select, select.value);
  }
}

function getComposition() {
  const composition = {};
  for (const row of rowsEl.querySelectorAll(".row")) {
    const material = row.querySelector(".material-select").value;
    const fraction = Number(row.querySelector(".fraction-input").value);
    if (!material || Number.isNaN(fraction) || fraction <= 0) {
      continue;
    }
    composition[material] = (composition[material] || 0) + fraction;
  }
  return composition;
}

function numericInputValue(input, fallback, min, max) {
  const value = Number(input?.value);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function getXrdSettings() {
  return {
    wavelength_a: numericInputValue(xrdWavelength, 1.5406, 0.1, 5),
    x_min: numericInputValue(xrdXMin, 5, 0, 170),
    x_max: numericInputValue(xrdXMax, 95, 1, 180),
    x_step: numericInputValue(xrdXStep, 0.05, 0.005, 5),
    number_of_elements: Math.round(numericInputValue(xrdElementCount, 6, 1, 30)),
    icsd_reference: icsdReference?.value.trim() || "",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(value) {
  if (typeof value !== "number") {
    return value;
  }
  if (Math.abs(value) >= 100000 || Math.abs(value) < 0.001) {
    return value.toExponential(3);
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function renderMetrics(simulation) {
  metricsGrid.innerHTML = "";
  for (const [key, value] of Object.entries(simulation)) {
    if (key === "componentes" || key === "xrd") {
      continue;
    }
    const card = document.createElement("article");
    card.className = [
      "indicacao",
      "base_bibliografica",
      "base_bibliografica_band_gap",
      "base_cristalografica",
      "criterio_classe_eletrica",
    ].includes(key) ? "metric metric-wide" : "metric";
    card.innerHTML = `<span>${metricLabels[key] || key}</span><strong>${formatValue(value)}</strong>`;
    metricsGrid.append(card);
  }
}

function renderStoichiometry(result) {
  if (!stoichResults) {
    return;
  }
  const rows = result.substancias
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.lado)}</td>
          <td><strong>${escapeHtml(item.coeficiente)}</strong></td>
          <td>${escapeHtml(item.formula)}</td>
          <td>${formatValue(item.massa_molar_g_mol)}</td>
          <td>${formatValue(item.massa_por_equacao_g)}</td>
          <td>${formatValue(item.mols_calculados)}</td>
          <td>${formatValue(item.massa_calculada_g)}</td>
        </tr>
      `
    )
    .join("");

  stoichResults.className = "stoich-results";
  stoichResults.innerHTML = `
    <div class="balanced-equation">${escapeHtml(result.equacao_balanceada)}</div>
    <div class="stoich-base">
      Base: ${escapeHtml(result.base.formula)} = ${formatValue(result.base.quantidade)}
      ${escapeHtml(result.base.unidade)} (${formatValue(result.base.mols)} mol)
    </div>
    <div class="stoich-base">
      Balanceamento: ${escapeHtml(result.modo_balanceamento || "automatico")}
      ${result.coeficientes ? ` | coeficientes: ${escapeHtml(result.coeficientes.join(", "))}` : ""}
    </div>
    <div class="table-wrap">
      <table class="stoich-table">
        <thead>
          <tr>
            <th>Lado</th>
            <th>Coef.</th>
            <th>Formula</th>
            <th>Massa molar</th>
            <th>g/equacao</th>
            <th>mol calc.</th>
            <th>g calc.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="article-meta">${escapeHtml(result.observacao)}</p>
  `;
}

function renderStoichiometryError(message) {
  if (!stoichResults) {
    return;
  }
  stoichResults.className = "stoich-results empty";
  stoichResults.textContent = message;
}

function mpValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }
  return `${formatValue(value)}${suffix}`;
}

function finiteTriplet(values) {
  if (!Array.isArray(values) || values.length < 3) {
    return [];
  }
  const triplet = values.slice(0, 3).map((value) => Number(value));
  return triplet.every(Number.isFinite) ? triplet : [];
}

function normalizeMpSymbol(symbol) {
  const text = String(symbol || "X");
  const match = text.match(/[A-Z][a-z]?/);
  return match ? match[0] : text.slice(0, 2);
}

function normalizeMpSites(item) {
  const rawSites = Array.isArray(item?.structure?.sites) ? item.structure.sites : [];
  const sites = rawSites.slice(0, 120).map((site) => ({
    symbol: normalizeMpSymbol(site.symbol),
    abc: finiteTriplet(site.abc),
    xyz: finiteTriplet(site.xyz),
  }));

  if (sites.every((site) => site.abc.length === 3)) {
    return sites.map((site) => ({ ...site, point: site.abc }));
  }

  const xyzSites = sites.filter((site) => site.xyz.length === 3);
  if (!xyzSites.length) {
    return [];
  }
  const mins = [0, 1, 2].map((axis) => Math.min(...xyzSites.map((site) => site.xyz[axis])));
  const maxs = [0, 1, 2].map((axis) => Math.max(...xyzSites.map((site) => site.xyz[axis])));
  return xyzSites.map((site) => ({
    ...site,
    point: site.xyz.map((value, axis) => {
      const span = Math.max(maxs[axis] - mins[axis], 1e-9);
      return (value - mins[axis]) / span;
    }),
  }));
}

function mpProjector(canvas) {
  const originX = 86;
  const originY = 104;
  const cellWidth = canvas.width - 280;
  const cellHeight = canvas.height - 180;
  const depth = Math.min(135, cellWidth * 0.18);
  return ([a, b, c]) => {
    const aa = Math.max(-0.08, Math.min(1.08, a));
    const bb = Math.max(-0.08, Math.min(1.08, b));
    const cc = Math.max(-0.08, Math.min(1.08, c));
    return {
      x: originX + aa * cellWidth + cc * depth,
      y: originY + bb * cellHeight - cc * depth * 0.55,
      z: cc,
    };
  };
}

function drawMaterialsProjectCell(ctx, project) {
  const corners = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ].map(project);
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  ctx.strokeStyle = "rgba(17, 97, 91, 0.38)";
  ctx.lineWidth = 2;
  edges.forEach(([from, to]) => {
    ctx.beginPath();
    ctx.moveTo(corners[from].x, corners[from].y);
    ctx.lineTo(corners[to].x, corners[to].y);
    ctx.stroke();
  });
}

function drawMaterialsProjectStructure(item, result = {}) {
  if (!mpStructureCanvas) {
    return;
  }
  const ctx = clearCanvas(mpStructureCanvas);
  const width = mpStructureCanvas.width;
  const height = mpStructureCanvas.height;
  const sites = normalizeMpSites(item);

  ctx.fillStyle = "#f8fbf8";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1d2321";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 18px Arial";

  if (!item || !sites.length) {
    ctx.fillText("Estrutura cristalina do Materials Project", 22, 34);
    ctx.fillStyle = "#66716d";
    ctx.font = "14px Arial";
    ctx.fillText(result?.message || "Configure MP_API_KEY para puxar a estrutura e a rede cristalina reais.", 22, 64);
    ctx.fillText("Sem chave da API, o site mostra apenas estimativas locais e links externos.", 22, 88);
    return;
  }

  const materialLabel = `${item.formula || "Formula"} ${item.material_id ? `(${item.material_id})` : ""}`;
  ctx.fillText(`Estrutura MP: ${materialLabel}`, 22, 34);
  ctx.fillStyle = "#66716d";
  ctx.font = "13px Arial";
  ctx.fillText(
    `Rede: ${item.crystal_system || "n/a"} | grupo: ${item.spacegroup_symbol || "n/a"} ${item.spacegroup_number || ""} | sites: ${item.structure?.site_count || sites.length}`,
    22,
    58
  );

  const project = mpProjector(mpStructureCanvas);
  drawMaterialsProjectCell(ctx, project);
  const atoms = sites
    .map((site) => ({ ...site, screen: project(site.point) }))
    .sort((a, b) => a.screen.z - b.screen.z);

  let bonds = 0;
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      const a = atoms[i].screen;
      const b = atoms[j].screen;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 72 && Math.abs(a.z - b.z) < 0.42 && bonds < 180) {
        drawBond(ctx, a.x, a.y, b.x, b.y);
        bonds += 1;
      }
    }
  }

  atoms.forEach((site) => {
    const radius = 10 + site.screen.z * 7;
    drawAtom(ctx, site.screen.x, site.screen.y, radius, site.symbol, atomColor(site.symbol));
  });

  const lattice = item.lattice || {};
  ctx.fillStyle = "#1d2321";
  ctx.font = "700 13px Arial";
  ctx.fillText("Parametros da rede", width - 220, 92);
  ctx.fillStyle = "#66716d";
  ctx.font = "12px Arial";
  [
    `a ${mpValue(lattice.a, " A")}`,
    `b ${mpValue(lattice.b, " A")}`,
    `c ${mpValue(lattice.c, " A")}`,
    `alpha ${mpValue(lattice.alpha, " deg")}`,
    `beta ${mpValue(lattice.beta, " deg")}`,
    `gamma ${mpValue(lattice.gamma, " deg")}`,
  ].forEach((line, index) => ctx.fillText(line, width - 220, 116 + index * 18));

  ctx.fillStyle = "#66716d";
  ctx.font = "12px Arial";
  ctx.fillText("Desenho gerado das coordenadas atomicas retornadas pela API do Materials Project.", 22, height - 18);
}

function renderMaterialsProject(result) {
  if (!mpResults) {
    return;
  }
  const links = result?.links || {};
  const linkHtml = `
    <div class="mp-links">
      ${links.materials ? `<a href="${escapeHtml(links.materials)}" target="_blank" rel="noreferrer">Abrir materiais</a>` : ""}
      ${links.molecules ? `<a href="${escapeHtml(links.molecules)}" target="_blank" rel="noreferrer">Abrir moleculas</a>` : ""}
    </div>
  `;

  if (!result?.results?.length) {
    drawMaterialsProjectStructure(null, result);
    mpResults.className = "mp-results empty";
    mpResults.innerHTML = `
      <strong>${escapeHtml(result?.message || "Sem resultados do Materials Project.")}</strong>
      ${result?.chemsys ? `<span>Sistema: ${escapeHtml(result.chemsys)}</span>` : ""}
      ${linkHtml}
    `;
    return;
  }

  drawMaterialsProjectStructure(result.results[0], result);

  const cards = result.results
    .map((item) => {
      const rawPreview = escapeHtml(JSON.stringify(item.raw || {}, null, 2).slice(0, 2400));
      return `
        <article class="mp-card">
          <div class="mp-card-head">
            <div>
              <p class="article-provider">${escapeHtml(item.material_id || "MP")}</p>
              <h3>${escapeHtml(item.formula || "Formula")}</h3>
            </div>
            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Abrir</a>` : ""}
          </div>
          <dl class="mp-grid">
            <div><dt>Sistema cristalino</dt><dd>${escapeHtml(item.crystal_system || "n/a")}</dd></div>
            <div><dt>Grupo espacial</dt><dd>${escapeHtml(item.spacegroup_symbol || "n/a")} ${escapeHtml(item.spacegroup_number ?? "")}</dd></div>
            <div><dt>Band gap</dt><dd>${mpValue(item.band_gap_ev, " eV")}</dd></div>
            <div><dt>Densidade</dt><dd>${mpValue(item.density_g_cm3, " g/cm3")}</dd></div>
            <div><dt>E hull</dt><dd>${mpValue(item.energy_above_hull_ev_atom, " eV/atom")}</dd></div>
            <div><dt>Formacao</dt><dd>${mpValue(item.formation_energy_ev_atom, " eV/atom")}</dd></div>
            <div><dt>Estavel</dt><dd>${item.is_stable ? "sim" : "nao"}</dd></div>
            <div><dt>Metal</dt><dd>${item.is_metal ? "sim" : "nao"}</dd></div>
            <div><dt>Sites</dt><dd>${mpValue(item.nsites)}</dd></div>
            <div><dt>Volume</dt><dd>${mpValue(item.volume_a3, " A3")}</dd></div>
          </dl>
          <div class="mp-lattice mp-structure-note">
            Estrutura desenhada: ${mpValue(item.structure?.sites?.length)} sites recebidos da API
            ${item.structure?.truncated ? "(amostra limitada para desempenho)" : ""}
          </div>
          <div class="mp-lattice">
            Rede: a=${mpValue(item.lattice?.a, " A")},
            b=${mpValue(item.lattice?.b, " A")},
            c=${mpValue(item.lattice?.c, " A")},
            alpha=${mpValue(item.lattice?.alpha, " deg")},
            beta=${mpValue(item.lattice?.beta, " deg")},
            gamma=${mpValue(item.lattice?.gamma, " deg")}
          </div>
          <div class="article-meta">
            ICSD: ${escapeHtml((item.icsd_ids || []).join(", ") || "n/a")}
          </div>
          <details>
            <summary>Ver dados brutos recebidos da API</summary>
            <pre>${rawPreview}</pre>
          </details>
        </article>
      `;
    })
    .join("");

  mpResults.className = "mp-results";
  mpResults.innerHTML = `
    <div class="mp-summary">
      <strong>${escapeHtml(result.message || "Dados do Materials Project.")}</strong>
      <span>Sistema: ${escapeHtml(result.chemsys || result.query || "")}</span>
      ${linkHtml}
    </div>
    ${cards}
  `;
}

function renderArticles(articles) {
  articlesList.innerHTML = "";

  if (!articles.length) {
    articlesList.innerHTML =
      '<div class="empty">Nenhum artigo encontrado para esta combinacao.</div>';
    return;
  }

  for (const article of articles) {
    const item = document.createElement("article");
    item.className = "article";

    const authors = article.authors?.length ? article.authors.join(", ") : "Autores nao informados";
    const source = article.source || "Fonte nao informada";
    const doi = article.doi ? `DOI: ${article.doi}` : "Sem DOI";
    const citations = `${article.citations || 0} citacoes`;

    item.innerHTML = `
      <div class="article-provider">${article.provider}</div>
      <a href="${article.url || "#"}" target="_blank" rel="noreferrer">${article.title}</a>
      <div class="article-meta">${authors}</div>
      <div class="article-meta">${article.year || "Ano desconhecido"} - ${source} - ${doi} - ${citations}</div>
    `;
    articlesList.append(item);
  }
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawAtomicJunction(components) {
  const ctx = clearCanvas(atomicCanvas);
  const atoms = [];
  const totalAtoms = 90;

  components.forEach((component) => {
    const count = Math.max(3, Math.round(component.fraction * totalAtoms));
    for (let i = 0; i < count; i += 1) {
      atoms.push(component);
    }
  });

  atoms.forEach((component, index) => {
    const col = index % 15;
    const row = Math.floor(index / 15);
    const jitterX = Math.sin(index * 1.7) * 8;
    const jitterY = Math.cos(index * 2.1) * 8;
    const x = 45 + col * 45 + jitterX;
    const y = 48 + row * 45 + jitterY;
    const radius = Math.max(9, Math.min(22, component.atomic_radius_pm / 8));

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = component.color || "#8fa3ad";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(20, 30, 30, 0.25)";
    ctx.stroke();

    ctx.fillStyle = "#18201f";
    ctx.font = "700 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(component.symbol || component.formula, x, y + 4);
  });

  ctx.fillStyle = "#66716d";
  ctx.font = "13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Distribuicao aproximada por fracao e raio atomico", 18, atomicCanvas.height - 16);
}

function latticePoints(structure) {
  const points = [];
  const base = [
    [0, 0], [1, 0], [0, 1], [1, 1],
  ];

  if (structure.includes("fcc")) {
    points.push(...base, [0.5, 0.5], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1]);
  } else if (structure.includes("bcc")) {
    points.push(...base, [0.5, 0.5]);
  } else if (structure.includes("hcp") || structure.includes("hexagonal")) {
    points.push([0.15, 0.2], [0.5, 0.05], [0.85, 0.2], [0.85, 0.65], [0.5, 0.85], [0.15, 0.65], [0.5, 0.42]);
  } else if (structure.includes("diamante")) {
    points.push(...base, [0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]);
  } else if (structure.includes("ortorrombica")) {
    points.push([0.10, 0.18], [0.42, 0.18], [0.78, 0.18], [0.22, 0.50], [0.58, 0.50], [0.90, 0.50], [0.10, 0.82], [0.42, 0.82], [0.78, 0.82]);
  } else {
    points.push([0.18, 0.22], [0.48, 0.12], [0.78, 0.28], [0.24, 0.62], [0.58, 0.55], [0.82, 0.78], [0.42, 0.86]);
  }
  return points;
}

function drawCrystal(simulation) {
  const ctx = clearCanvas(crystalCanvas);
  const components = simulation.componentes || [];
  const structure = String(simulation.estrutura_predominante || "amorfa").toLowerCase();
  const structureStatus = String(simulation.estrutura_confirmada || "").toLowerCase();
  const confirmed = structureStatus === "sim";
  const estimated = structureStatus === "estimada";
  const points = latticePoints(structure);
  const cells = [
    [55, 48], [240, 48], [425, 48],
    [145, 190], [330, 190], [515, 190],
  ];

  cells.forEach(([originX, originY], cellIndex) => {
    ctx.strokeStyle = estimated ? "rgba(232, 93, 63, 0.34)" : "rgba(17, 97, 91, 0.32)";
    ctx.lineWidth = 2;
    if (estimated) {
      ctx.setLineDash([7, 6]);
    }
    ctx.strokeRect(originX, originY, 120, 120);
    ctx.setLineDash([]);

    points.forEach(([px, py], pointIndex) => {
      const component = components[(pointIndex + cellIndex) % Math.max(components.length, 1)] || {};
      const x = originX + px * 120;
      const y = originY + py * 120;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = component.color || "#8fa3ad";
      ctx.fill();
      ctx.strokeStyle = "rgba(30, 35, 33, 0.25)";
      ctx.stroke();
    });
  });

  ctx.fillStyle = "#1d2321";
  ctx.font = "700 16px Arial";
  ctx.fillText(`Estrutura: ${simulation.estrutura_predominante}`, 18, 24);
  ctx.fillStyle = "#66716d";
  ctx.font = "13px Arial";
  if (estimated) {
    ctx.fillText("Estimativa por componentes: nao e rede confirmada por artigo/API.", 18, crystalCanvas.height - 16);
  } else if (!confirmed) {
    ctx.fillText("Rede nao confirmada por fonte externa.", 18, crystalCanvas.height - 16);
  } else {
    ctx.fillText("Representacao simplificada da celula/rede confirmada", 18, crystalCanvas.height - 16);
  }
}

function parseFormula(formula) {
  const counts = new Map();
  const matches = String(formula || "").matchAll(/([A-Z][a-z]?)(\d*\.?\d*)/g);
  for (const match of matches) {
    const symbol = match[1];
    const amount = match[2] ? Number(match[2]) : 1;
    counts.set(symbol, (counts.get(symbol) || 0) + (Number.isFinite(amount) ? amount : 1));
  }
  return [...counts.entries()].map(([symbol, amount]) => ({ symbol, amount }));
}

function atomColor(symbol, fallback = "#8fa3ad") {
  return elementColors[symbol] || fallback;
}

function drawAtom(ctx, x, y, radius, symbol, color) {
  const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, 2, x, y, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, color);
  gradient.addColorStop(1, "#23302f");

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(20, 30, 30, 0.35)";
  ctx.stroke();

  ctx.fillStyle = symbol === "C" ? "#ffffff" : "#18201f";
  ctx.font = `700 ${Math.max(10, radius * 0.75)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, x, y + 1);
}

function drawBond(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "rgba(55, 67, 64, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function formulaElementsForStructure(component, maxElements = 6) {
  const parsed = parseFormula(component?.formula || component?.symbol || "");
  if (parsed.length) {
    return parsed.slice(0, maxElements);
  }
  return [{ symbol: component?.symbol || "M", amount: 1 }];
}

function drawPerovskiteStructure(ctx, elements, width, height) {
  const [a = { symbol: "A" }, b = { symbol: "B" }, x = { symbol: "O" }] = elements;
  const cells = [
    [170, 105], [390, 105], [610, 105],
    [280, 270], [500, 270],
  ];

  cells.forEach(([cx, cy]) => {
    const size = 118;
    const corners = [
      [cx - size / 2, cy - size / 2],
      [cx + size / 2, cy - size / 2],
      [cx - size / 2, cy + size / 2],
      [cx + size / 2, cy + size / 2],
    ];
    const edges = [
      [cx, cy - size / 2],
      [cx - size / 2, cy],
      [cx + size / 2, cy],
      [cx, cy + size / 2],
    ];

    ctx.strokeStyle = "rgba(17, 97, 91, 0.22)";
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    corners.forEach(([px, py]) => drawAtom(ctx, px, py, 16, a.symbol, atomColor(a.symbol, "#b5a36f")));
    edges.forEach(([px, py]) => {
      drawBond(ctx, cx, cy, px, py);
      drawAtom(ctx, px, py, 13, x.symbol, atomColor(x.symbol, "#d94b40"));
    });
    drawAtom(ctx, cx, cy, 20, b.symbol, atomColor(b.symbol, "#9aa1aa"));
  });

  ctx.fillText("Celulas ABX3 idealizadas: A nos cantos, B no centro, X nas faces/arestas", 18, height - 18);
}

function drawHexagonalStructure(ctx, elements, width, height) {
  const primary = elements[0] || { symbol: "C" };
  const secondary = elements[1] || primary;
  const points = [];
  const dx = 48;
  const dy = 42;

  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 13; col += 1) {
      const x = 80 + col * dx + (row % 2 ? dx / 2 : 0);
      const y = 70 + row * dy;
      points.push({ x, y, symbol: (row + col) % 2 ? primary.symbol : secondary.symbol });
    }
  }

  points.forEach((p, index) => {
    for (const q of points.slice(index + 1)) {
      const distance = Math.hypot(p.x - q.x, p.y - q.y);
      if (distance < 58) {
        drawBond(ctx, p.x, p.y, q.x, q.y);
      }
    }
  });
  points.forEach((p) => drawAtom(ctx, p.x, p.y, 15, p.symbol, atomColor(p.symbol, "#2d2f33")));
  ctx.fillText("Rede em camadas/hexagonal sintetica com ligacoes no plano", 18, height - 18);
}

function drawSpinelStructure(ctx, elements, width, height) {
  const metals = elements.filter((item) => item.symbol !== "O");
  const oxygen = elements.find((item) => item.symbol === "O") || { symbol: "O" };
  const metalA = metals[0] || { symbol: "M" };
  const metalB = metals[1] || metalA;
  const nodes = [];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const x = 110 + col * 80 + (row % 2 ? 24 : 0);
      const y = 72 + row * 58;
      const symbol = (row + col) % 4 === 0 ? metalA.symbol : (row + col) % 2 === 0 ? metalB.symbol : oxygen.symbol;
      nodes.push({ x, y, symbol });
    }
  }

  nodes.forEach((p, index) => {
    for (const q of nodes.slice(index + 1)) {
      const distance = Math.hypot(p.x - q.x, p.y - q.y);
      if (distance < 90) {
        drawBond(ctx, p.x, p.y, q.x, q.y);
      }
    }
  });
  nodes.forEach((p) => {
    const radius = p.symbol === oxygen.symbol ? 13 : 18;
    drawAtom(ctx, p.x, p.y, radius, p.symbol, atomColor(p.symbol));
  });
  ctx.fillText("Rede espinelio/ferrita aproximada: sitios metalicos e sub-rede de oxigenio", 18, height - 18);
}

function drawOrthorhombicStructure(ctx, elements, width, height) {
  const symbols = elements.length ? elements.map((item) => item.symbol) : ["A", "B"];
  const layers = [74, 138, 210, 284];

  layers.forEach((y, layerIndex) => {
    for (let col = 0; col < 12; col += 1) {
      const x = 80 + col * 72 + (layerIndex % 2 ? 26 : 0);
      const symbol = symbols[(col + layerIndex) % symbols.length];
      if (col > 0) {
        drawBond(ctx, x - 72, y, x, y);
      }
      if (layerIndex > 0 && col % 2 === 0) {
        drawBond(ctx, x, layers[layerIndex - 1], x, y);
      }
      drawAtom(ctx, x, y, symbol === "O" ? 12 : 17, symbol, atomColor(symbol));
    }
  });
  ctx.fillText("Camadas ortorrombicas/ionicas aproximadas com empilhamento anisotropico", 18, height - 18);
}

function drawPolymerStructure(ctx, elements, width, height) {
  const symbols = elements.length ? elements.map((item) => item.symbol) : ["C", "H"];
  const points = [];
  for (let i = 0; i < 18; i += 1) {
    points.push({
      x: 70 + i * 48,
      y: 210 + Math.sin(i * 0.8) * 54,
      symbol: symbols[i % symbols.length],
    });
  }
  points.forEach((p, index) => {
    if (index > 0) {
      const previous = points[index - 1];
      drawBond(ctx, previous.x, previous.y, p.x, p.y);
    }
    drawAtom(ctx, p.x, p.y, p.symbol === "H" ? 10 : 15, p.symbol, atomColor(p.symbol));
  });
  ctx.fillText("Cadeia polimerica esquematica baseada na formula repetitiva", 18, height - 18);
}

function drawGenericAtomicStructure(ctx, elements, width, height) {
  const symbols = elements.length ? elements.map((item) => item.symbol) : ["M"];
  const nodes = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      nodes.push({
        x: 80 + col * 72 + Math.sin(row + col) * 10,
        y: 76 + row * 58 + Math.cos(row * col + 1) * 10,
        symbol: symbols[(row + col) % symbols.length],
      });
    }
  }
  nodes.forEach((p, index) => {
    for (const q of nodes.slice(index + 1)) {
      const distance = Math.hypot(p.x - q.x, p.y - q.y);
      if (distance < 82) {
        drawBond(ctx, p.x, p.y, q.x, q.y);
      }
    }
  });
  nodes.forEach((p) => drawAtom(ctx, p.x, p.y, 15, p.symbol, atomColor(p.symbol)));
  ctx.fillText("Arranjo atomico aproximado a partir da formula do material", 18, height - 18);
}

function drawAtomicStructure(simulation) {
  const ctx = clearCanvas(atomicStructureCanvas);
  const components = simulation.componentes || [];
  const primary = [...components].sort((a, b) => b.fraction - a.fraction)[0] || {};
  const maxElements = Number(simulation.xrd?.number_of_elements) || 6;
  const elements = formulaElementsForStructure(primary, maxElements);
  const structure = String(primary.crystal_structure || simulation.estrutura_predominante || "").toLowerCase();
  const category = String(primary.category || "").toLowerCase();

  ctx.fillStyle = "#1d2321";
  ctx.font = "700 17px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${primary.name || "Material"} (${primary.formula || "formula"})`, 18, 28);
  ctx.fillStyle = "#66716d";
  ctx.font = "13px Arial";
  ctx.fillText(`Modelo visual: ${primary.crystal_structure || simulation.estrutura_predominante || "estrutura estimada"}`, 18, 48);

  if (structure.includes("perovskita")) {
    drawPerovskiteStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  } else if (structure.includes("espinelio") || category.includes("ferrita")) {
    drawSpinelStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  } else if (structure.includes("hexagonal") || structure.includes("camadas") || category.includes("2d")) {
    drawHexagonalStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  } else if (structure.includes("ortorrombica") || structure.includes("ionico")) {
    drawOrthorhombicStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  } else if (category.includes("polimero") || structure.includes("amorfa")) {
    drawPolymerStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  } else {
    drawGenericAtomicStructure(ctx, elements, atomicStructureCanvas.width, atomicStructureCanvas.height);
  }
}

function normalizedValue(value, values) {
  const positives = values.filter((item) => item > 0);
  const max = Math.max(...positives, 1);
  if (max > 100000) {
    return Math.log10(Math.max(value, 1e-12)) / Math.log10(max);
  }
  return value / max;
}

function drawPropertyChart(components) {
  const ctx = clearCanvas(propertyChart);
  const left = 150;
  const top = 35;
  const rowHeight = 52;
  const chartWidth = propertyChart.width - left - 40;

  ctx.fillStyle = "#1d2321";
  ctx.font = "700 16px Arial";
  ctx.fillText("Barras normalizadas por propriedade", 18, 22);

  chartMetrics.forEach(([key, label], rowIndex) => {
    const y = top + rowIndex * rowHeight;
    const values = components.map((component) => Number(component[key]) || 0);
    ctx.fillStyle = "#66716d";
    ctx.font = "13px Arial";
    ctx.fillText(label, 18, y + 18);

    components.forEach((component, index) => {
      const width = normalizedValue(values[index], values) * (chartWidth / components.length - 12);
      const x = left + index * (chartWidth / components.length);
      ctx.fillStyle = component.color || "#8fa3ad";
      ctx.fillRect(x, y, Math.max(2, width), 24);
      ctx.fillStyle = "#1d2321";
      ctx.font = "11px Arial";
      ctx.fillText(component.symbol || component.formula, x, y + 42);
    });
  });
}

function xrdRange(xrd) {
  const xMin = Number(xrd?.x_min ?? 5);
  const xMax = Number(xrd?.x_max ?? 95);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
    return { xMin: 5, xMax: 95 };
  }
  return { xMin, xMax };
}

function niceTickStep(span) {
  const raw = Math.max(span / 5, 0.1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function drawXrdChart(xrd) {
  const ctx = clearCanvas(xrdChart);
  const { xMin, xMax } = xrdRange(xrd);
  const peaks = (xrd?.picos || []).filter(
    (peak) => peak.two_theta_deg >= xMin && peak.two_theta_deg <= xMax
  );
  const profile = (xrd?.perfil || []).filter(
    (point) => point.two_theta_deg >= xMin && point.two_theta_deg <= xMax
  );
  const left = 66;
  const right = 34;
  const top = 60;
  const bottom = 58;
  const width = xrdChart.width - left - right;
  const height = xrdChart.height - top - bottom;
  const xForTheta = (theta) => left + ((theta - xMin) / (xMax - xMin)) * width;
  const yForIntensity = (intensity) => top + height - (Math.max(0, intensity) / 100) * height;

  ctx.fillStyle = "#f8fbf8";
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = "#1d2321";
  ctx.font = "700 19px Arial";
  ctx.fillText(
    `DRX: lambda ${formatValue(xrd?.comprimento_onda_a || 1.5406)} A | ${xMin} a ${xMax} 2theta`,
    left,
    28
  );
  ctx.fillStyle = "#66716d";
  ctx.font = "12px Arial";
  ctx.fillText(`Passo ${formatValue(xrd?.x_step ?? 0.05)} | picos ${peaks.length}`, left, 48);

  ctx.strokeStyle = "#d9ded8";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const y = top + (height / 8) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#1d2321";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();

  if (profile.length) {
    ctx.strokeStyle = "rgba(17, 97, 91, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    profile.forEach((point, index) => {
      const x = xForTheta(point.two_theta_deg);
      const y = yForIntensity(point.intensity);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  peaks.forEach((peak) => {
    const x = xForTheta(peak.two_theta_deg);
    const barHeight = (peak.relative_intensity / 100) * height;
    ctx.strokeStyle = peak.color || "#11615b";
    ctx.lineWidth = peak.relative_intensity > 55 ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(x, top + height);
    ctx.lineTo(x, top + height - barHeight);
    ctx.stroke();

    if (peak.relative_intensity > 35) {
      ctx.save();
      ctx.translate(x + 4, top + height - barHeight - 4);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#1d2321";
      ctx.font = peak.relative_intensity > 55 ? "700 12px Arial" : "11px Arial";
      ctx.fillText(`${peak.symbol} ${peak.hkl}`, 0, 0);
      ctx.restore();
    }
  });

  ctx.fillStyle = "#66716d";
  ctx.font = "13px Arial";
  ctx.fillText("2 theta (graus)", left + width / 2 - 42, xrdChart.height - 14);
  ctx.save();
  ctx.translate(20, top + height / 2 + 46);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Intensidade relativa", 0, 0);
  ctx.restore();

  const tickStep = niceTickStep(xMax - xMin);
  for (let t = Math.ceil(xMin / tickStep) * tickStep; t <= xMax; t += tickStep) {
    const x = xForTheta(t);
    ctx.fillText(formatValue(Number(t.toFixed(2))), x - 8, top + height + 18);
  }
}

function drawXrdImage(xrd) {
  const ctx = clearCanvas(xrdImage);
  const { xMin, xMax } = xrdRange(xrd);
  const peaks = (xrd?.picos || []).filter(
    (peak) => peak.two_theta_deg >= xMin && peak.two_theta_deg <= xMax
  );
  const cx = xrdImage.width / 2;
  const cy = xrdImage.height / 2;
  const maxRadius = Math.min(cx, cy) - 28;

  const gradient = ctx.createRadialGradient(cx, cy, 8, cx, cy, maxRadius);
  gradient.addColorStop(0, "#f7f5ef");
  gradient.addColorStop(1, "#1d2321");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, xrdImage.width, xrdImage.height);

  peaks.forEach((peak) => {
    const radius = 24 + ((peak.two_theta_deg - xMin) / (xMax - xMin)) * maxRadius;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = peak.color || "#e85d3f";
    ctx.globalAlpha = 0.18 + Math.min(0.7, peak.relative_intensity / 140);
    ctx.lineWidth = 1 + peak.relative_intensity / 22;
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "13px Arial";
  ctx.fillText(`Aneis sinteticos: ${xMin} a ${xMax} 2theta`, 18, xrdImage.height - 18);
}

function renderVisuals(simulation) {
  state.lastSimulation = simulation;
  drawAtomicJunction(simulation.componentes || []);
  drawCrystal(simulation);
  drawAtomicStructure(simulation);
  drawPropertyChart(simulation.componentes || []);
  drawXrdChart(simulation.xrd);
  drawXrdImage(simulation.xrd);
}

async function runSimulation() {
  const composition = getComposition();
  if (!Object.keys(composition).length) {
    setStatus("Adicione pelo menos um material com fracao maior que zero.");
    return;
  }

  runButton.disabled = true;
  setStatus("Simulando composicao e buscando artigos...");
  const xrdSettings = getXrdSettings();

  try {
    const [simulationData, researchData, mpData] = await Promise.all([
      api("/api/simulate", {
        method: "POST",
        body: JSON.stringify({ composition, xrd: xrdSettings }),
      }),
      api("/api/research", {
        method: "POST",
        body: JSON.stringify({ composition, query: researchQuery.value }),
      }),
      api("/api/materials-project", {
        method: "POST",
        body: JSON.stringify({
          composition,
          query: mpQuery?.value || "",
          limit: mpLimit?.value || 8,
        }),
      }),
    ]);

    renderMetrics(simulationData.simulation);
    renderVisuals(simulationData.simulation);
    renderArticles(researchData.results);
    renderMaterialsProject(mpData.materials_project);

    const searchUrl = `https://openalex.org/works?page=1&filter=default.search:${encodeURIComponent(
      researchData.query
    )}`;
    queryLink.href = searchUrl;
    setStatus(`Busca usada: ${researchData.query}`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    runButton.disabled = false;
  }
}

async function runMaterialsProjectSearch() {
  const composition = getComposition();
  if (mpButton) {
    mpButton.disabled = true;
  }
  try {
    const data = await api("/api/materials-project", {
      method: "POST",
      body: JSON.stringify({
        composition,
        query: mpQuery?.value || "",
        limit: mpLimit?.value || 8,
      }),
    });
    renderMaterialsProject(data.materials_project);
  } catch (error) {
    renderMaterialsProject({ message: error.message, results: [], links: {} });
  } finally {
    if (mpButton) {
      mpButton.disabled = false;
    }
  }
}

async function runStoichiometry() {
  if (!stoichEquation?.value.trim()) {
    renderStoichiometryError("Digite uma equacao quimica para calcular.");
    return;
  }
  if (stoichButton) {
    stoichButton.disabled = true;
  }

  try {
    const data = await api("/api/stoichiometry", {
      method: "POST",
      body: JSON.stringify({
        equation: stoichEquation.value,
        manual_coefficients: stoichCoefficients?.value || "",
        base_species: stoichBase?.value || "",
        quantity: stoichQuantity?.value || 1,
        unit: stoichUnit?.value || "mol",
      }),
    });
    renderStoichiometry(data.stoichiometry);
  } catch (error) {
    renderStoichiometryError(error.message);
  } finally {
    if (stoichButton) {
      stoichButton.disabled = false;
    }
  }
}

async function init() {
  setStatus("Carregando materiais...");
  const data = await api("/api/materials");
  state.materials = data.materials;

  addRow("aluminio", 0.55);
  addRow("cobre", 0.25);
  addRow("silicio", 0.20);
  setStatus("Pronto para simular.");
  await Promise.all([runSimulation(), runStoichiometry()]);
}

addRowButton.addEventListener("click", () => addRow());
runButton.addEventListener("click", runSimulation);
mpButton?.addEventListener("click", runMaterialsProjectSearch);
mpQuery?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runMaterialsProjectSearch();
  }
});
stoichButton?.addEventListener("click", runStoichiometry);
stoichEquation?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runStoichiometry();
  }
});
materialSearch?.addEventListener("input", refreshMaterialSelects);
window.addEventListener("resize", () => {
  if (state.lastSimulation) {
    renderVisuals(state.lastSimulation);
  }
});
init().catch((error) => setStatus(error.message));
