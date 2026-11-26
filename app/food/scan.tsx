import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { addFood, getFood, logFood, type FoodRow } from '@/db/repos/nutritionRepo';
import type { LogSlot } from '@/domain/nutrition/types';
import { todayKey } from '@/domain/dates';
import { PortionSheet } from '@/features/food/PortionSheet';
import { lookupBarcode } from '@/services/foodLookup';
import { Body, Button, Screen } from '@/ui/components';
import { colors, font, space, themedStyles } from '@/ui/theme';

/** Barcode → Open Food Facts → local food row → portion sheet. */
export default function ScanScreen() {
  const params = useLocalSearchParams<{ slot?: LogSlot; date?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState('Point the camera at a barcode.');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<FoodRow | null>(null);

  const onScanned = async ({ data }: { data: string }) => {
    if (busy || picked) return;
    setBusy(true);
    setStatus(`Looking up ${data}…`);
    try {
      const existing = getFood(`off:${data}`);
      if (existing) {
        setPicked(existing);
        return;
      }
      const result = await lookupBarcode(data);
      if (!result) {
        setStatus(`No product found for ${data}. Try searching by name instead.`);
        return;
      }
      addFood(result);
      setPicked(getFood(result.id) ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };

  if (!permission?.granted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Scan barcode' }} />
        <Screen edges={['bottom']}>
          <Body>Camera access is needed to read barcodes. Nothing is recorded or stored.</Body>
          <View style={{ height: space.md }} />
          <Button label="Allow camera" onPress={() => void requestPermission()} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Scan barcode' }} />
      <View style={styles.screen}>
        <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={(r) => void onScanned(r)} />
        <Text style={styles.status}>{status}</Text>
      </View>
      {picked ? (
        <PortionSheet
          key={picked.id}
          food={picked}
          onLog={(input) => {
            logFood({ date: params.date ?? todayKey(), slot: params.slot ?? 'snack', food: picked, ...input });
            router.back();
            router.back();
          }}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  camera: { flex: 1 },
  status: { color: colors.text, fontSize: font.body, padding: space.lg, textAlign: 'center' },
}));
