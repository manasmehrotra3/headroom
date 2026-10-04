/**
 * Online food lookups, used only when the local database has no match.
 *   USDA FoodData Central: free key from https://api.data.gov/signup, set EXPO_PUBLIC_USDA_API_KEY in .env.local
 *   Open Food Facts: no key; used for barcodes on packaged foods.
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
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

export async function lookupBarcode(barcode: string): Promise<LookupResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,serving_size,nutriments`;
  const response = await fetch(url, { headers: { 'User-Agent': 'PersonalFitnessApp/0.1 (personal use)' } });
  if (!response.ok) return null;
  const json = (await response.json()) as { status?: number; product?: OffProduct };
  if (!json.product || json.status === 0) return null;
  const n = json.product.nutriments ?? {};
  const num = (key: string) => Number(n[key] ?? 0) || 0;
  const servings = [{ label: '100 g', grams: 100 }];
  const servingGrams = Number.parseFloat(String(json.product.serving_size ?? ''));
  if (servingGrams > 0) servings.unshift({ label: `1 serving (${json.product.serving_size})`, grams: servingGrams });
  return {
    id: `off:${barcode}`,
    name: `${json.product.product_name ?? 'Unknown product'}${json.product.brands ? ` (${json.product.brands})` : ''}`,
    source: 'off',
    sourceRef: `Open Food Facts ${barcode}`,
    per100: { kcal: num('energy-kcal_100g'), proteinG: num('proteins_100g'), carbsG: num('carbohydrates_100g'), fatG: num('fat_100g'), fiberG: num('fiber_100g') },
    servings,
  };
}
