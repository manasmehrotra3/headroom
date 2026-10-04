import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { desc } from 'drizzle-orm';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { addProgressPhoto, deleteProgressPhoto } from '@/db/repos/photoRepo';
import { progressPhotos } from '@/db/schema';
import { Body, Button, Screen, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font, radius, space } from '@/ui/theme';

/** Progress photos kept in the app's private folder. Never uploaded, not in backups. */
export default function PhotosScreen() {
  const { data: photos } = useLiveQuery(db.select().from(progressPhotos).orderBy(desc(progressPhotos.date), desc(progressPhotos.id)));

  const pick = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await addProgressPhoto(result.assets[0].uri);
  };

  const confirmDelete = (id: number) =>
    Alert.alert('Delete this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteProgressPhoto(id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Progress photos' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="Stored only on this phone. Same spot, same light, same time of day makes them comparable.">Photos</Title>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          <View style={{ flex: 1 }}>
            <Button label="Take photo" onPress={() => void pick(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="Pick from gallery" onPress={() => void pick(false)} />
          </View>
        </View>
        <View style={styles.grid}>
          {photos.map((p) => (
            <Pressable key={p.id} onLongPress={() => confirmDelete(p.id)} style={styles.cell}>
              <Image source={{ uri: p.uri }} style={styles.image} />
              <Text style={styles.date}>{formatShortDate(p.date)}</Text>
            </Pressable>
          ))}
        </View>
        {photos.length === 0 ? <Body dim>No photos yet.</Body> : <Body dim>Long-press a photo to delete it.</Body>}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: '48%' },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surface },
  date: { color: colors.textDim, fontSize: font.small, marginTop: space.xs },
});
