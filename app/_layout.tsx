import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, AppState, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { ensureDefaults } from '@/db/repos/setup';
import { settings } from '@/db/schema';
import { onAppForeground, onAppStart } from '@/sync/appStart';
import { colorScheme, colors, font, setColorScheme, space, type ColorScheme, type ThemeMode } from '@/ui/theme';

// Registers the background sync task at import time, as expo-task-manager requires.
import '@/sync/backgroundTask';

/**
 * Paints the very first frame — the migration spinner, which renders before the settings query can
 * run — in the scheme that was chosen last, so a light-theme user gets no dark flash on a cold
 * start. On a first launch the settings table does not exist yet, and the default dark palette
 * stands until `usePaintedScheme` takes over.
 */
try {
  const stored = db.select({ themeMode: settings.themeMode }).from(settings).where(eq(settings.id, 1)).get()?.themeMode;
  if (stored) setColorScheme(stored === 'system' ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark') : stored);
} catch {
  // No settings table yet: first launch.
}

const queryClient = new QueryClient();

/**
 * Catches any render error in the app instead of showing the red screen (release builds just
 * show a blank one). Expo Router picks this up by name. The message is kept on screen because a
 * crash here is a bug report: there is no server collecting them.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: space.xl, justifyContent: 'center', gap: space.md }}>
      <Text style={{ color: colors.text, fontSize: font.large, fontWeight: '600' }}>Something broke.</Text>
      <Text style={{ color: colors.textDim, fontSize: font.body }}>
        Your data is safe: it lives in the database on this phone, and nothing here has touched it. Try again, and if it keeps happening the message below is what to report.
      </Text>
      <ScrollView style={{ maxHeight: 220 }}>
        <Text style={{ color: colors.danger, fontSize: font.small }} selectable>
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ''}
        </Text>
      </ScrollView>
      <Pressable onPress={retry} style={{ minHeight: 48, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.accentText, fontSize: font.body, fontWeight: '600' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

/**
 * Turns the stored preference into the scheme to paint and swaps the palette before anything below
 * renders. The returned scheme is used as a remount key: screens read `colors` straight from the
 * module, so a new palette only reaches them when they render again.
 */
function usePaintedScheme(mode: ThemeMode | null): ColorScheme {
  const phone = useColorScheme();

  // Keeps the keyboard, text selection and system dialogs on the same scheme as the app.
  useEffect(() => {
    if (mode) Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  // `mode` is null until the settings row arrives. Repainting a default in the meantime would
  // flash dark over the spinner on every cold start, so the scheme read at import time stands.
  if (!mode) return colorScheme();

  const scheme: ColorScheme = mode === 'system' ? (phone === 'light' ? 'light' : 'dark') : mode;
  setColorScheme(scheme);
  return scheme;
}

export default function RootLayout() {
  // Applies any new migrations on launch, so app updates keep existing data.
  const { success, error } = useMigrations(db, migrations);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      {error ? (
        <Centered>
          <Text style={{ color: colors.danger, fontSize: font.body }}>Database error: {error.message}</Text>
        </Centered>
      ) : success ? (
        <App />
      ) : (
        <Loading />
      )}
    </QueryClientProvider>
  );
}

function App() {
  useState(() => ensureDefaults());
  const { data, updatedAt } = useLiveQuery(db.select().from(settings).where(eq(settings.id, 1)));
  const onboarded = data[0]?.onboardingComplete ?? false;
  const scheme = usePaintedScheme(data[0]?.themeMode ?? null);

  // Sync, build the week, schedule notifications: on first open after onboarding and on every return to the foreground.
  useEffect(() => {
    if (!onboarded) return;
    void onAppStart();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void onAppForeground();
    });
    return () => sub.remove();
  }, [onboarded]);

  if (!updatedAt) return <Loading />;

  return (
    // Remounted on a theme switch so every mounted screen repaints with the new palette.
    <View key={scheme} style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="edit" />
          <Stack.Screen name="exercises" />
          <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="plan" />
          <Stack.Screen name="run" />
          <Stack.Screen name="ride" />
          <Stack.Screen name="log" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="insights" />
          <Stack.Screen name="food" />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.background }}>{children}</View>;
}

function Loading() {
  return (
    <Centered>
      <ActivityIndicator color={colors.accent} size="large" />
    </Centered>
  );
}
