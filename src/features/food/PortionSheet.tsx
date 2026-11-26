import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { isFavorite, per100, servingsFor, toggleFavorite, type FoodRow } from '@/db/repos/nutritionRepo';
import { scale } from '@/domain/nutrition/types';
import { Body, Button, Chips, Stepper } from '@/ui/components';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

/** Pick a household serving and a quantity, see the macros, log it. */
export function PortionSheet({ food, onLog, onClose }: { food: FoodRow | null; onLog: (input: { servingLabel: string; quantity: number; grams: number }) => void; onClose: () => void }) {
  const servings = food ? servingsFor(food.id) : [];
  const [servingId, setServingId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fav, setFav] = useState(() => (food ? isFavorite(food.id) : false));

  if (!food) return null;
  const serving = servings.find((s) => s.id === servingId) ?? servings[0];
  const grams = (serving?.grams ?? 100) * quantity;
  const macros = scale(per100(food), grams);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={styles.title}>{food.name}</Text>
          <Pressable
            onPress={() => setFav(toggleFavorite(food.id))}
            hitSlop={12}
            accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Text style={{ color: fav ? colors.warning : colors.textDim, fontSize: 26 }}>{fav ? '★' : '☆'}</Text>
          </Pressable>
        </View>
        <Body dim>
          {food.isEstimate ? 'Estimate · ' : ''}
          {food.sourceRef}
        </Body>
        <Chips options={servings.map((s) => ({ id: String(s.id), label: s.label }))} selected={[String(serving?.id)]} onToggle={(id) => setServingId(Number(id))} />
        <Stepper label="How many" value={quantity} step={0.5} min={0.5} max={10} format={(v) => `${v} × ${serving?.label ?? '100 g'}`} onChange={setQuantity} />
        <Text style={styles.macros}>
          {Math.round(macros.kcal)} kcal · P {Math.round(macros.proteinG)} g · C {Math.round(macros.carbsG)} g · F {Math.round(macros.fatG)} g · fibre {Math.round(macros.fiberG)} g ({Math.round(grams)} g)
        </Text>
        <Button label="Log it" onPress={() => onLog({ servingLabel: serving?.label ?? '100 g', quantity, grams })} />
        <Button variant="secondary" label="Cancel" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.sheet, padding: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.md },
  title: { color: colors.text, fontSize: font.large, fontWeight: '600', flexShrink: 1 },
  macros: { color: colors.accent, fontSize: font.body },
}));
