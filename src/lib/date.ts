export const TIME_ZONE = "Asia/Tehran";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD

export function localizeDate(d: Date): string {
  return dateFormatter.format(d);
}

/** `true` when both instants fall on the same calendar day in TIME_ZONE. */
export function isSameDay(a: Date, b: Date): boolean {
  return dayFormatter.format(a) === dayFormatter.format(b);
}
