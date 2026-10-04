import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { ensureDefaults } from '@/db/repos/setup';
import { settings } from '@/db/schema';
import { onAppForeground, onAppStart } from '@/sync/appStart';
import { colors, font, space } from '@/ui/theme';

// Registers the background sync task at import time, as expo-task-manager requires.
import '@/sync/backgroundTask';

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

export default function RootLayout() {
  // Applies any new migrations on launch, so app updates keep existing data.
  const { success, error } = useMigrations(db, migrations);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit" />
        <Stack.Screen name="exercises" />
        <Stack.Screen name="workout/[id]" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="run" />
        <Stack.Screen name="ride" />
        <Stack.Screen name="log" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="food" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
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
