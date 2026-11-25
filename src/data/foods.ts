/**
 * Seed food database: Indian vegetarian ingredients and home-style dishes.
 *
 * Values are per 100 g. Ingredients are taken from the Indian Food Composition Tables
 * (IFCT 2017, NIN Hyderabad) and marked source "IFCT 2017"; where a food isn't in IFCT,
 * USDA or a typical label value is used and noted. Dishes are computed from typical home
 * recipes and are flagged `isEstimate: true`: your dal may well differ, so treat those as
 * ballpark and adjust portions to taste.
 *
 * Household servings (1 roti, 1 katori, 1 cup) are typical Indian portions in grams.
 */
import type { FoodItem, MealSlot } from '@/domain/nutrition/types';
import { REGIONAL_GROCERY_BY_DISH, REGIONAL_INDIAN_DISHES } from './indianRegionalFoods';

export interface SeedFood {
  id: string;
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  source: string;
  isEstimate: boolean;
  isDish: boolean;
  slots: MealSlot[];
  tags: string[];
  servings: { label: string; grams: number; isDefault: boolean }[];
}

const g = (grams: number, label = `${grams} g`, isDefault = false) => ({ label, grams, isDefault });

const IFCT = 'IFCT 2017';
const EST = 'recipe estimate';

// ───────────────────────────── ingredients (not dishes) ─────────────────────────────
const INGREDIENTS: SeedFood[] = [
  // grains & flours
  { id: 'rice_cooked', name: 'Rice, cooked (white)', kcal100: 130, protein100: 2.7, carbs100: 28.2, fat100: 0.3, fiber100: 0.4, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 cup cooked', true), g(100, '1 katori')] },
  { id: 'brown_rice_cooked', name: 'Brown rice, cooked', kcal100: 123, protein100: 2.7, carbs100: 25.6, fat100: 1.0, fiber100: 1.6, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 cup cooked', true)] },
  { id: 'atta', name: 'Whole wheat flour (atta)', kcal100: 320, protein100: 10.6, carbs100: 64.2, fat100: 1.5, fiber100: 11.2, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 roti worth', true), g(100)] },
  { id: 'poha_raw', name: 'Poha (flattened rice), raw', kcal100: 346, protein100: 7.5, carbs100: 76.9, fat100: 1.0, fiber100: 3.7, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(50, '1/2 cup', true)] },
  { id: 'rava', name: 'Rava (semolina / suji)', kcal100: 342, protein100: 10.4, carbs100: 68.4, fat100: 0.8, fiber100: 3.9, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(50, '1/2 cup', true)] },
  { id: 'oats', name: 'Rolled oats', kcal100: 374, protein100: 13.6, carbs100: 62.8, fat100: 6.5, fiber100: 10.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(40, '1/2 cup', true)] },
  { id: 'besan', name: 'Besan (gram flour)', kcal100: 350, protein100: 20.8, carbs100: 57.0, fat100: 5.0, fiber100: 9.3, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(50, '1/2 cup', true)] },
  { id: 'bread_whole_wheat', name: 'Whole wheat bread', kcal100: 247, protein100: 9.5, carbs100: 44.0, fat100: 3.4, fiber100: 6.0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 slice', true)] },
  { id: 'quinoa_cooked', name: 'Quinoa, cooked', kcal100: 120, protein100: 4.4, carbs100: 21.3, fat100: 1.9, fiber100: 2.8, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 cup', true)] },
  { id: 'millet_cooked', name: 'Millet (bajra/jowar), cooked', kcal100: 119, protein100: 3.5, carbs100: 23.7, fat100: 1.0, fiber100: 1.3, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 cup', true)] },
  // pulses (raw, dry)
  { id: 'toor_dal_raw', name: 'Toor (arhar) dal, raw', kcal100: 330, protein100: 21.6, carbs100: 55.6, fat100: 1.7, fiber100: 9.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 katori worth', true)] },
  { id: 'moong_dal_raw', name: 'Moong dal (split), raw', kcal100: 336, protein100: 23.4, carbs100: 55.4, fat100: 1.2, fiber100: 8.2, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 katori worth', true)] },
  { id: 'masoor_dal_raw', name: 'Masoor dal, raw', kcal100: 332, protein100: 24.4, carbs100: 55.0, fat100: 0.9, fiber100: 8.9, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 katori worth', true)] },
  { id: 'chana_dal_raw', name: 'Chana dal, raw', kcal100: 334, protein100: 21.9, carbs100: 54.4, fat100: 3.4, fiber100: 11.7, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 katori worth', true)] },
  { id: 'urad_dal_raw', name: 'Urad dal, raw', kcal100: 336, protein100: 23.1, carbs100: 55.9, fat100: 1.6, fiber100: 9.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 katori worth', true)] },
  { id: 'rajma_raw', name: 'Rajma (kidney beans), raw', kcal100: 321, protein100: 19.1, carbs100: 55.0, fat100: 1.1, fiber100: 13.5, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(40, '1 katori worth', true)] },
  { id: 'chole_raw', name: 'Kabuli chana (chickpeas), raw', kcal100: 346, protein100: 18.8, carbs100: 55.8, fat100: 5.2, fiber100: 13.6, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(40, '1 katori worth', true)] },
  { id: 'kala_chana_raw', name: 'Kala chana (black chickpeas), raw', kcal100: 335, protein100: 18.8, carbs100: 53.6, fat100: 4.6, fiber100: 16.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(40, '1 katori worth', true)] },
  { id: 'moong_whole_raw', name: 'Whole moong (green gram), raw', kcal100: 324, protein100: 22.5, carbs100: 53.0, fat100: 1.2, fiber100: 17.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(40, '1 katori worth', true)] },
  { id: 'soya_chunks_raw', name: 'Soya chunks, dry', kcal100: 345, protein100: 52.0, carbs100: 33.0, fat100: 0.5, fiber100: 13.0, source: 'label (Nutrela)', isEstimate: false, isDish: false, slots: [], tags: ['soy'], servings: [g(50, '1/2 cup dry', true)] },
  { id: 'peanuts', name: 'Peanuts, roasted', kcal100: 567, protein100: 25.8, carbs100: 16.1, fat100: 49.2, fiber100: 8.5, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 handful', true)] },
  { id: 'almonds', name: 'Almonds', kcal100: 609, protein100: 18.4, carbs100: 10.1, fat100: 58.5, fiber100: 13.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(12, '10 almonds', true), g(30)] },
  { id: 'walnuts', name: 'Walnuts', kcal100: 671, protein100: 14.9, carbs100: 11.0, fat100: 64.5, fiber100: 5.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(15, '3 halves', true)] },
  { id: 'chia_seeds', name: 'Chia seeds', kcal100: 486, protein100: 16.5, carbs100: 42.1, fat100: 30.7, fiber100: 34.4, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(15, '1 tbsp', true)] },
  { id: 'flax_seeds', name: 'Flax seeds', kcal100: 534, protein100: 18.3, carbs100: 28.9, fat100: 42.2, fiber100: 27.3, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(10, '1 tbsp', true)] },
  // dairy & eggs
  { id: 'milk_toned', name: 'Milk, toned (3% fat)', kcal100: 58, protein100: 3.0, carbs100: 4.7, fat100: 3.0, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(250, '1 glass', true), g(200, '1 cup')] },
  { id: 'milk_skim', name: 'Milk, skimmed', kcal100: 35, protein100: 3.4, carbs100: 5.0, fat100: 0.1, fiber100: 0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(250, '1 glass', true)] },
  { id: 'curd', name: 'Curd (dahi), whole milk', kcal100: 61, protein100: 3.5, carbs100: 4.7, fat100: 3.3, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 katori', true), g(100)] },
  { id: 'greek_yogurt', name: 'Greek yogurt, low fat', kcal100: 73, protein100: 10.0, carbs100: 3.9, fat100: 1.9, fiber100: 0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(170, '1 cup', true), g(100)] },
  { id: 'paneer', name: 'Paneer', kcal100: 265, protein100: 18.3, carbs100: 1.2, fat100: 20.8, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['dairy', 'paneer'], servings: [g(100, '100 g', true), g(50)] },
  { id: 'paneer_low_fat', name: 'Paneer, low fat', kcal100: 160, protein100: 20.0, carbs100: 3.0, fat100: 7.0, fiber100: 0, source: 'label', isEstimate: false, isDish: false, slots: [], tags: ['dairy', 'paneer'], servings: [g(100, '100 g', true)] },
  { id: 'tofu', name: 'Tofu, firm', kcal100: 144, protein100: 17.3, carbs100: 2.8, fat100: 8.7, fiber100: 2.3, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: ['soy'], servings: [g(100, '100 g', true)] },
  { id: 'cheese_slice', name: 'Cheese, processed', kcal100: 320, protein100: 20.0, carbs100: 3.0, fat100: 25.0, fiber100: 0, source: 'label', isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(20, '1 slice', true)] },
  { id: 'ghee', name: 'Ghee', kcal100: 900, protein100: 0, carbs100: 0, fat100: 99.9, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(5, '1 tsp', true), g(15, '1 tbsp')] },
  { id: 'butter', name: 'Butter', kcal100: 729, protein100: 0.5, carbs100: 0.3, fat100: 80.5, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['dairy'], servings: [g(5, '1 tsp', true)] },
  { id: 'oil', name: 'Cooking oil', kcal100: 900, protein100: 0, carbs100: 0, fat100: 100, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(5, '1 tsp', true), g(15, '1 tbsp')] },
  { id: 'egg_whole', name: 'Egg, whole, boiled', kcal100: 143, protein100: 13.3, carbs100: 0.4, fat100: 9.9, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: ['egg'], servings: [g(50, '1 egg', true), g(100, '2 eggs')] },
  { id: 'egg_white', name: 'Egg white', kcal100: 45, protein100: 10.8, carbs100: 0.7, fat100: 0.2, fiber100: 0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: ['egg'], servings: [g(33, '1 egg white', true)] },
  { id: 'whey_powder', name: 'Whey protein powder', kcal100: 400, protein100: 75.0, carbs100: 10.0, fat100: 5.0, fiber100: 0, source: 'label (typical)', isEstimate: false, isDish: false, slots: [], tags: ['whey', 'dairy'], servings: [g(30, '1 scoop', true)] },
  { id: 'plant_protein_powder', name: 'Plant protein powder (pea)', kcal100: 380, protein100: 70.0, carbs100: 12.0, fat100: 5.0, fiber100: 3.0, source: 'label (typical)', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(30, '1 scoop', true)] },
  // vegetables
  { id: 'potato', name: 'Potato, boiled', kcal100: 87, protein100: 1.9, carbs100: 20.1, fat100: 0.1, fiber100: 1.8, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 medium', true)] },
  { id: 'sweet_potato', name: 'Sweet potato, boiled', kcal100: 90, protein100: 1.4, carbs100: 20.7, fat100: 0.1, fiber100: 3.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 medium', true)] },
  { id: 'spinach', name: 'Spinach (palak), raw', kcal100: 24, protein100: 2.1, carbs100: 2.1, fat100: 0.6, fiber100: 2.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 cup chopped', true)] },
  { id: 'peas', name: 'Green peas', kcal100: 81, protein100: 7.2, carbs100: 15.9, fat100: 0.1, fiber100: 6.3, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(80, '1/2 cup', true)] },
  { id: 'broccoli', name: 'Broccoli', kcal100: 34, protein100: 2.8, carbs100: 6.6, fat100: 0.4, fiber100: 2.6, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 cup', true)] },
  { id: 'mixed_veg', name: 'Mixed vegetables (cauliflower, beans, carrot)', kcal100: 40, protein100: 2.0, carbs100: 8.0, fat100: 0.3, fiber100: 3.0, source: 'average', isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(100, '1 cup', true)] },
  { id: 'onion', name: 'Onion', kcal100: 48, protein100: 1.4, carbs100: 10.4, fat100: 0.2, fiber100: 2.4, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(80, '1 medium', true)] },
  { id: 'tomato', name: 'Tomato', kcal100: 20, protein100: 0.9, carbs100: 3.6, fat100: 0.4, fiber100: 1.6, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 medium', true)] },
  { id: 'cucumber', name: 'Cucumber', kcal100: 14, protein100: 0.7, carbs100: 2.5, fat100: 0.2, fiber100: 1.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(150, '1 medium', true)] },
  { id: 'carrot', name: 'Carrot', kcal100: 33, protein100: 0.9, carbs100: 6.7, fat100: 0.5, fiber100: 3.4, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(70, '1 medium', true)] },
  { id: 'capsicum', name: 'Capsicum', kcal100: 22, protein100: 1.2, carbs100: 3.8, fat100: 0.3, fiber100: 2.1, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 medium', true)] },
  { id: 'mushroom', name: 'Mushroom, button', kcal100: 22, protein100: 3.1, carbs100: 3.3, fat100: 0.3, fiber100: 1.0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: ['mushroom'], servings: [g(100, '1 cup sliced', true)] },
  // fruit
  { id: 'banana', name: 'Banana', kcal100: 96, protein100: 1.2, carbs100: 22.8, fat100: 0.3, fiber100: 1.9, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(100, '1 medium', true)] },
  { id: 'apple', name: 'Apple', kcal100: 62, protein100: 0.3, carbs100: 13.6, fat100: 0.6, fiber100: 2.6, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(150, '1 medium', true)] },
  { id: 'orange', name: 'Orange', kcal100: 47, protein100: 0.9, carbs100: 9.9, fat100: 0.2, fiber100: 2.3, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(150, '1 medium', true)] },
  { id: 'papaya', name: 'Papaya', kcal100: 34, protein100: 0.5, carbs100: 7.8, fat100: 0.2, fiber100: 1.9, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(150, '1 cup', true)] },
  { id: 'mango', name: 'Mango', kcal100: 66, protein100: 0.6, carbs100: 15.0, fat100: 0.4, fiber100: 1.6, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(150, '1 cup', true)] },
  { id: 'grapes', name: 'Grapes', kcal100: 59, protein100: 0.5, carbs100: 13.9, fat100: 0.3, fiber100: 1.1, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(100, '1 cup', true)] },
  { id: 'pomegranate', name: 'Pomegranate', kcal100: 63, protein100: 1.3, carbs100: 14.5, fat100: 0.1, fiber100: 2.6, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(100, '1/2 cup arils', true)] },
  { id: 'dates', name: 'Dates', kcal100: 293, protein100: 2.2, carbs100: 68.6, fat100: 0.4, fiber100: 8.3, source: IFCT, isEstimate: false, isDish: false, slots: ['snack'], tags: [], servings: [g(24, '3 dates', true)] },
  // misc
  { id: 'sugar', name: 'Sugar', kcal100: 398, protein100: 0, carbs100: 99.5, fat100: 0, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(5, '1 tsp', true)] },
  { id: 'jaggery', name: 'Jaggery', kcal100: 352, protein100: 1.8, carbs100: 85.6, fat100: 0.1, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(10, '1 small piece', true)] },
  { id: 'honey', name: 'Honey', kcal100: 319, protein100: 0.2, carbs100: 79.5, fat100: 0, fiber100: 0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(7, '1 tsp', true)] },
  { id: 'peanut_butter', name: 'Peanut butter', kcal100: 598, protein100: 25.0, carbs100: 20.0, fat100: 50.0, fiber100: 6.0, source: 'label', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(16, '1 tbsp', true)] },
  { id: 'coconut_chutney', name: 'Coconut chutney', kcal100: 165, protein100: 2.5, carbs100: 6.0, fat100: 14.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(30, '2 tbsp', true)] },
  { id: 'pickle', name: 'Pickle (achar)', kcal100: 180, protein100: 1.5, carbs100: 10.0, fat100: 15.0, fiber100: 2.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(10, '1 tsp', true)] },
  { id: 'papad', name: 'Papad, roasted', kcal100: 300, protein100: 18.0, carbs100: 55.0, fat100: 1.5, fiber100: 8.0, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(10, '1 papad', true)] },
  { id: 'tea_milk', name: 'Tea with milk and sugar', kcal100: 45, protein100: 1.2, carbs100: 7.0, fat100: 1.3, fiber100: 0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 cup', true)] },
  { id: 'coffee_milk', name: 'Coffee with milk, no sugar', kcal100: 30, protein100: 1.6, carbs100: 2.5, fat100: 1.5, fiber100: 0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 cup', true)] },
  { id: 'coconut_water', name: 'Coconut water', kcal100: 19, protein100: 0.7, carbs100: 3.7, fat100: 0.2, fiber100: 0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(250, '1 glass', true)] },
];

// ───────────────────────────── dishes (recipe estimates, per 100 g cooked) ─────────────────────────────
const DISHES: SeedFood[] = [
  // breakfast
  { id: 'poha', name: 'Poha with peanuts', kcal100: 158, protein100: 3.8, carbs100: 26.0, fat100: 4.5, fiber100: 1.8, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: [], servings: [g(200, '1 plate', true), g(150, '1 katori')] },
  { id: 'upma', name: 'Rava upma with vegetables', kcal100: 150, protein100: 3.6, carbs100: 24.0, fat100: 4.4, fiber100: 1.6, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: [], servings: [g(200, '1 plate', true)] },
  { id: 'besan_chilla', name: 'Besan chilla (2, with veg)', kcal100: 190, protein100: 9.5, carbs100: 24.0, fat100: 6.5, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor'], servings: [g(160, '2 chillas', true), g(80, '1 chilla')] },
  { id: 'moong_chilla', name: 'Moong dal chilla (2) with paneer', kcal100: 175, protein100: 12.0, carbs100: 20.0, fat100: 5.5, fiber100: 3.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(180, '2 chillas', true)] },
  { id: 'idli_sambar', name: 'Idli (3) with sambar', kcal100: 110, protein100: 4.2, carbs100: 20.0, fat100: 1.4, fiber100: 2.2, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: [], servings: [g(300, '3 idli + 1 katori sambar', true)] },
  { id: 'dosa_sambar', name: 'Plain dosa (2) with sambar', kcal100: 135, protein100: 4.0, carbs100: 22.0, fat100: 3.5, fiber100: 1.8, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: [], servings: [g(280, '2 dosa + sambar', true)] },
  { id: 'paneer_bhurji_toast', name: 'Paneer bhurji with 2 slices toast', kcal100: 205, protein100: 12.5, carbs100: 17.0, fat100: 10.0, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(200, '1 plate', true)] },
  { id: 'oats_milk', name: 'Oats porridge with milk, nuts & fruit', kcal100: 120, protein100: 4.8, carbs100: 17.0, fat100: 3.8, fiber100: 2.3, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['dairy'], servings: [g(300, '1 bowl', true)] },
  { id: 'protein_oats', name: 'Protein oats (oats + whey + milk)', kcal100: 140, protein100: 10.5, carbs100: 16.0, fat100: 3.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['protein_anchor', 'whey', 'dairy'], servings: [g(300, '1 bowl', true)] },
  { id: 'vegetable_daliya', name: 'Vegetable daliya (broken wheat)', kcal100: 105, protein100: 3.5, carbs100: 19.0, fat100: 2.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: [], servings: [g(250, '1 bowl', true)] },
  { id: 'moong_sprouts_bowl', name: 'Moong sprouts bowl with onion, tomato, lemon', kcal100: 95, protein100: 6.8, carbs100: 15.0, fat100: 0.8, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'snack'], tags: ['protein_anchor'], servings: [g(200, '1 bowl', true)] },
  { id: 'greek_yogurt_fruit', name: 'Greek yogurt with fruit & seeds', kcal100: 95, protein100: 8.0, carbs100: 9.0, fat100: 3.5, fiber100: 1.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'snack'], tags: ['protein_anchor', 'dairy'], servings: [g(220, '1 bowl', true)] },
  { id: 'egg_bhurji_roti', name: 'Egg bhurji (2 eggs) with 1 roti', kcal100: 175, protein100: 11.0, carbs100: 12.0, fat100: 9.5, fiber100: 1.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor', 'egg'], servings: [g(180, '1 plate', true)] },
  { id: 'boiled_eggs_toast', name: 'Boiled eggs (2) with 2 slices toast', kcal100: 175, protein100: 11.5, carbs100: 17.0, fat100: 7.0, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['protein_anchor', 'egg'], servings: [g(160, '1 plate', true)] },
  { id: 'masala_omelette', name: 'Masala omelette (2 eggs)', kcal100: 165, protein100: 12.5, carbs100: 2.0, fat100: 12.0, fiber100: 0.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor', 'egg'], servings: [g(120, '1 omelette', true)] },
  { id: 'peanut_butter_toast_milk', name: 'Peanut butter toast (2) with milk', kcal100: 175, protein100: 7.5, carbs100: 19.0, fat100: 7.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['dairy'], servings: [g(300, '2 toasts + 1 glass', true)] },
  { id: 'paratha_curd', name: 'Aloo paratha (1) with curd', kcal100: 175, protein100: 4.8, carbs100: 24.0, fat100: 6.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['dairy'], servings: [g(230, '1 paratha + 1 katori curd', true)] },
  { id: 'paneer_paratha_curd', name: 'Paneer paratha (1) with curd', kcal100: 190, protein100: 8.5, carbs100: 21.0, fat100: 8.0, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['breakfast'], tags: ['protein_anchor', 'paneer', 'dairy'], servings: [g(230, '1 paratha + curd', true)] },
  { id: 'sattu_drink', name: 'Sattu drink (savoury)', kcal100: 60, protein100: 3.5, carbs100: 9.5, fat100: 0.8, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'snack'], tags: [], servings: [g(300, '1 glass', true)] },
  { id: 'tofu_scramble_toast', name: 'Tofu scramble with 2 slices toast', kcal100: 165, protein100: 11.0, carbs100: 16.0, fat100: 7.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(200, '1 plate', true)] },
  // lunch / dinner mains
  { id: 'dal_tadka', name: 'Dal tadka (toor)', kcal100: 105, protein100: 5.5, carbs100: 14.0, fat100: 3.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: false, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(200, '1 katori', true)] },
  { id: 'dal_roti_sabzi', name: 'Dal, 2 rotis & sabzi', kcal100: 140, protein100: 6.0, carbs100: 22.0, fat100: 3.5, fiber100: 4.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 katori dal + 2 roti + sabzi', true)] },
  { id: 'dal_rice_sabzi', name: 'Dal, rice & sabzi', kcal100: 120, protein100: 4.8, carbs100: 20.0, fat100: 2.5, fiber100: 2.8, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 katori dal + 1 cup rice + sabzi', true)] },
  { id: 'rajma_chawal', name: 'Rajma chawal', kcal100: 125, protein100: 5.5, carbs100: 22.0, fat100: 2.0, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 katori rajma + 1 cup rice', true)] },
  { id: 'chole_rice', name: 'Chole with rice', kcal100: 135, protein100: 5.8, carbs100: 22.0, fat100: 3.0, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 katori chole + 1 cup rice', true)] },
  { id: 'chole_roti', name: 'Chole with 2 rotis', kcal100: 155, protein100: 7.0, carbs100: 23.0, fat100: 4.5, fiber100: 6.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(330, '1 katori chole + 2 roti', true)] },
  { id: 'kala_chana_curry_roti', name: 'Kala chana curry with 2 rotis', kcal100: 150, protein100: 7.5, carbs100: 23.0, fat100: 3.5, fiber100: 7.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(330, '1 katori + 2 roti', true)] },
  { id: 'palak_paneer_roti', name: 'Palak paneer with 2 rotis', kcal100: 160, protein100: 8.5, carbs100: 15.0, fat100: 8.0, fiber100: 3.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(330, '1 katori + 2 roti', true)] },
  { id: 'paneer_bhurji_roti', name: 'Paneer bhurji with 2 rotis', kcal100: 195, protein100: 11.0, carbs100: 17.0, fat100: 9.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(280, '1 katori + 2 roti', true)] },
  { id: 'matar_paneer_rice', name: 'Matar paneer with rice', kcal100: 150, protein100: 6.5, carbs100: 19.0, fat100: 5.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(400, '1 katori + 1 cup rice', true)] },
  { id: 'paneer_tikka', name: 'Paneer tikka (grilled, 150 g)', kcal100: 220, protein100: 16.0, carbs100: 5.0, fat100: 15.5, fiber100: 1.0, source: EST, isEstimate: true, isDish: true, slots: ['dinner', 'snack'], tags: ['protein_anchor', 'paneer'], servings: [g(180, '1 plate', true)] },
  { id: 'tofu_bhurji_roti', name: 'Tofu bhurji with 2 rotis', kcal100: 165, protein100: 10.5, carbs100: 18.0, fat100: 6.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(280, '1 katori + 2 roti', true)] },
  { id: 'tofu_stir_fry_rice', name: 'Tofu & vegetable stir-fry with rice', kcal100: 135, protein100: 7.5, carbs100: 17.0, fat100: 4.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(400, '1 plate', true)] },
  { id: 'soya_chunk_curry_rice', name: 'Soya chunk curry with rice', kcal100: 135, protein100: 10.0, carbs100: 19.0, fat100: 2.5, fiber100: 3.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(400, '1 katori + 1 cup rice', true)] },
  { id: 'soya_chunk_curry_roti', name: 'Soya chunk curry with 2 rotis', kcal100: 160, protein100: 12.5, carbs100: 20.0, fat100: 3.5, fiber100: 5.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(330, '1 katori + 2 roti', true)] },
  { id: 'soya_keema_roti', name: 'Soya keema with 2 rotis', kcal100: 170, protein100: 13.0, carbs100: 20.0, fat100: 4.0, fiber100: 5.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(320, '1 katori + 2 roti', true)] },
  { id: 'moong_dal_khichdi', name: 'Moong dal khichdi with curd', kcal100: 110, protein100: 5.0, carbs100: 17.0, fat100: 2.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'dairy'], servings: [g(400, '1 bowl + curd', true)] },
  { id: 'sambar_rice', name: 'Sambar rice', kcal100: 115, protein100: 4.2, carbs100: 20.0, fat100: 2.0, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: [], servings: [g(400, '1 plate', true)] },
  { id: 'curd_rice', name: 'Curd rice', kcal100: 105, protein100: 3.5, carbs100: 16.0, fat100: 3.0, fiber100: 0.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['dairy'], servings: [g(300, '1 bowl', true)] },
  { id: 'veg_pulao_raita', name: 'Vegetable pulao with raita', kcal100: 130, protein100: 3.8, carbs100: 21.0, fat100: 3.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['dairy'], servings: [g(350, '1 plate', true)] },
  { id: 'paneer_pulao_raita', name: 'Paneer pulao with raita', kcal100: 150, protein100: 6.5, carbs100: 20.0, fat100: 5.0, fiber100: 1.8, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer', 'dairy'], servings: [g(350, '1 plate', true)] },
  { id: 'chana_masala_quinoa', name: 'Chana masala with quinoa', kcal100: 130, protein100: 6.5, carbs100: 19.0, fat100: 3.5, fiber100: 5.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(380, '1 plate', true)] },
  { id: 'masoor_dal_roti', name: 'Masoor dal with 2 rotis & salad', kcal100: 140, protein100: 6.8, carbs100: 21.0, fat100: 3.0, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(360, '1 katori + 2 roti + salad', true)] },
  { id: 'dal_makhani_roti', name: 'Dal makhani with 2 rotis', kcal100: 165, protein100: 6.5, carbs100: 21.0, fat100: 6.0, fiber100: 4.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'dairy'], servings: [g(330, '1 katori + 2 roti', true)] },
  { id: 'bhindi_roti_dal', name: 'Bhindi sabzi, dal & 2 rotis', kcal100: 135, protein100: 5.5, carbs100: 20.0, fat100: 4.0, fiber100: 4.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 plate', true)] },
  { id: 'aloo_gobi_roti_curd', name: 'Aloo gobi, 2 rotis & curd', kcal100: 140, protein100: 4.5, carbs100: 22.0, fat100: 4.0, fiber100: 3.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['dairy'], servings: [g(380, '1 plate', true)] },
  { id: 'mushroom_matar_roti', name: 'Mushroom matar with 2 rotis', kcal100: 130, protein100: 5.5, carbs100: 19.0, fat100: 4.0, fiber100: 4.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['mushroom'], servings: [g(330, '1 katori + 2 roti', true)] },
  { id: 'veg_thali', name: 'Home thali: dal, sabzi, 2 roti, rice, curd', kcal100: 125, protein100: 5.0, carbs100: 19.0, fat100: 3.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch'], tags: ['protein_anchor', 'dairy'], servings: [g(550, '1 thali', true)] },
  { id: 'egg_curry_rice', name: 'Egg curry (2 eggs) with rice', kcal100: 140, protein100: 7.0, carbs100: 17.0, fat100: 5.0, fiber100: 1.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'egg'], servings: [g(380, '2 eggs + 1 cup rice', true)] },
  { id: 'egg_curry_roti', name: 'Egg curry (2 eggs) with 2 rotis', kcal100: 160, protein100: 9.0, carbs100: 16.0, fat100: 7.0, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'egg'], servings: [g(320, '2 eggs + 2 roti', true)] },
  { id: 'paneer_salad_bowl', name: 'Paneer salad bowl (grilled paneer, veg, chickpeas)', kcal100: 140, protein100: 10.0, carbs100: 9.0, fat100: 7.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(350, '1 bowl', true)] },
  { id: 'tofu_salad_bowl', name: 'Tofu salad bowl with peanut dressing', kcal100: 120, protein100: 8.5, carbs100: 8.0, fat100: 6.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(350, '1 bowl', true)] },
  { id: 'veg_sandwich_paneer', name: 'Grilled paneer sandwich (2 slices)', kcal100: 220, protein100: 11.0, carbs100: 24.0, fat100: 9.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'snack'], tags: ['protein_anchor', 'paneer'], servings: [g(180, '1 sandwich', true)] },
  { id: 'rajma_salad', name: 'Rajma salad (beans, onion, tomato, lemon)', kcal100: 100, protein100: 6.0, carbs100: 16.0, fat100: 1.5, fiber100: 5.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'snack'], tags: ['protein_anchor'], servings: [g(250, '1 bowl', true)] },
  { id: 'chole_salad', name: 'Chickpea salad with cucumber & curd dressing', kcal100: 110, protein100: 6.0, carbs100: 15.0, fat100: 3.0, fiber100: 5.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'snack'], tags: ['protein_anchor', 'dairy'], servings: [g(250, '1 bowl', true)] },
  { id: 'palak_dal_rice', name: 'Palak dal with rice', kcal100: 115, protein100: 5.0, carbs100: 19.0, fat100: 2.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(400, '1 katori + 1 cup rice', true)] },
  { id: 'vegetable_soup_paneer', name: 'Vegetable soup with paneer cubes', kcal100: 65, protein100: 5.0, carbs100: 5.0, fat100: 3.0, fiber100: 1.5, source: EST, isEstimate: true, isDish: true, slots: ['dinner', 'snack'], tags: ['protein_anchor', 'paneer'], servings: [g(350, '1 bowl', true)] },
  { id: 'tofu_curry_roti', name: 'Tofu curry with 2 rotis', kcal100: 150, protein100: 9.5, carbs100: 17.0, fat100: 5.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(320, '1 katori + 2 roti', true)] },
  { id: 'lauki_chana_dal_roti', name: 'Lauki chana dal with 2 rotis', kcal100: 125, protein100: 5.5, carbs100: 20.0, fat100: 2.5, fiber100: 4.0, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(350, '1 katori + 2 roti', true)] },
  { id: 'methi_thepla_curd', name: 'Methi thepla (3) with curd', kcal100: 195, protein100: 6.0, carbs100: 27.0, fat100: 7.0, fiber100: 3.5, source: EST, isEstimate: true, isDish: true, slots: ['breakfast', 'lunch'], tags: ['dairy'], servings: [g(240, '3 thepla + curd', true)] },
  { id: 'paneer_wrap', name: 'Paneer roti wrap', kcal100: 200, protein100: 10.5, carbs100: 20.0, fat100: 8.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'paneer'], servings: [g(220, '1 wrap', true)] },
  { id: 'soya_chunk_pulao', name: 'Soya chunk pulao with raita', kcal100: 140, protein100: 8.0, carbs100: 20.0, fat100: 3.0, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor', 'soy', 'dairy'], servings: [g(350, '1 plate', true)] },
  { id: 'sprouts_curry_roti', name: 'Moong sprouts curry (usal) with 2 rotis', kcal100: 140, protein100: 7.0, carbs100: 21.0, fat100: 3.0, fiber100: 5.5, source: EST, isEstimate: true, isDish: true, slots: ['lunch', 'dinner'], tags: ['protein_anchor'], servings: [g(320, '1 katori + 2 roti', true)] },
  // snacks
  { id: 'whey_shake', name: 'Whey shake (1 scoop in water)', kcal100: 40, protein100: 7.5, carbs100: 1.0, fat100: 0.5, fiber100: 0, source: EST, isEstimate: false, isDish: true, slots: ['snack'], tags: ['protein_anchor', 'whey'], servings: [g(300, '1 shake', true)] },
  { id: 'whey_milk_shake', name: 'Whey shake with milk & banana', kcal100: 80, protein100: 7.0, carbs100: 9.0, fat100: 1.8, fiber100: 0.5, source: EST, isEstimate: true, isDish: true, slots: ['snack', 'breakfast'], tags: ['protein_anchor', 'whey', 'dairy'], servings: [g(400, '1 shake', true)] },
  { id: 'roasted_chana', name: 'Roasted chana', kcal100: 370, protein100: 20.0, carbs100: 58.0, fat100: 5.5, fiber100: 15.0, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: ['protein_anchor'], servings: [g(40, '1 handful', true)] },
  { id: 'peanut_chaat', name: 'Peanut chaat (boiled peanuts, onion, tomato)', kcal100: 200, protein100: 9.5, carbs100: 12.0, fat100: 13.0, fiber100: 4.0, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: ['protein_anchor'], servings: [g(120, '1 katori', true)] },
  { id: 'curd_katori', name: 'Curd (1 katori)', kcal100: 61, protein100: 3.5, carbs100: 4.7, fat100: 3.3, fiber100: 0, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: ['dairy'], servings: [g(150, '1 katori', true)] },
  { id: 'buttermilk', name: 'Chaas (buttermilk), 1 glass', kcal100: 30, protein100: 1.6, carbs100: 2.5, fat100: 1.5, fiber100: 0, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: ['dairy'], servings: [g(250, '1 glass', true)] },
  { id: 'fruit_bowl', name: 'Mixed fruit bowl', kcal100: 60, protein100: 0.8, carbs100: 14.0, fat100: 0.3, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: [], servings: [g(200, '1 bowl', true)] },
  { id: 'banana_peanut_butter', name: 'Banana with peanut butter', kcal100: 165, protein100: 4.5, carbs100: 22.0, fat100: 7.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: [], servings: [g(116, '1 banana + 1 tbsp', true)] },
  { id: 'nuts_mix', name: 'Almonds & walnuts (small handful)', kcal100: 630, protein100: 17.0, carbs100: 10.5, fat100: 60.0, fiber100: 9.5, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: [], servings: [g(25, '1 small handful', true)] },
  { id: 'makhana_roasted', name: 'Roasted makhana (fox nuts)', kcal100: 350, protein100: 9.7, carbs100: 76.9, fat100: 0.5, fiber100: 7.6, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: [], servings: [g(30, '1 cup', true)] },
  { id: 'paneer_cubes_snack', name: 'Paneer cubes with chaat masala', kcal100: 265, protein100: 18.3, carbs100: 1.2, fat100: 20.8, fiber100: 0, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: ['protein_anchor', 'paneer'], servings: [g(80, '80 g', true)] },
  { id: 'dhokla', name: 'Dhokla (4 pieces)', kcal100: 160, protein100: 6.5, carbs100: 24.0, fat100: 4.5, fiber100: 3.0, source: EST, isEstimate: true, isDish: true, slots: ['snack', 'breakfast'], tags: [], servings: [g(150, '4 pieces', true)] },
  { id: 'boiled_egg_snack', name: 'Boiled eggs (2)', kcal100: 143, protein100: 13.3, carbs100: 0.4, fat100: 9.9, fiber100: 0, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: ['protein_anchor', 'egg'], servings: [g(100, '2 eggs', true)] },
  { id: 'milk_glass', name: 'Milk, 1 glass (toned)', kcal100: 58, protein100: 3.0, carbs100: 4.7, fat100: 3.0, fiber100: 0, source: IFCT, isEstimate: false, isDish: true, slots: ['snack'], tags: ['dairy'], servings: [g(250, '1 glass', true)] },
  { id: 'chana_chaat', name: 'Kala chana chaat', kcal100: 130, protein100: 7.0, carbs100: 20.0, fat100: 2.5, fiber100: 6.0, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: ['protein_anchor'], servings: [g(150, '1 katori', true)] },
  { id: 'tofu_tikka', name: 'Tofu tikka', kcal100: 170, protein100: 15.0, carbs100: 5.0, fat100: 10.0, fiber100: 2.0, source: EST, isEstimate: true, isDish: true, slots: ['snack', 'dinner'], tags: ['protein_anchor', 'soy'], servings: [g(120, '1 plate', true)] },
  { id: 'protein_bar', name: 'Protein bar (typical, 20 g protein)', kcal100: 380, protein100: 33.0, carbs100: 40.0, fat100: 12.0, fiber100: 8.0, source: 'label (typical)', isEstimate: true, isDish: true, slots: ['snack'], tags: ['protein_anchor', 'whey'], servings: [g(60, '1 bar', true)] },
  { id: 'peanut_butter_apple', name: 'Apple with peanut butter', kcal100: 115, protein100: 2.7, carbs100: 14.0, fat100: 5.5, fiber100: 2.8, source: EST, isEstimate: true, isDish: true, slots: ['snack'], tags: [], servings: [g(166, '1 apple + 1 tbsp', true)] },
  // single components often logged
  { id: 'roti', name: 'Roti / chapati (1, no ghee)', kcal100: 297, protein100: 9.5, carbs100: 58.0, fat100: 2.5, fiber100: 8.0, source: 'IFCT (from atta)', isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(35, '1 roti', true), g(70, '2 rotis')] },
  { id: 'roti_ghee', name: 'Roti with ghee (1)', kcal100: 350, protein100: 8.8, carbs100: 53.0, fat100: 9.0, fiber100: 7.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(40, '1 roti', true)] },
  { id: 'paratha_plain', name: 'Plain paratha (1)', kcal100: 300, protein100: 6.5, carbs100: 40.0, fat100: 12.0, fiber100: 4.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(60, '1 paratha', true)] },
  { id: 'idli', name: 'Idli (1)', kcal100: 130, protein100: 3.8, carbs100: 27.0, fat100: 0.4, fiber100: 1.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(40, '1 idli', true), g(120, '3 idli')] },
  { id: 'dosa', name: 'Plain dosa (1)', kcal100: 165, protein100: 4.0, carbs100: 27.0, fat100: 4.5, fiber100: 1.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(90, '1 dosa', true)] },
  { id: 'sambar', name: 'Sambar', kcal100: 60, protein100: 3.0, carbs100: 9.0, fat100: 1.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(200, '1 katori', true)] },
  { id: 'rajma_curry', name: 'Rajma curry', kcal100: 120, protein100: 6.5, carbs100: 17.0, fat100: 3.0, fiber100: 5.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['protein_anchor'], servings: [g(200, '1 katori', true)] },
  { id: 'chole_curry', name: 'Chole (chickpea curry)', kcal100: 140, protein100: 6.5, carbs100: 18.0, fat100: 4.5, fiber100: 5.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['protein_anchor'], servings: [g(200, '1 katori', true)] },
  { id: 'palak_paneer', name: 'Palak paneer', kcal100: 150, protein100: 8.0, carbs100: 5.5, fat100: 11.0, fiber100: 2.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['protein_anchor', 'paneer'], servings: [g(200, '1 katori', true)] },
  { id: 'paneer_bhurji', name: 'Paneer bhurji', kcal100: 230, protein100: 13.0, carbs100: 6.0, fat100: 17.0, fiber100: 1.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['protein_anchor', 'paneer'], servings: [g(150, '1 katori', true)] },
  { id: 'matar_paneer', name: 'Matar paneer', kcal100: 165, protein100: 8.0, carbs100: 9.0, fat100: 11.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['protein_anchor', 'paneer'], servings: [g(200, '1 katori', true)] },
  { id: 'mixed_veg_sabzi', name: 'Mixed vegetable sabzi', kcal100: 80, protein100: 2.2, carbs100: 9.0, fat100: 4.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(150, '1 katori', true)] },
  { id: 'aloo_sabzi', name: 'Aloo sabzi (dry)', kcal100: 120, protein100: 2.0, carbs100: 18.0, fat100: 4.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(150, '1 katori', true)] },
  { id: 'bhindi_sabzi', name: 'Bhindi sabzi', kcal100: 90, protein100: 2.0, carbs100: 8.0, fat100: 5.5, fiber100: 3.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(150, '1 katori', true)] },
  { id: 'raita', name: 'Cucumber raita', kcal100: 50, protein100: 2.8, carbs100: 4.0, fat100: 2.5, fiber100: 0.4, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 katori', true)] },
  { id: 'salad_plain', name: 'Salad (cucumber, tomato, onion)', kcal100: 22, protein100: 1.0, carbs100: 4.0, fat100: 0.2, fiber100: 1.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(150, '1 plate', true)] },
  { id: 'moong_sprouts', name: 'Moong sprouts, raw', kcal100: 30, protein100: 3.0, carbs100: 4.0, fat100: 0.2, fiber100: 1.8, source: IFCT, isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(100, '1 cup', true)] },
  { id: 'soya_chunks_cooked', name: 'Soya chunks, cooked (rehydrated)', kcal100: 120, protein100: 17.0, carbs100: 11.0, fat100: 0.5, fiber100: 4.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['soy', 'protein_anchor'], servings: [g(150, '1 katori', true)] },
  { id: 'khichdi', name: 'Moong dal khichdi', kcal100: 110, protein100: 4.5, carbs100: 18.0, fat100: 2.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(250, '1 bowl', true)] },
  { id: 'veg_biryani', name: 'Vegetable biryani', kcal100: 150, protein100: 3.5, carbs100: 24.0, fat100: 4.5, fiber100: 2.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(300, '1 plate', true)] },
  { id: 'pav_bhaji', name: 'Pav bhaji (2 pav)', kcal100: 165, protein100: 4.0, carbs100: 24.0, fat100: 6.0, fiber100: 3.0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(350, '1 plate', true)] },
  { id: 'samosa', name: 'Samosa (1)', kcal100: 260, protein100: 4.5, carbs100: 30.0, fat100: 13.5, fiber100: 2.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: [], servings: [g(100, '1 samosa', true)] },
  { id: 'gulab_jamun', name: 'Gulab jamun (1)', kcal100: 320, protein100: 4.0, carbs100: 50.0, fat100: 11.0, fiber100: 0.5, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(50, '1 piece', true)] },
  { id: 'kheer', name: 'Rice kheer', kcal100: 130, protein100: 3.5, carbs100: 20.0, fat100: 4.0, fiber100: 0.2, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 katori', true)] },
  { id: 'lassi_sweet', name: 'Sweet lassi', kcal100: 90, protein100: 3.0, carbs100: 13.0, fat100: 3.0, fiber100: 0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(250, '1 glass', true)] },
  { id: 'chai', name: 'Chai (1 cup, milk + 1 tsp sugar)', kcal100: 45, protein100: 1.2, carbs100: 7.0, fat100: 1.3, fiber100: 0, source: EST, isEstimate: true, isDish: false, slots: [], tags: ['dairy'], servings: [g(150, '1 cup', true)] },
  { id: 'coffee_black', name: 'Black coffee', kcal100: 1, protein100: 0.1, carbs100: 0, fat100: 0, fiber100: 0, source: 'USDA', isEstimate: false, isDish: false, slots: [], tags: [], servings: [g(200, '1 cup', true)] },
];

export const SEED_FOODS: SeedFood[] = [...INGREDIENTS, ...DISHES, ...REGIONAL_INDIAN_DISHES];

/** Ingredient lists (one default serving) for the grocery list. Only dishes in the meal plan need one. */
export const GROCERY_BY_DISH: Record<string, { item: string; qty: number; unit: string }[]> = {
  ...REGIONAL_GROCERY_BY_DISH,
  poha: [{ item: 'Poha', qty: 60, unit: 'g' }, { item: 'Peanuts', qty: 20, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Potato', qty: 0.5, unit: 'pc' }],
  upma: [{ item: 'Rava', qty: 60, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }],
  besan_chilla: [{ item: 'Besan', qty: 70, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }, { item: 'Capsicum', qty: 0.5, unit: 'pc' }],
  moong_chilla: [{ item: 'Moong dal', qty: 70, unit: 'g' }, { item: 'Paneer', qty: 50, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }],
  idli_sambar: [{ item: 'Idli batter', qty: 200, unit: 'g' }, { item: 'Toor dal', qty: 40, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }],
  dosa_sambar: [{ item: 'Dosa batter', qty: 200, unit: 'g' }, { item: 'Toor dal', qty: 40, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }],
  paneer_bhurji_toast: [{ item: 'Paneer', qty: 100, unit: 'g' }, { item: 'Whole wheat bread', qty: 2, unit: 'slice' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }],
  oats_milk: [{ item: 'Oats', qty: 50, unit: 'g' }, { item: 'Milk', qty: 250, unit: 'ml' }, { item: 'Almonds', qty: 10, unit: 'g' }, { item: 'Banana', qty: 1, unit: 'pc' }],
  protein_oats: [{ item: 'Oats', qty: 50, unit: 'g' }, { item: 'Milk', qty: 200, unit: 'ml' }, { item: 'Whey protein', qty: 30, unit: 'g' }],
  vegetable_daliya: [{ item: 'Daliya (broken wheat)', qty: 50, unit: 'g' }, { item: 'Mixed vegetables', qty: 100, unit: 'g' }],
  moong_sprouts_bowl: [{ item: 'Whole moong', qty: 50, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }, { item: 'Lemon', qty: 0.5, unit: 'pc' }],
  greek_yogurt_fruit: [{ item: 'Greek yogurt', qty: 170, unit: 'g' }, { item: 'Fruit', qty: 100, unit: 'g' }, { item: 'Chia seeds', qty: 10, unit: 'g' }],
  egg_bhurji_roti: [{ item: 'Eggs', qty: 2, unit: 'pc' }, { item: 'Atta', qty: 35, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }],
  boiled_eggs_toast: [{ item: 'Eggs', qty: 2, unit: 'pc' }, { item: 'Whole wheat bread', qty: 2, unit: 'slice' }],
  masala_omelette: [{ item: 'Eggs', qty: 2, unit: 'pc' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }],
  peanut_butter_toast_milk: [{ item: 'Whole wheat bread', qty: 2, unit: 'slice' }, { item: 'Peanut butter', qty: 30, unit: 'g' }, { item: 'Milk', qty: 250, unit: 'ml' }],
  paratha_curd: [{ item: 'Atta', qty: 50, unit: 'g' }, { item: 'Potato', qty: 1, unit: 'pc' }, { item: 'Curd', qty: 150, unit: 'g' }],
  paneer_paratha_curd: [{ item: 'Atta', qty: 50, unit: 'g' }, { item: 'Paneer', qty: 60, unit: 'g' }, { item: 'Curd', qty: 150, unit: 'g' }],
  sattu_drink: [{ item: 'Sattu', qty: 40, unit: 'g' }, { item: 'Lemon', qty: 0.5, unit: 'pc' }],
  tofu_scramble_toast: [{ item: 'Tofu', qty: 150, unit: 'g' }, { item: 'Whole wheat bread', qty: 2, unit: 'slice' }, { item: 'Onion', qty: 0.5, unit: 'pc' }],
  dal_roti_sabzi: [{ item: 'Toor dal', qty: 50, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Mixed vegetables', qty: 150, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  dal_rice_sabzi: [{ item: 'Toor dal', qty: 50, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Mixed vegetables', qty: 150, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  rajma_chawal: [{ item: 'Rajma', qty: 60, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  chole_rice: [{ item: 'Kabuli chana', qty: 60, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  chole_roti: [{ item: 'Kabuli chana', qty: 60, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  kala_chana_curry_roti: [{ item: 'Kala chana', qty: 60, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  palak_paneer_roti: [{ item: 'Spinach', qty: 200, unit: 'g' }, { item: 'Paneer', qty: 100, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }],
  paneer_bhurji_roti: [{ item: 'Paneer', qty: 120, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  matar_paneer_rice: [{ item: 'Paneer', qty: 100, unit: 'g' }, { item: 'Green peas', qty: 80, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  paneer_tikka: [{ item: 'Paneer', qty: 150, unit: 'g' }, { item: 'Curd', qty: 50, unit: 'g' }, { item: 'Capsicum', qty: 1, unit: 'pc' }, { item: 'Onion', qty: 1, unit: 'pc' }],
  tofu_bhurji_roti: [{ item: 'Tofu', qty: 150, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  tofu_stir_fry_rice: [{ item: 'Tofu', qty: 150, unit: 'g' }, { item: 'Mixed vegetables', qty: 150, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }],
  soya_chunk_curry_rice: [{ item: 'Soya chunks', qty: 50, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  soya_chunk_curry_roti: [{ item: 'Soya chunks', qty: 50, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  soya_keema_roti: [{ item: 'Soya granules', qty: 50, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Green peas', qty: 50, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }],
  moong_dal_khichdi: [{ item: 'Moong dal', qty: 40, unit: 'g' }, { item: 'Rice', qty: 40, unit: 'g' }, { item: 'Curd', qty: 150, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }],
  sambar_rice: [{ item: 'Toor dal', qty: 40, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Mixed vegetables', qty: 100, unit: 'g' }],
  curd_rice: [{ item: 'Rice', qty: 60, unit: 'g' }, { item: 'Curd', qty: 150, unit: 'g' }],
  veg_pulao_raita: [{ item: 'Rice', qty: 60, unit: 'g' }, { item: 'Mixed vegetables', qty: 100, unit: 'g' }, { item: 'Curd', qty: 100, unit: 'g' }, { item: 'Cucumber', qty: 0.5, unit: 'pc' }],
  paneer_pulao_raita: [{ item: 'Rice', qty: 60, unit: 'g' }, { item: 'Paneer', qty: 80, unit: 'g' }, { item: 'Curd', qty: 100, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }],
  chana_masala_quinoa: [{ item: 'Kabuli chana', qty: 60, unit: 'g' }, { item: 'Quinoa', qty: 50, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  masoor_dal_roti: [{ item: 'Masoor dal', qty: 50, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Cucumber', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  dal_makhani_roti: [{ item: 'Urad dal (whole)', qty: 40, unit: 'g' }, { item: 'Rajma', qty: 15, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Butter', qty: 10, unit: 'g' }],
  bhindi_roti_dal: [{ item: 'Bhindi', qty: 150, unit: 'g' }, { item: 'Toor dal', qty: 40, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }],
  aloo_gobi_roti_curd: [{ item: 'Potato', qty: 1, unit: 'pc' }, { item: 'Cauliflower', qty: 150, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Curd', qty: 150, unit: 'g' }],
  mushroom_matar_roti: [{ item: 'Mushroom', qty: 150, unit: 'g' }, { item: 'Green peas', qty: 60, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }],
  veg_thali: [{ item: 'Toor dal', qty: 40, unit: 'g' }, { item: 'Mixed vegetables', qty: 150, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Rice', qty: 40, unit: 'g' }, { item: 'Curd', qty: 100, unit: 'g' }],
  egg_curry_rice: [{ item: 'Eggs', qty: 2, unit: 'pc' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  egg_curry_roti: [{ item: 'Eggs', qty: 2, unit: 'pc' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  paneer_salad_bowl: [{ item: 'Paneer', qty: 120, unit: 'g' }, { item: 'Kabuli chana', qty: 30, unit: 'g' }, { item: 'Cucumber', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  tofu_salad_bowl: [{ item: 'Tofu', qty: 150, unit: 'g' }, { item: 'Cucumber', qty: 1, unit: 'pc' }, { item: 'Carrot', qty: 1, unit: 'pc' }, { item: 'Peanut butter', qty: 15, unit: 'g' }],
  veg_sandwich_paneer: [{ item: 'Whole wheat bread', qty: 2, unit: 'slice' }, { item: 'Paneer', qty: 80, unit: 'g' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }],
  rajma_salad: [{ item: 'Rajma', qty: 50, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }, { item: 'Lemon', qty: 0.5, unit: 'pc' }],
  chole_salad: [{ item: 'Kabuli chana', qty: 50, unit: 'g' }, { item: 'Cucumber', qty: 1, unit: 'pc' }, { item: 'Curd', qty: 50, unit: 'g' }],
  palak_dal_rice: [{ item: 'Toor dal', qty: 50, unit: 'g' }, { item: 'Spinach', qty: 100, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }],
  vegetable_soup_paneer: [{ item: 'Mixed vegetables', qty: 150, unit: 'g' }, { item: 'Paneer', qty: 60, unit: 'g' }],
  tofu_curry_roti: [{ item: 'Tofu', qty: 150, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  lauki_chana_dal_roti: [{ item: 'Lauki', qty: 200, unit: 'g' }, { item: 'Chana dal', qty: 40, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }],
  methi_thepla_curd: [{ item: 'Atta', qty: 80, unit: 'g' }, { item: 'Methi leaves', qty: 50, unit: 'g' }, { item: 'Curd', qty: 150, unit: 'g' }],
  paneer_wrap: [{ item: 'Atta', qty: 40, unit: 'g' }, { item: 'Paneer', qty: 100, unit: 'g' }, { item: 'Capsicum', qty: 0.5, unit: 'pc' }, { item: 'Onion', qty: 0.5, unit: 'pc' }],
  soya_chunk_pulao: [{ item: 'Soya chunks', qty: 40, unit: 'g' }, { item: 'Rice', qty: 60, unit: 'g' }, { item: 'Curd', qty: 100, unit: 'g' }, { item: 'Mixed vegetables', qty: 80, unit: 'g' }],
  sprouts_curry_roti: [{ item: 'Whole moong', qty: 60, unit: 'g' }, { item: 'Atta', qty: 70, unit: 'g' }, { item: 'Onion', qty: 1, unit: 'pc' }, { item: 'Tomato', qty: 1, unit: 'pc' }],
  whey_shake: [{ item: 'Whey protein', qty: 30, unit: 'g' }],
  whey_milk_shake: [{ item: 'Whey protein', qty: 30, unit: 'g' }, { item: 'Milk', qty: 250, unit: 'ml' }, { item: 'Banana', qty: 1, unit: 'pc' }],
  roasted_chana: [{ item: 'Roasted chana', qty: 40, unit: 'g' }],
  peanut_chaat: [{ item: 'Peanuts', qty: 50, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }],
  curd_katori: [{ item: 'Curd', qty: 150, unit: 'g' }],
  buttermilk: [{ item: 'Curd', qty: 100, unit: 'g' }],
  fruit_bowl: [{ item: 'Fruit', qty: 200, unit: 'g' }],
  banana_peanut_butter: [{ item: 'Banana', qty: 1, unit: 'pc' }, { item: 'Peanut butter', qty: 16, unit: 'g' }],
  nuts_mix: [{ item: 'Almonds', qty: 15, unit: 'g' }, { item: 'Walnuts', qty: 10, unit: 'g' }],
  makhana_roasted: [{ item: 'Makhana', qty: 30, unit: 'g' }],
  paneer_cubes_snack: [{ item: 'Paneer', qty: 80, unit: 'g' }],
  dhokla: [{ item: 'Besan', qty: 60, unit: 'g' }, { item: 'Curd', qty: 50, unit: 'g' }],
  boiled_egg_snack: [{ item: 'Eggs', qty: 2, unit: 'pc' }],
  milk_glass: [{ item: 'Milk', qty: 250, unit: 'ml' }],
  chana_chaat: [{ item: 'Kala chana', qty: 50, unit: 'g' }, { item: 'Onion', qty: 0.5, unit: 'pc' }, { item: 'Tomato', qty: 0.5, unit: 'pc' }],
  tofu_tikka: [{ item: 'Tofu', qty: 120, unit: 'g' }, { item: 'Curd', qty: 30, unit: 'g' }, { item: 'Capsicum', qty: 0.5, unit: 'pc' }],
  protein_bar: [{ item: 'Protein bar', qty: 1, unit: 'pc' }],
  peanut_butter_apple: [{ item: 'Apple', qty: 1, unit: 'pc' }, { item: 'Peanut butter', qty: 16, unit: 'g' }],
};

/** The planner's view of the seed data. */
export function toFoodItems(foods: SeedFood[]): FoodItem[] {
  return foods.map((f) => {
    const serving = f.servings.find((s) => s.isDefault) ?? f.servings[0];
    return {
      id: f.id,
      name: f.name,
      per100: { kcal: f.kcal100, proteinG: f.protein100, carbsG: f.carbs100, fatG: f.fat100, fiberG: f.fiber100 },
      serving: { label: serving.label, grams: serving.grams },
      isDish: f.isDish,
      slots: f.slots,
      tags: f.tags,
      isEstimate: f.isEstimate,
    };
  });
}
