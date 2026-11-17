/**
 * Get initials from a name or email
 */
export function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ').filter((part) => part && !/^(dr|dra|prof|mr|mrs|ms)\.?$/i.test(part));
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
