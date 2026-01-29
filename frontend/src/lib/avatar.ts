/**
 * Generates a deterministic avatar URL using DiceBear API
 * when user doesn't have a profile picture
 */

// Generate a hash from a string (for consistent colors/avatars)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Color palettes for avatars
const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'], // Indigo to Violet
  ['#ec4899', '#f43f5e'], // Pink to Rose
  ['#14b8a6', '#22c55e'], // Teal to Green
  ['#f59e0b', '#ef4444'], // Amber to Red
  ['#3b82f6', '#6366f1'], // Blue to Indigo
  ['#8b5cf6', '#ec4899'], // Violet to Pink
  ['#22c55e', '#14b8a6'], // Green to Teal
  ['#06b6d4', '#3b82f6'], // Cyan to Blue
];

/**
 * Get avatar colors based on a seed string
 */
export function getAvatarColors(seed: string): { primary: string; secondary: string } {
  const hash = hashString(seed);
  const colors = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { primary: colors[0], secondary: colors[1] };
}

/**
 * Generate a DiceBear avatar URL
 * Uses the 'initials' style for a clean, professional look
 */
export function generateAvatarUrl(
  name?: string,
  email?: string,
  size: number = 128
): string {
  const seed = name || email || 'user';
  const colors = getAvatarColors(seed);

  // Use DiceBear API with initials style
  const encodedSeed = encodeURIComponent(seed);
  const backgroundColor = colors.primary.replace('#', '');

  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedSeed}&backgroundColor=${backgroundColor}&size=${size}`;
}

/**
 * Get initials from a name or email
 */
export function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '?';
  }

  if (email) {
    const localPart = email.split('@')[0];
    return localPart.slice(0, 2).toUpperCase();
  }

  return '?';
}

/**
 * Get the best available avatar URL
 * Falls back to generated avatar if no URL provided
 */
export function getAvatarUrl(
  avatarUrl?: string,
  name?: string,
  email?: string
): string | undefined {
  if (avatarUrl) {
    return avatarUrl;
  }

  // Generate a fallback avatar
  return generateAvatarUrl(name, email);
}
