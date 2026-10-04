export type EquipmentGroup = 'machines' | 'cables' | 'free_weights' | 'other';

export const EQUIPMENT_GROUP_LABELS: Record<EquipmentGroup, string> = {
  machines: 'Machines',
  cables: 'Cables',
  free_weights: 'Free weights',
  other: 'Bodyweight & other',
};

/**
 * Everything a workout might need. During onboarding you untick what your YMCA
 * doesn't have, and workouts only use what's ticked.
 */
export const EQUIPMENT = [
  { id: 'leg_press', label: 'Leg press', group: 'machines' },
  { id: 'leg_extension', label: 'Leg extension', group: 'machines' },
  { id: 'leg_curl', label: 'Leg curl (seated or lying)', group: 'machines' },
  { id: 'hip_abductor', label: 'Hip abductor / adductor', group: 'machines' },
  { id: 'calf_raise_machine', label: 'Calf raise machine', group: 'machines' },
  { id: 'chest_press_machine', label: 'Chest press machine', group: 'machines' },
  { id: 'pec_deck', label: 'Pec deck / rear delt fly', group: 'machines' },
  { id: 'shoulder_press_machine', label: 'Shoulder press machine', group: 'machines' },
  { id: 'lat_pulldown', label: 'Lat pulldown', group: 'machines' },
  { id: 'seated_row_machine', label: 'Seated row machine', group: 'machines' },
  { id: 'assisted_pullup', label: 'Assisted pull-up / dip machine', group: 'machines' },
  { id: 'back_extension', label: 'Back extension bench', group: 'machines' },
  { id: 'smith_machine', label: 'Smith machine', group: 'machines' },
  { id: 'cable_station', label: 'Adjustable cable station', group: 'cables' },
  { id: 'cable_crossover', label: 'Cable crossover (two stacks)', group: 'cables' },
  { id: 'dumbbells', label: 'Dumbbells', group: 'free_weights' },
  { id: 'adjustable_bench', label: 'Adjustable bench', group: 'free_weights' },
  { id: 'barbell_rack', label: 'Barbell + squat rack', group: 'free_weights' },
  { id: 'kettlebells', label: 'Kettlebells', group: 'free_weights' },
  { id: 'pullup_bar', label: 'Pull-up bar', group: 'other' },
  { id: 'resistance_bands', label: 'Resistance bands', group: 'other' },
  { id: 'stability_ball', label: 'Stability ball', group: 'other' },
  { id: 'plyo_box', label: 'Plyo box / step', group: 'other' },
  { id: 'mat', label: 'Mats / floor space', group: 'other' },
  { id: 'foam_roller', label: 'Foam roller', group: 'other' },
] as const satisfies readonly { id: string; label: string; group: EquipmentGroup }[];

export type EquipmentId = (typeof EQUIPMENT)[number]['id'];
