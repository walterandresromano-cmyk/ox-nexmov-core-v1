import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function normalizeCatalogRow(row) {
  return {
    brandId: row.brand_id ? String(row.brand_id) : null,
    brandName: row.brand_name || "",
    modelId: row.model_id ? String(row.model_id) : null,
    modelName: row.model_name || "",
    versionId: row.version_id ? String(row.version_id) : null,
    versionName: row.version_name || "",
  };
}

export async function listVehicleCatalog() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      catalog: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("get_vehicle_catalog");

  if (error) {
    return {
      catalog: [],
      error,
    };
  }

  return {
    catalog: (data || []).map(normalizeCatalogRow),
    error: null,
  };
}

export function buildCatalogTree(catalogRows = []) {
  const brandsMap = new Map();

  catalogRows.forEach((row) => {
    if (!row.brandId || !row.brandName) return;

    if (!brandsMap.has(row.brandId)) {
      brandsMap.set(row.brandId, {
        id: row.brandId,
        name: row.brandName,
        models: [],
        modelsMap: new Map(),
      });
    }

    const brand = brandsMap.get(row.brandId);

    if (!row.modelId || !row.modelName) return;

    if (!brand.modelsMap.has(row.modelId)) {
      brand.modelsMap.set(row.modelId, {
        id: row.modelId,
        name: row.modelName,
        versions: [],
      });
    }

    const model = brand.modelsMap.get(row.modelId);

    if (row.versionId && row.versionName) {
      const versionExists = model.versions.some(
        (version) => version.id === row.versionId
      );

      if (!versionExists) {
        model.versions.push({
          id: row.versionId,
          name: row.versionName,
        });
      }
    }
  });

  return Array.from(brandsMap.values()).map((brand) => ({
    id: brand.id,
    name: brand.name,
    models: Array.from(brand.modelsMap.values()).map((model) => ({
      ...model,
      versions: model.versions.sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      ),
    })),
  }));
}

export function flattenCatalogSuggestions(catalogRows = []) {
  const suggestions = [];

  const seen = new Set();

  catalogRows.forEach((row) => {
    if (row.brandName) {
      const key = `brand-${row.brandName}`;

      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          type: "brand",
          label: row.brandName,
          searchValue: row.brandName,
        });
      }
    }

    if (row.brandName && row.modelName) {
      const key = `model-${row.brandName}-${row.modelName}`;

      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          type: "model",
          label: `${row.brandName} ${row.modelName}`,
          searchValue: `${row.brandName} ${row.modelName}`,
        });
      }
    }

    if (row.brandName && row.modelName && row.versionName) {
      const key = `version-${row.brandName}-${row.modelName}-${row.versionName}`;

      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          type: "version",
          label: `${row.brandName} ${row.modelName} ${row.versionName}`,
          searchValue: `${row.brandName} ${row.modelName} ${row.versionName}`,
        });
      }
    }
  });

  return suggestions;
}