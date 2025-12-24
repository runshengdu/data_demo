// Shared benchmark data (mock values)
const benchmarks = ["MRCR", "Tau2Bench", "VitaBench", "MultiChallenge", "IFBench"];

function normalizeScore(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const num = Number(trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function formatPercent(value) {
  const num = normalizeScore(value);
  const decimals = Number.isInteger(num) ? 0 : 2;
  return `${num.toFixed(decimals)}%`;
}

const models = [
  { name: "GPT-5.2", provider: "OpenAI", scores: { MRCR: 99.74, Tau2Bench: 52, VitaBench: 28, MultiChallenge: 58.48, IFBench: 70.87 } },
  { name: "Claude-Sonnet-4.5", provider: "Anthropic", scores: { MRCR: 82.38, Tau2Bench: 54, VitaBench: 22, MultiChallenge: 54.77, IFBench: 51.98 } },
  { name: "Gemini-3-flash-preview", provider: "Google", scores: { MRCR: 98.78, Tau2Bench: 64, VitaBench: 1, MultiChallenge: 63.41, IFBench: 69.21 } },
  { name: "Gemini-3-pro-preview", provider: "Google", scores: { MRCR: 98.40, Tau2Bench: 58, VitaBench: 1, MultiChallenge: 68.15, IFBench: 59.26 } },
  { name: "GLM-4.6", provider: "智谱", scores: { MRCR: 74.20, Tau2Bench: 52, VitaBench: 1, MultiChallenge: 46.09, IFBench: 48.80 } },
  { name: "GLM-4.7", provider: "智谱", scores: { MRCR: 0, Tau2Bench: 0, VitaBench: 0, MultiChallenge: 0, IFBench: 0 } },
  { name: "Minimax-m2", provider: "Minimax", scores: { MRCR: 51.58, Tau2Bench: 58, VitaBench: 1, MultiChallenge: 57.38, IFBench: 70.92 } },
  { name: "Minimax-m2.1", provider: "Minimax", scores: { MRCR: 60.07, Tau2Bench: 58, VitaBench: 5, MultiChallenge: 49.64, IFBench: 51.84 } },
  { name: "Kimi-k2", provider: "Kimi", scores: { MRCR: 66.43, Tau2Bench: 54, VitaBench: 10, MultiChallenge: 58.87, IFBench: 63.49 } },
  { name: "Deepseek-v3.2", provider: "Deepseek", scores: { MRCR: 79.03, Tau2Bench: 54, VitaBench: 24, MultiChallenge: 47.37, IFBench: 59.55 } },
];
