/**
 * Body areas used for injuries, pain check-ins, and which areas an exercise loads.
 * The same ids are shared everywhere, so reporting pain in an area can remove the exercises that load it.
 */
export const BODY_AREAS = [
  { id: 'neck', label: 'Neck' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'wrist', label: 'Wrist / hand' },
  { id: 'upper_back', label: 'Upper back' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'hip', label: 'Hip / glute' },
  { id: 'groin', label: 'Groin / adductor' },
  { id: 'hamstring', label: 'Hamstring' },
  { id: 'quad', label: 'Quad / thigh' },
  { id: 'knee', label: 'Knee' },
  { id: 'shin', label: 'Shin' },
  { id: 'calf', label: 'Calf / Achilles' },
  { id: 'ankle', label: 'Ankle' },
  { id: 'foot', label: 'Foot' },
] as const;

export type BodyArea = (typeof BODY_AREAS)[number]['id'];
