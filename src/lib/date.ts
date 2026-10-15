const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

export function localizeDate(d: Date): string {
  return dateFormatter.format(d);
}
