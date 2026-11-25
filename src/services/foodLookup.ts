/**
 * Online food lookups, used when the local IFCT/INDB database has no match:
 *   - Open Food Facts India (`in.openfoodfacts.org`): free, no API key — text search & barcode scan
 *   - USDA FoodData Central: free key from https://api.data.gov/signup, set EXPO_PUBLIC_USDA_API_KEY in .env.local
 * Results are copied into the local foods table so they work offline afterwards.
 */
import type { Macros } from '@/domain/nutrition/types';

export interface LookupResult {
  id: string;
  name: string;
  source: 'usda' | 'off';
  sourceRef: string;
  per100: Macros;
  servings: { label: string; grams: number }[];
}

const USDA_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? '';
const OFF_HEADERS = { 'User-Agent': 'HeadroomFitnessApp/0.18 (personal use)' };

export function hasUsdaKey(): boolean {
  return USDA_KEY.length > 0;
}

interface UsdaNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
}

const nutrient = (food: UsdaFood, id: number) => food.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? 0;

export async function searchUsda(query: string): Promise<LookupResult[]> {
  if (!USDA_KEY) throw new Error('Add EXPO_PUBLIC_USDA_API_KEY to .env.local (free key from api.data.gov).');
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${encodeURIComponent(query)}&pageSize=15&dataType=Foundation,SR%20Legacy,Branded`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`USDA search failed (${response.status})`);
  const json = (await response.json()) as { foods?: UsdaFood[] };
  return (json.foods ?? []).map((f) => {
    const servings = [{ label: '100 g', grams: 100 }];
    if (f.servingSize && f.servingSizeUnit?.toLowerCase() === 'g') servings.unshift({ label: f.householdServingFullText || `1 serving (${f.servingSize} g)`, grams: f.servingSize });
    return {
      id: `usda:${f.fdcId}`,
      name: f.brandName ? `${f.description} (${f.brandName})` : f.description,
      source: 'usda' as const,
      sourceRef: `USDA FDC ${f.fdcId}`,
      // 1008 energy kcal, 1003 protein, 1005 carbohydrate, 1004 fat, 1079 fibre
      per100: { kcal: nutrient(f, 1008), proteinG: nutrient(f, 1003), carbsG: nutrient(f, 1005), fatG: nutrient(f, 1004), fiberG: nutrient(f, 1079) },
      servings,
    };
  });
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function parseOffProduct(product: OffProduct, fallbackCode?: string): LookupResult | null {
  const name = product.product_name?.trim();
  const code = product.code?.trim() || fallbackCode;
  if (!name || !code) return null;
  const n = product.nutriments ?? {};
  const num = (key: string) => Number(n[key] ?? 0) || 0;
  const kcal = num('energy-kcal_100g') || Math.round(num('energy_100g') / 4.184);
  const proteinG = num('proteins_100g');
  const carbsG = num('carbohydrates_100g');
  const fatG = num('fat_100g');
  const fiberG = num('fiber_100g');
  if (kcal <= 0 && proteinG <= 0 && carbsG <= 0 && fatG <= 0) return null;
  const servings = [{ label: '100 g', grams: 100 }];
  const servingGrams = Number.parseFloat(String(product.serving_size ?? ''));
  if (servingGrams > 0 && servingGrams <= 1000) servings.unshift({ label: `1 serving (${product.serving_size})`, grams: servingGrams });
  const brand = product.brands?.split(',')[0]?.trim();
  return {
    id: `off:${code}`,
    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    source: 'off',
    sourceRef: `Open Food Facts India ${code}`,
    per100: { kcal, proteinG, carbsG, fatG, fiberG },
    servings,
  };
}

/** Free text search against Open Food Facts India (no API key needed). */
export async function searchOpenFoodFactsIndia(query: string): Promise<LookupResult[]> {
  const url = `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,serving_size,nutriments`;
  const response = await fetch(url, { headers: OFF_HEADERS });
  if (!response.ok) throw new Error(`Open Food Facts search failed (${response.status})`);
  const json = (await response.json()) as { products?: OffProduct[] };
  const results: LookupResult[] = [];
  const seen = new Set<string>();
  for (const p of json.products ?? []) {
    const parsed = parseOffProduct(p);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    results.push(parsed);
  }
  return results;
}

export async function lookupBarcode(barcode: string): Promise<LookupResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments`;
  const response = await fetch(url, { headers: OFF_HEADERS });
  if (!response.ok) return null;
  const json = (await response.json()) as { status?: number; product?: OffProduct };
  if (!json.product || json.status === 0) return null;
  return parseOffProduct(json.product, barcode);
}
