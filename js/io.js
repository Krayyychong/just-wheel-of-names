export function serializeState(state) {
  return JSON.stringify(state, null, 2);
}

export function parseImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON file.' };
  }
  if (parsed?.version !== 1) {
    return { ok: false, error: `Unsupported version: ${parsed?.version}` };
  }
  if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.prizes)) {
    return { ok: false, error: 'Missing entries or prizes.' };
  }
  return { ok: true, state: parsed };
}

export function downloadStateAsFile(state, filename) {
  const blob = new Blob([serializeState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
