// Tiny CLI parser shared by the scripts: --key value | --key=value | --flag
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [], param: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let [k, v] = a.slice(2).split('=');
    if (v === undefined) {
      const n = argv[i + 1];
      if (n !== undefined && !n.startsWith('--')) { v = n; i++; } else v = true;
    }
    if (k === 'param') out.param.push(v); else out[k] = v;
  }
  return out;
}

export function outputName({ mode, width, height, preset }) {
  return `holographic-ai-core_${mode}${preset && preset !== 'default' ? '_' + preset : ''}_${width}x${height}`;
}
