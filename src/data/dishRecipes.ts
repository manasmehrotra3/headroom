/**
 * Home-style Indian vegetarian recipes for every suggested dish in Headroom.
 * Each entry provides prep/cook times, region tag, clear step-by-step instructions,
 * and an optional high-protein / low-oil tip. Dishes not listed explicitly get a
 * tailored recipe generated from their ingredient list and dish style.
 */
export interface DishRecipe {
  prepMin: number;
  cookMin: number;
  region: string;
  steps: string[];
  tip?: string;
}

export const DISH_RECIPES: Record<string, DishRecipe> = {
  // ───────────────────────────── South Indian ─────────────────────────────
  pesarattu_ginger: {
    prepMin: 10,
    cookMin: 12,
    region: 'Andhra · South',
    steps: [
      'Soak whole green moong overnight (or 4–6 h), drain, and blend with ginger, green chilli, cumin and a splash of water into a smooth dosa batter.',
      'Heat a lightly oiled cast-iron or non-stick tawa on medium, spread a ladle of batter thin, and scatter chopped onion on top.',
      'Cook 2–3 min per side until crisp and golden; serve hot with curd and ginger chutney.',
    ],
    tip: 'No fermentation needed — keep soaked moong in the fridge to blend fresh batter in 2 minutes.',
  },
  adai_avial: {
    prepMin: 10,
    cookMin: 15,
    region: 'Tamil Nadu · South',
    steps: [
      'Soak mixed dals (toor, chana, urad) with a spoon of rice for 3–4 h, then coarse-grind with dried red chilli, ginger, curry leaves and salt.',
      'Simmer diced mixed vegetables with turmeric until tender, stir in whisked curd and a little grated coconut with curry-leaf tempering for quick avial.',
      'Spread thick crisp adais on a medium tawa with a few drops of oil and serve hot with avial.',
    ],
    tip: 'Using a 3:1 dal-to-rice ratio keeps adai much higher in protein than regular dosa.',
  },
  ragi_dosa_sambar_curd: {
    prepMin: 5,
    cookMin: 12,
    region: 'Karnataka · South',
    steps: [
      'Whisk ragi flour with water, salt, cumin, finely chopped onion and curry leaves into a thin pouring batter (rest 10 min).',
      'Pour onto a hot lightly greased tawa from the edges inward so it laces crisply; cook until the edges lift.',
      'Serve warm with piping-hot toor dal sambar and a side bowl of Greek yogurt for extra protein.',
    ],
  },
  idli_sambar_yogurt: {
    prepMin: 5,
    cookMin: 12,
    region: 'South Indian',
    steps: [
      'Grease idli moulds lightly, spoon in fermented batter, and steam 10–12 min until a toothpick comes out clean.',
      'Reheat or simmer toor dal sambar with seasonal vegetables, tamarind and sambar powder.',
      'Serve 3 hot idlis with generous sambar and a side of plain or spiced Greek yogurt to hit your breakfast protein.',
    ],
  },
  dosa_sambar: {
    prepMin: 5,
    cookMin: 10,
    region: 'South Indian',
    steps: [
      'Heat a cast-iron tawa, sprinkle a few drops of water to test temperature, and wipe clean.',
      'Spread a ladle of dosa batter thinly in circular strokes, drizzle 1/2 tsp oil around the rim, and crisp until golden.',
      'Serve hot with warm toor dal sambar.',
    ],
  },
  poha_sprouts_peanuts: {
    prepMin: 5,
    cookMin: 10,
    region: 'Maharashtra · West',
    steps: [
      'Rinse thick poha in a strainer for 20 seconds and drain completely so the flakes stay fluffy.',
      'Dry-roast or lightly sauté peanuts with mustard seeds, curry leaves, green chilli and sliced onion; add steamed moong sprouts and turmeric.',
      'Fold in the poha with salt, cover 2 min on low heat, and finish with fresh lemon juice and coriander.',
    ],
    tip: 'Adding steamed moong sprouts nearly doubles the protein and fibre of classic kanda poha.',
  },
  upma_curd_peanuts: {
    prepMin: 5,
    cookMin: 12,
    region: 'South Indian',
    steps: [
      'Dry-roast rava (semolina) 3–4 min until fragrant and set aside.',
      'Temper mustard seeds, chana dal, curry leaves and peanuts in 1 tsp oil; sauté chopped mixed vegetables 3 min.',
      'Add 2.5× hot water with salt, stream in rava while stirring, cover 2 min until fluffy, and serve alongside Greek yogurt.',
    ],
  },
  bisi_bele_bath_raita: {
    prepMin: 10,
    cookMin: 20,
    region: 'Karnataka · South',
    steps: [
      'Pressure-cook toor dal, rice and diced mixed vegetables with turmeric and salt for 3 whistles.',
      'Stir in tamarind pulp and 1.5 tbsp bisi bele bath powder; simmer 4–5 min to a thick, spoonable consistency.',
      'Finish with a small mustard-curry leaf tadka and serve with chilled cucumber raita.',
    ],
  },
  curd_quinoa_tadka: {
    prepMin: 5,
    cookMin: 15,
    region: 'South Indian Fusion',
    steps: [
      'Rinse quinoa well and simmer in 2× water for 12–14 min until fluffy; let cool for 5 minutes.',
      'Fold in thick curd, salt, grated ginger and pomegranate arils.',
      'Top with a quick tadka of mustard seeds, urad dal, green chilli and curry leaves.',
    ],
    tip: 'Swap half the curd for Greek yogurt to boost protein by another 8–10 g.',
  },
  pongal_moong_sambar: {
    prepMin: 5,
    cookMin: 18,
    region: 'Tamil Nadu · South',
    steps: [
      'Dry-roast yellow moong dal 2 min until nutty, then pressure-cook with equal rice, turmeric and 3.5× water for 3–4 whistles.',
      'Temper whole black pepper, cumin, ginger and curry leaves in 1 tsp ghee and fold into the soft pongal.',
      'Serve warm with sambar.',
    ],
  },
  paniyaram_chutney_curd: {
    prepMin: 5,
    cookMin: 12,
    region: 'Tamil Nadu · South',
    steps: [
      'Mix fermented lentil/idli batter with sautéed onion, grated carrot, mustard seeds and chopped coriander.',
      'Brush a paniyaram pan lightly with oil, fill moulds three-quarters full, and cover on medium-low for 4 min.',
      'Flip each dumpling with a skewer, crisp 3 min more, and serve with sambar and curd.',
    ],
  },
  sundal_chana_snack: {
    prepMin: 5,
    cookMin: 10,
    region: 'Tamil Nadu · South',
    steps: [
      'Pressure-cook soaked chickpeas until tender (or rinse cooked chickpeas well).',
      'Temper mustard seeds, urad dal, dried red chilli, hing and curry leaves in 1 tsp oil.',
      'Toss in chickpeas, salt and grated coconut for 2–3 min; finish with lemon juice.',
    ],
  },
  sundal_moong_snack: {
    prepMin: 5,
    cookMin: 10,
    region: 'Tamil Nadu · South',
    steps: [
      'Steam or pressure-cook soaked whole green moong until tender yet intact (1 whistle).',
      'Temper mustard seeds, green chilli, ginger and curry leaves in 1 tsp oil; toss in the moong, salt and grated coconut.',
    ],
  },

  // ───────────────────────────── West Indian ─────────────────────────────
  handvo_curd: {
    prepMin: 10,
    cookMin: 20,
    region: 'Gujarat · West',
    steps: [
      'Whisk fermented lentil-rice handvo batter with grated lauki (bottle gourd), ginger-chilli paste, turmeric and salt.',
      'Heat 1 tsp oil in a small heavy pan with mustard seeds, sesame seeds and curry leaves.',
      'Pour batter in, cover on low heat 8–10 min until the bottom is crisp, flip carefully and cook 6–8 min more. Slice and serve with curd.',
    ],
  },
  thalipeeth_curd: {
    prepMin: 8,
    cookMin: 10,
    region: 'Maharashtra · West',
    steps: [
      'Knead multigrain flour (jowar, besan, atta) with finely chopped onion, coriander, cumin, turmeric, salt and warm water into a soft dough.',
      'Pat thin onto a damp cloth or parchment paper, poke 3 small holes so it cooks evenly, and transfer onto a hot tawa.',
      'Cook 2–3 min per side with a brush of oil; serve hot with thick curd.',
    ],
  },
  matki_usal_roti: {
    prepMin: 5,
    cookMin: 15,
    region: 'Maharashtra · West',
    steps: [
      'Temper mustard seeds, cumin, curry leaves and hing; sauté chopped onion, ginger-garlic and tomato until soft.',
      'Add turmeric, goda/garam masala and sprouted matki (moth beans) with 1 cup water; simmer covered 10–12 min until tender.',
      'Garnish with coriander and lemon; serve with 2 warm whole-wheat rotis.',
    ],
  },
  misal_lite: {
    prepMin: 5,
    cookMin: 15,
    region: 'Maharashtra · West',
    steps: [
      'Simmer sprouted matki with onion, tomato, ginger-garlic and misal/garam masala in light gravy (skip the heavy oil tarri).',
      'Serve hot in a bowl topped with raw diced onion, coriander, lemon juice and a side of cooling curd.',
    ],
  },
  jowar_bhakri_pithla: {
    prepMin: 8,
    cookMin: 15,
    region: 'Maharashtra · West',
    steps: [
      'Whisk besan smoothly into water with turmeric and salt. Sauté mustard seeds, garlic, green chilli and onion, then pour in the besan slurry.',
      'Stir continuously on low heat 6–8 min until thick, glossy pithla forms; finish with coriander.',
      'Serve alongside 2 fresh jowar bhakris and crisp salad.',
    ],
  },
  methi_thepla_greek_yogurt: {
    prepMin: 8,
    cookMin: 10,
    region: 'Gujarat · West',
    steps: [
      'Knead whole wheat flour with chopped fresh methi leaves, turmeric, cumin, sesame seeds, a spoon of curd and warm water.',
      'Roll into thin circles and cook on a hot tawa 1–2 min per side with minimal oil.',
      'Serve warm with a generous bowl of spiced Greek yogurt to round out the protein.',
    ],
  },
  khaman_dhokla_chaas: {
    prepMin: 5,
    cookMin: 15,
    region: 'Gujarat · West',
    steps: [
      'Whisk besan, curd, turmeric, ginger-chilli paste, salt and water into a ribbon-smooth batter; fold in fruit salt/baking soda just before steaming.',
      'Steam 12–14 min until spongy; top with mustard-curry leaf-green chilli water tempering.',
      'Serve 4 squares alongside a tall glass of spiced roasted-cumin chaas.',
    ],
  },
  moong_dal_muthiya: {
    prepMin: 10,
    cookMin: 15,
    region: 'Gujarat · West',
    steps: [
      'Grate lauki and mix with soaked coarsely ground moong dal, a little atta, ginger-chilli, turmeric, cumin and salt; shape into logs.',
      'Steam 12–15 min until firm, slice into rounds, and lightly toss in a 1-tsp mustard and sesame tadka.',
    ],
  },
  kothimbir_vadi_airfried: {
    prepMin: 8,
    cookMin: 15,
    region: 'Maharashtra · West',
    steps: [
      'Mix besan, generous chopped coriander, ginger-chilli, sesame seeds, turmeric, salt and water into a thick batter.',
      'Steam 12 min in a greased tin, cool slightly and cut into squares.',
      'Air-fry at 190 °C for 8–10 min (or pan-sear on a tawa) until crisp outside.',
    ],
  },
  bajra_khichdi_kadhi: {
    prepMin: 10,
    cookMin: 22,
    region: 'Rajasthan / Gujarat · West',
    steps: [
      'Coarsely pulse soaked bajra and pressure-cook with yellow moong dal, turmeric, salt and 4× water for 4–5 whistles until creamy.',
      'For quick kadhi, whisk besan and curd with water and ginger; simmer 10 min with a cumin-methi-curry leaf tadka.',
      'Serve hot khichdi drizzled with kadhi.',
    ],
  },
  gatte_ki_sabzi_roti: {
    prepMin: 10,
    cookMin: 18,
    region: 'Rajasthan · West',
    steps: [
      'Make a stiff dough of besan, ajwain, turmeric, chilli, 1 tbsp curd and a drop of oil; roll into logs and boil 10 min, then slice into coins.',
      'Whisk curd with coriander powder and turmeric; temper cumin and hing, pour in curd on low heat while stirring, and simmer gatte 6–8 min.',
      'Serve hot with 2 whole-wheat rotis.',
    ],
  },

  // ───────────────────────────── North & East Indian ─────────────────────────────
  besan_chilla: {
    prepMin: 5,
    cookMin: 10,
    region: 'North Indian',
    steps: [
      'Whisk besan with water, ajwain, turmeric, salt, finely chopped onion, tomato and capsicum into a pourable batter.',
      'Spread on a lightly oiled non-stick tawa and cook 2–3 min per side until golden and cooked through.',
      'Serve hot with mint chutney or curd.',
    ],
  },
  moong_chilla: {
    prepMin: 8,
    cookMin: 12,
    region: 'North Indian',
    steps: [
      'Blend soaked yellow moong dal with ginger, green chilli and salt into a smooth batter.',
      'Spread thin on a hot tawa, scatter crumbled spiced paneer and onion across the centre, and fold once crisp.',
    ],
  },
  paneer_bhurji_toast: {
    prepMin: 5,
    cookMin: 10,
    region: 'North Indian',
    steps: [
      'Sauté chopped onion, green chilli, ginger and tomato in 1 tsp oil with turmeric, cumin and garam masala.',
      'Crumble in fresh paneer, toss 3–4 min on medium heat until juicy (do not overcook), and finish with coriander.',
      'Serve piled onto 2 slices of crisp whole-wheat toast.',
    ],
  },
  paneer_bhurji_roti: {
    prepMin: 5,
    cookMin: 12,
    region: 'North Indian',
    steps: [
      'Sauté finely diced onion, ginger, green chilli and tomato with cumin, turmeric and coriander powder.',
      'Fold in crumbled paneer and cook 3–4 min until warm and coated; garnish with fresh coriander and serve with 2 rotis.',
    ],
  },
  tofu_scramble_toast: {
    prepMin: 5,
    cookMin: 10,
    region: 'Indian Fusion',
    steps: [
      'Press firm tofu briefly in a clean towel and crumble with your fingers.',
      'Sauté cumin seeds, onion, tomato and turmeric in 1 tsp oil; add tofu, black salt/salt, black pepper and garam masala, cooking 5 min.',
      'Serve hot with 2 slices of whole-wheat toast.',
    ],
  },
  tofu_bhurji_roti: {
    prepMin: 5,
    cookMin: 12,
    region: 'North Indian Fusion',
    steps: [
      'Sauté cumin, chopped onion, ginger-garlic and tomato with turmeric and pav bhaji or garam masala.',
      'Crumble pressed firm tofu into the masala, stir-fry 5 min until lightly browned at the edges, and serve with 2 rotis.',
    ],
  },
  palak_paneer_roti: {
    prepMin: 8,
    cookMin: 15,
    region: 'North Indian',
    steps: [
      'Blanch washed spinach 2 min in boiling water, cool quickly and blend smooth with 1 green chilli.',
      'Sauté cumin, garlic, ginger and onion in 1 tsp oil; add the spinach puree, salt and garam masala and simmer 5 min.',
      'Fold in cubed paneer for 2 min until warm and serve with 2 whole-wheat rotis.',
    ],
  },
  paneer_kadai_roti: {
    prepMin: 8,
    cookMin: 15,
    region: 'North Indian',
    steps: [
      'Dry-roast and crush coriander seeds and dried red chilli for quick kadai masala.',
      'Stir-fry cubed capsicum and onion on high heat for 2 min; add tomato puree, ginger and kadai masala and cook until thick.',
      'Fold in paneer cubes for 3 min, finish with kasuri methi, and serve with 2 rotis.',
    ],
  },
  lobia_curry_rice: {
    prepMin: 5,
    cookMin: 20,
    region: 'North Indian',
    steps: [
      'Soak lobia (black-eyed peas) 1–2 h (they cook fast) and pressure-cook 2 whistles with salt and turmeric.',
      'Sauté cumin, onion, ginger-garlic and tomato with coriander powder and garam masala; simmer cooked lobia in the gravy 6–8 min.',
      'Serve hot over steamed rice.',
    ],
  },
  lobia_curry_roti: {
    prepMin: 5,
    cookMin: 20,
    region: 'North Indian',
    steps: [
      'Pressure-cook soaked lobia 2 whistles with salt and turmeric.',
      'Simmer in an onion-tomato-ginger masala for 8 min until thick, garnish with coriander, and serve with 2 rotis.',
    ],
  },
  besan_kadhi_rice: {
    prepMin: 5,
    cookMin: 18,
    region: 'North Indian',
    steps: [
      'Whisk besan, sour curd, turmeric, ginger and 3 cups water until lump-free.',
      'Temper methi seeds, cumin, hing and curry leaves; pour in the curd mix and simmer gently 12–15 min, adding pan-seared or steamed besan pakoras in the last 5 min.',
      'Serve hot over steamed rice.',
    ],
  },
  sattu_paratha_raita: {
    prepMin: 10,
    cookMin: 12,
    region: 'Bihar · East',
    steps: [
      'Mix roasted sattu with finely minced onion, garlic, green chilli, ajwain, lemon juice, salt and 1 tsp mustard oil until crumbly.',
      'Stuff into whole-wheat dough balls, roll gently and cook on a hot tawa until spotted brown.',
      'Serve hot with chilled cucumber raita.',
    ],
    tip: 'Sattu is roasted Bengal gram flour — ~20 g protein per 100 g with zero soaking needed.',
  },
  sattu_chaas_cooler: {
    prepMin: 3,
    cookMin: 0,
    region: 'Bihar · East',
    steps: [
      'Whisk roasted sattu with curd, cold water, roasted cumin powder, black salt, chopped mint and lemon juice until frothy.',
      'Serve chilled immediately.',
    ],
  },
  chana_dal_palak_roti: {
    prepMin: 5,
    cookMin: 20,
    region: 'North Indian',
    steps: [
      'Pressure-cook soaked chana dal with chopped spinach, turmeric, ginger and salt for 3 whistles.',
      'Finish with a quick garlic-cumin-tomato tadka and serve hot with 2 rotis.',
    ],
  },
  urad_dal_chawal_salad: {
    prepMin: 5,
    cookMin: 18,
    region: 'North Indian',
    steps: [
      'Pressure-cook washed dhuli urad dal with ginger, turmeric and salt for 2 whistles so grains hold slight texture.',
      'Top with a cumin-hing-garlic tadka and serve with steamed rice and diced cucumber-tomato kachumber.',
    ],
  },
  baingan_bharta_dal_roti: {
    prepMin: 8,
    cookMin: 20,
    region: 'North Indian',
    steps: [
      'Roast whole eggplant directly over flame (or air-fry at 200 °C for 18 min) until soft, peel the charred skin and mash.',
      'Sauté onion, garlic, green chilli and tomato with cumin and fold in the smoky mashed eggplant for 5 min.',
      'Serve alongside simple moong dal and 2 whole-wheat rotis.',
    ],
  },
  soya_biryani_raita: {
    prepMin: 10,
    cookMin: 20,
    region: 'North Indian',
    steps: [
      'Boil soya chunks 5 min, squeeze dry, and marinate 10 min in curd, ginger-garlic paste and biryani masala.',
      'Sauté whole spices and sliced onion; add marinated soya chunks, washed rice and 2× water, and cook covered 12–14 min.',
      'Fluff with mint leaves and serve with cucumber raita.',
    ],
  },
  tempeh_tikka_roti: {
    prepMin: 10,
    cookMin: 12,
    region: 'Modern Indian',
    steps: [
      'Steam tempeh cubes 5 min (removes any bitterness), then coat with hung curd, tandoori masala, lemon juice and ginger-garlic.',
      'Air-fry at 190 °C for 10 min or pan-grill with diced capsicum and onion until charred at the edges.',
      'Serve hot with mint chutney and 2 rotis.',
    ],
  },
  tempeh_stir_fry_bowl: {
    prepMin: 8,
    cookMin: 12,
    region: 'Modern Indian Fusion',
    steps: [
      'Pan-sear cubed tempeh with crushed black pepper, garlic and cumin until golden.',
      'Toss in crisp mixed vegetables with a splash of soy sauce and lime; serve over fluffy cooked quinoa.',
    ],
  },
  tofu_palak_roti: {
    prepMin: 8,
    cookMin: 15,
    region: 'North Indian',
    steps: [
      'Blanch spinach 2 min and blend smooth with green chilli and garlic.',
      'Simmer with sautéed onion, cumin and garam masala for 5 min, fold in pan-seared tofu cubes, and serve with 2 rotis.',
    ],
  },
  tofu_kadai_rice: {
    prepMin: 8,
    cookMin: 15,
    region: 'North Indian',
    steps: [
      'Sear firm tofu cubes until lightly golden; toss with capsicum, onion, tomato masala and crushed coriander-chilli spice.',
      'Serve hot over cooked brown rice.',
    ],
  },
  soya_chilla_curd: {
    prepMin: 5,
    cookMin: 10,
    region: 'North Indian',
    steps: [
      'Soak soya granules in hot water 5 min, squeeze dry, and blend coarsely with rolled oats, ginger, green chilli, salt and water.',
      'Spread on a lightly oiled non-stick tawa and cook 3 min per side until crisp; serve with curd.',
    ],
  },
  oats_moong_khichdi: {
    prepMin: 5,
    cookMin: 15,
    region: 'Home Comfort',
    steps: [
      'Temper cumin, ginger and mixed vegetables in a pressure cooker; stir in washed yellow moong dal, rolled oats, turmeric and salt.',
      'Add 3.5× water and cook 2 whistles until creamy; serve hot with curd.',
    ],
  },
  daliya_moong_curd: {
    prepMin: 5,
    cookMin: 18,
    region: 'North Indian',
    steps: [
      'Dry-roast daliya (broken wheat) 3 min until aromatic.',
      'Pressure-cook with yellow moong dal, cumin, vegetables, turmeric and 3.5× water for 3 whistles; serve warm with curd.',
    ],
  },
  hung_curd_veg_sandwich: {
    prepMin: 8,
    cookMin: 5,
    region: 'Indian Cafe Style',
    steps: [
      'Mix thick Greek yogurt/hung curd with grated paneer, finely diced cucumber, capsicum, black pepper, chaat masala and coriander.',
      'Spread between 2 slices of whole-wheat bread and grill 3–4 min until crisp and golden.',
    ],
  },
  quinoa_pulao_paneer: {
    prepMin: 8,
    cookMin: 18,
    region: 'Modern Indian',
    steps: [
      'Sauté whole spices (bay leaf, cumin, cloves) and mixed veggies; add rinsed quinoa and 2× water and simmer 14 min.',
      'Pan-grill spiced paneer cubes separately, fold on top with coriander, and serve with raita.',
    ],
  },
  millet_dal_bowl: {
    prepMin: 5,
    cookMin: 20,
    region: 'Pan-Indian',
    steps: [
      'Rinse foxtail/bajra millet and simmer in 2× water for 14–15 min until fluffy.',
      'Pressure-cook panchmel (mixed) dal with turmeric, tomato and cumin-garlic tadka; serve together in a bowl with curd.',
    ],
  },
  rajma_chawal: {
    prepMin: 5,
    cookMin: 25,
    region: 'Punjab · North',
    steps: [
      'Pressure-cook overnight-soaked rajma with salt and bay leaf until creamy (5–6 whistles).',
      'Sauté onion, ginger-garlic and tomato with rajma/garam masala; mash a spoonful of beans to thicken and simmer 8 min. Serve over hot rice.',
    ],
  },
  chole_roti: {
    prepMin: 5,
    cookMin: 25,
    region: 'Punjab · North',
    steps: [
      'Pressure-cook soaked kabuli chana with salt and a tea bag/amla until soft.',
      'Simmer in an onion-tomato-ginger gravy with chole masala and amchur for 8–10 min; serve with 2 rotis and sliced onion.',
    ],
  },
  chole_rice: {
    prepMin: 5,
    cookMin: 25,
    region: 'Punjab · North',
    steps: [
      'Pressure-cook soaked chickpeas until tender, then simmer 10 min in spiced onion-tomato-amchur masala.',
      'Serve hot over steamed rice with fresh lemon.',
    ],
  },
  kala_chana_curry_roti: {
    prepMin: 5,
    cookMin: 25,
    region: 'North Indian',
    steps: [
      'Pressure-cook overnight-soaked kala chana 5–6 whistles until tender.',
      'Simmer in a cumin-onion-tomato-coriander gravy 8 min and serve with 2 whole-wheat rotis.',
    ],
  },
  soya_chunk_curry_roti: {
    prepMin: 5,
    cookMin: 18,
    region: 'North Indian',
    steps: [
      'Boil soya chunks 5 min in salted water, rinse cold and squeeze firmly so they absorb masala.',
      'Sauté onion, ginger-garlic, tomato and garam masala; simmer soya chunks in the gravy 8 min and serve with 2 rotis.',
    ],
  },
  soya_keema_roti: {
    prepMin: 5,
    cookMin: 16,
    region: 'North Indian',
    steps: [
      'Soak soya granules in hot water 5 min and squeeze dry.',
      'Sauté cumin, onion, ginger-garlic, tomato and green peas with garam masala; stir-fry soya granules 6–8 min and serve with 2 rotis.',
    ],
  },
  dal_roti_sabzi: {
    prepMin: 5,
    cookMin: 20,
    region: 'Everyday Home Meal',
    steps: [
      'Pressure-cook toor or moong dal with turmeric and salt; finish with a 1-tsp ghee cumin-garlic-tomato tadka.',
      'Stir-fry seasonal vegetables with cumin, turmeric and coriander powder until crisp-tender; serve with 2 rotis.',
    ],
  },
  sprouted_moth_chaat: {
    prepMin: 5,
    cookMin: 5,
    region: 'West / North Indian',
    steps: [
      'Lightly steam sprouted moth beans for 4–5 min until crisp-tender.',
      'Toss with diced cucumber, tomato, onion, roasted cumin, chaat masala, coriander and fresh lemon juice.',
    ],
  },
  edamame_chaat: {
    prepMin: 3,
    cookMin: 5,
    region: 'Indian Fusion',
    steps: [
      'Steam shelled edamame and sweet corn for 4–5 min until tender.',
      'Toss warm with chaat masala, black salt, red chilli, coriander and lemon juice.',
    ],
  },
  besan_tofu_tikki: {
    prepMin: 8,
    cookMin: 10,
    region: 'North Indian',
    steps: [
      'Mash firm tofu with besan, grated ginger, green chilli, cumin, coriander and salt; shape into 3 flat patties.',
      'Pan-sear on a lightly oiled tawa 4 min per side until crisp and golden; serve with mint chutney.',
    ],
  },
  chana_dal_tikki_chaat: {
    prepMin: 10,
    cookMin: 12,
    region: 'North Indian',
    steps: [
      'Coarsely grind soaked (or par-boiled) chana dal with ginger, cumin, green chilli and coriander; form 3 patties.',
      'Pan-sear on a lightly oiled tawa until crisp on both sides; top with whipped curd, mint chutney and chaat masala.',
    ],
  },
  greek_yogurt_raita_bowl: {
    prepMin: 4,
    cookMin: 0,
    region: 'North Indian',
    steps: [
      'Whisk Greek yogurt with diced cucumber, roasted cumin powder, black salt, chopped mint and ground flax seeds.',
      'Serve chilled as a high-protein savoury snack.',
    ],
  },
  high_protein_lassi: {
    prepMin: 3,
    cookMin: 0,
    region: 'North Indian',
    steps: [
      'Blend Greek yogurt with cold water, roasted jeera, black salt, grated ginger and fresh mint until smooth and frothy.',
    ],
  },
  roasted_soya_nuts: {
    prepMin: 2,
    cookMin: 0,
    region: 'Ready Snack',
    steps: [
      'Measure a 40 g portion of dry-roasted soya nuts and toss with a pinch of chaat masala and lime if desired.',
    ],
  },
  makhana_peanuts_chana: {
    prepMin: 2,
    cookMin: 6,
    region: 'North Indian',
    steps: [
      'Dry-roast makhana in a pan on low heat 5–6 min until crunchy; toss with a drop of ghee, turmeric and black salt.',
      'Mix with roasted chana and roasted peanuts once cool.',
    ],
  },
};

/**
 * Returns a tailored recipe for any dish id — explicit if curated above,
 * or cleanly synthesized from the dish's name and ingredient list for all other dishes & custom recipes.
 */
export function recipeForDish(dishId: string, dishName: string, ingredients: { item: string }[]): DishRecipe {
  const curated = DISH_RECIPES[dishId];
  if (curated) return curated;

  const names = ingredients.map((i) => i.item.toLowerCase());
  const lower = dishName.toLowerCase();

  if (lower.includes('shake') || lower.includes('drink') || lower.includes('lassi') || lower.includes('chaas') || lower.includes('milk')) {
    return {
      prepMin: 3,
      cookMin: 0,
      region: 'Quick Drink',
      steps: [
        `Combine ${ingredients.length ? ingredients.map((i) => i.item.toLowerCase()).join(', ') : 'all ingredients'} in a shaker or blender.`,
        'Blend or shake 20–30 seconds until smooth and frothy; serve chilled.',
      ],
    };
  }

  if (lower.includes('salad') || lower.includes('chaat') || lower.includes('bowl') || lower.includes('yogurt') || lower.includes('fruit')) {
    return {
      prepMin: 6,
      cookMin: 0,
      region: 'Fresh Prep',
      steps: [
        `Prep and chop ${ingredients.length ? ingredients.map((i) => i.item.toLowerCase()).join(', ') : 'the ingredients'} into bite-sized pieces.`,
        'Toss together with roasted cumin, chaat masala or black pepper, fresh coriander and lemon juice.',
        'Serve immediately while crisp.',
      ],
    };
  }

  if (lower.includes('tikka') || lower.includes('wrap') || lower.includes('sandwich')) {
    return {
      prepMin: 8,
      cookMin: 10,
      region: 'Grilled / Pan-Seared',
      steps: [
        `Season the main protein (${names.slice(0, 2).join(', ') || 'filling'}) with curd or lemon, ginger-garlic, cumin and garam masala.`,
        'Pan-grill or air-fry on medium-high heat until lightly charred and cooked through.',
        'Assemble warm with crisp veggies and mint chutney.',
      ],
    };
  }

  return {
    prepMin: 8,
    cookMin: 15,
    region: 'Home-Style Indian',
    steps: [
      `Prep and measure ${ingredients.length ? ingredients.map((i) => i.item.toLowerCase()).join(', ') : 'your ingredients'}.`,
      'Temper cumin, ginger-garlic and onion-tomato masala in 1 tsp oil with turmeric, coriander powder and salt.',
      'Cook the main dal, legume or paneer/tofu component until tender and well-coated; serve hot with your planned roti, rice or curd.',
    ],
  };
}
