export function formatItemsLeft(count: number): string {
  return `${count} item${count !== 1 ? "s" : ""} left`;
}
