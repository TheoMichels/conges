export type HalfDay = "morning" | "afternoon";

export type LeaveEntryDraft =
  | {
      kind: "dates";
      label: string;
      startDate: string;
      endDate: string;
      startHalf?: HalfDay;
      endHalf?: HalfDay;
    }
  | { kind: "month"; label: string; month: number; days: number };

export type LeaveEntry = LeaveEntryDraft & {
  id: string;
  createdAt: number;
};

export type YearPlan = {
  id: string;
  year: string;
  createdAt: number;
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  entries: LeaveEntry[];
};

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
