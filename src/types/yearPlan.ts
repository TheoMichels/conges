import { z } from "zod";

export const halfDaySchema = z.enum(["morning", "afternoon"]);
export type HalfDay = z.infer<typeof halfDaySchema>;

export const datesLeaveEntryDraftSchema = z.object({
  kind: z.literal("dates"),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  startHalf: halfDaySchema.optional(),
  endHalf: halfDaySchema.optional(),
});

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const validDatesLeaveEntryDraftSchema = datesLeaveEntryDraftSchema.refine(
  entry => isCalendarDate(entry.startDate) && isCalendarDate(entry.endDate) &&
    entry.endDate >= entry.startDate && !(entry.startDate === entry.endDate && entry.startHalf === "afternoon" && entry.endHalf === "morning"),
  "Les dates du congé sont invalides."
);

export const monthLeaveEntryDraftSchema = z.object({
  kind: z.literal("month"),
  label: z.string(),
  month: z.number().int().min(0).max(11),
  days: z.number().min(0),
});

export const leaveEntryDraftSchema = z.discriminatedUnion("kind", [
  datesLeaveEntryDraftSchema,
  monthLeaveEntryDraftSchema,
]);
export type LeaveEntryDraft = z.infer<typeof leaveEntryDraftSchema>;

export const datesLeaveEntrySchema = datesLeaveEntryDraftSchema.extend({
  id: z.string(),
  createdAt: z.number(),
});

export const monthLeaveEntrySchema = monthLeaveEntryDraftSchema.extend({
  id: z.string(),
  createdAt: z.number(),
});

export const leaveEntrySchema = z.discriminatedUnion("kind", [
  datesLeaveEntrySchema,
  monthLeaveEntrySchema,
]);
export type LeaveEntry = z.infer<typeof leaveEntrySchema>;

export const workPercentageSchema = z.number().gt(0).max(100)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8)
  .default(100);

export function parseWorkPercentage(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const result = workPercentageSchema.safeParse(Number(normalized));
  return result.success ? result.data : null;
}

export const yearPlanSchema = z.object({
  id: z.string(),
  year: z.string(),
  createdAt: z.number(),
  initialLeave: z.number(),
  carriedOver: z.number(),
  csupp: z.number(),
  holidayOverride: z.number().nullable().default(null),
  publicHolidays: z.number(),
  entries: z.array(leaveEntrySchema),
});
export type YearPlan = z.infer<typeof yearPlanSchema>;

export const yearPlansSchema = z.array(yearPlanSchema);

export const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const SHORT_MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];
