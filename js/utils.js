(function () {
  function mm(value) {
    return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)} mm`;
  }

  function clampPositive(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function downloadTextFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function createSvgNode(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function sanitizeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  window.CupulaUtils = {
    mm,
    round,
    clampPositive,
    downloadTextFile,
    createSvgNode,
    sanitizeNumber,
  };
})();