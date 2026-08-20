
export const getRandomColor = () => {
  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getInitials = (name: string) => {
  if (!name) return 'RV';
  return name.substring(0, 2).toUpperCase();
};
