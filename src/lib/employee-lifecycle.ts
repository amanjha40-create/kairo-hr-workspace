const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getLastWorkingDayError({
  value,
  joiningDate,
  today = new Date().toISOString().slice(0, 10),
}: {
  value: string;
  joiningDate?: string | null;
  today?: string;
}) {
  if (!value) return "Last Working Day is required.";
  if (!isRealIsoDate(value)) return "Enter a valid Last Working Day.";
  if (value > today) return "Last Working Day cannot be in the future.";
  if (joiningDate && isRealIsoDate(joiningDate) && value < joiningDate) {
    return "Last Working Day cannot be before the joining date.";
  }
  return null;
}
