/** "Good morning" and friends, from the hour of the day. */

export type GreetingIcon = 'sun' | 'moon';

export interface Greeting {
  text: string;
  icon: GreetingIcon;
}

export function greetingFor(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: 'sun' };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', icon: 'sun' };
  if (hour >= 17 && hour < 22) return { text: 'Good evening', icon: 'moon' };
  return { text: 'Late one', icon: 'moon' };
}

/** The first letter of the name for the avatar, or null when there is no name to use. */
export function initialOf(name: string): string | null {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : null;
}
