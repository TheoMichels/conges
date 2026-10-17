import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";

// Setup TypeScript runtime transpiler loader for direct TS module imports
const require = createRequire(import.meta.url);
const tsPath = require.resolve("typescript");

const loaderSource = `
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

let ts;
export async function initialize(data) {
  ts = (await import(pathToFileURL(data.tsPath).href)).default;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: result.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

const loaderUrl = "data:text/javascript," + encodeURIComponent(loaderSource);
register(loaderUrl, import.meta.url, { data: { tsPath } });

const { gradient, colors, shadows, radius, spacing, fonts } = await import(
  "../src/theme/colors.ts"
);

describe("Design Tokens — stack-target.md §2 conformance", () => {
  it("exports required gradient structure with 4 shades", () => {
    assert.ok(gradient, "gradient must be exported");
    assert.equal(Array.isArray(gradient.colors), true);
    assert.equal(gradient.colors.length, 4, "gradient must contain 4 colors");
    assert.deepEqual(gradient.locations, [0, 0.35, 0.7, 1]);
    assert.deepEqual(gradient.start, { x: 0, y: 0 });
    assert.deepEqual(gradient.end, { x: 1, y: 1 });
  });

  it("exports all mandatory color keys according to section §2", () => {
    assert.ok(colors, "colors must be exported");

    const requiredKeys = [
      "brand",
      "brandMuted",
      "primary",
      "primaryLight",
      "primarySoft",
      "primaryBackground",
      "textPrimary",
      "textSecondary",
      "textMuted",
      "textOnBrand",
      "panel",
      "panelSubtle",
      "surface",
      "surfaceActive",
      "border",
      "borderStrong",
      "divider",
      "warning",
      "warningSoft",
      "danger",
      "dangerSoft",
      "positive",
      "positiveSoft",
      "backdrop",
    ];

    for (const key of requiredKeys) {
      assert.ok(
        key in colors,
        `Missing required color key: "${key}" in colors export`
      );
      assert.equal(typeof colors[key], "string");
      assert.ok(colors[key].length > 0);
    }
  });

  it("exports backward compatibility aliases", () => {
    assert.equal(colors.accent, colors.primary);
    assert.equal(colors.accentSoft, colors.primaryLight);
    assert.equal(typeof colors.sidebar, "string");
  });

  it("exports shadows with sm, md, lg levels", () => {
    assert.ok(shadows, "shadows must be exported");
    for (const level of ["sm", "md", "lg"]) {
      assert.ok(level in shadows, `Missing shadow level: ${level}`);
      assert.ok(shadows[level].shadowColor);
      assert.ok(typeof shadows[level].shadowOpacity === "number");
    }
  });

  it("exports radius scale strictly matching { sm: 12, md: 16, lg: 20, xl: 24 }", () => {
    assert.ok(radius, "radius must be exported");
    assert.deepEqual(radius, { sm: 12, md: 16, lg: 20, xl: 24 });
  });

  it("exports spacing scale { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }", () => {
    assert.ok(spacing, "spacing must be exported");
    assert.deepEqual(spacing, {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      xxl: 32,
    });
  });

  it("maintains font definition", () => {
    assert.ok(fonts?.base, "fonts.base must exist");
  });
});
