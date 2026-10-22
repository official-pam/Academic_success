export function isDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const isTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
