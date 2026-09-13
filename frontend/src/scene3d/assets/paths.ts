export const PRODUCTION = {
  fisherman: "/models/production/fisherman.glb",
  rod: "/models/production/rod.glb",
  pike: "/models/production/pike.glb",
} as const;

export const DEBUG_PROXY = {
  fisherman: "/models/rig3d/fisherman.glb",
  rod: "/models/rig3d/rod.glb",
  pike: "/models/rig3d/pike.glb",
} as const;

export type AssetKind = keyof typeof PRODUCTION;
export type AssetSource = "production" | "debug";

export type ResolvedAssets = {
  fisherman: string;
  rod: string;
  pike: string;
  source: Record<AssetKind, AssetSource>;
  productionPresent: Record<AssetKind, boolean>;
};

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 12) return false;
    const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
    return magic === "glTF";
  } catch {
    return false;
  }
}

export async function resolveProductionAssets(): Promise<ResolvedAssets> {
  const kinds = ["fisherman", "rod", "pike"] as const;
  const productionPresent = { fisherman: false, rod: false, pike: false };
  const source: ResolvedAssets["source"] = {
    fisherman: "debug",
    rod: "debug",
    pike: "debug",
  };
  const urls: Record<AssetKind, string> = {
    fisherman: DEBUG_PROXY.fisherman,
    rod: DEBUG_PROXY.rod,
    pike: DEBUG_PROXY.pike,
  };

  await Promise.all(
    kinds.map(async (kind) => {
      const ok = await probe(PRODUCTION[kind]);
      productionPresent[kind] = ok;
      if (ok) {
        urls[kind] = PRODUCTION[kind];
        source[kind] = "production";
      }
    }),
  );

  return { fisherman: urls.fisherman, rod: urls.rod, pike: urls.pike, source, productionPresent };
}
