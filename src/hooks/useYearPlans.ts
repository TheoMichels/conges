import { useCallback, useEffect, useRef, useState } from "react";
import { isLocalMode } from "../config/storageMode";
import { LeaveEntryDraft, YearPlan, validDatesLeaveEntryDraftSchema } from "../types/yearPlan";
import { yearPlanRepository } from "../storage/yearPlanRepository";
import {
  calculatePlanRemaining,
  isValidYearFormat,
  parseYearNumber,
  propagateCarryOverFrom,
  sortPlansChronologically,
} from "../utils/yearPlanUtils";
import { countLuxembourgCompensatoryHolidays } from "../utils/luxembourgHolidays";

function currentYearLabel(): string {
  return String(new Date().getFullYear());
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makePlan(year: string, carriedOver = 0): YearPlan {
  return {
    id: makeId(),
    year,
    createdAt: Date.now(),
    initialLeave: 0,
    carriedOver,
    csupp: 0,
    holidayOverride: null,
    publicHolidays: countLuxembourgCompensatoryHolidays(year),
    entries: [],
  };
}

export function useYearPlans() {
  const [plans, setPlans] = useState<YearPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Mirrors `plans` synchronously (state updates only land on the next
  // render), so every mutation always builds on the latest data even when
  // several edits fire back-to-back before a re-render happens.
  const plansRef = useRef<YearPlan[]>([]);

  const pending = useRef<Promise<void>>(Promise.resolve());
  const commit = useCallback((updater: (prev: YearPlan[]) => YearPlan[], mutation?: () => Promise<void>) => {
    const next = updater(plansRef.current);
    plansRef.current = next;
    setPlans(next);
    const write = isLocalMode ? () => yearPlanRepository.saveAll(next) : mutation;
    if (write) {
      pending.current = pending.current.then(write).catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
      });
    }
    return next;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await yearPlanRepository.list();
      if (loaded.length === 0 && isLocalMode) {
        commit(() => [makePlan(currentYearLabel())]);
      } else {
        const sorted = sortPlansChronologically(loaded);
        plansRef.current = sorted;
        setPlans(sorted);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [commit]);

  useEffect(() => {
    load();
  }, [load]);

  const addYear = useCallback(
    (year: string) => {
      const trimmed = year.trim();
      if (!isValidYearFormat(trimmed)) {
        throw new Error("L'année doit être composée de 4 chiffres valides (ex: 2025).");
      }
      const alreadyExists = plansRef.current.some((p) => p.year === trimmed);
      if (alreadyExists) {
        throw new Error(`L'année ${trimmed} existe déjà.`);
      }

      const yearNum = parseYearNumber(trimmed)!;
      // Pre-fill carriedOver with the remaining balance of (year - 1) if it exists
      const prevPlan = plansRef.current.find(
        (p) => parseYearNumber(p.year) === yearNum - 1
      );
      const initialCarriedOver = prevPlan ? calculatePlanRemaining(prevPlan) : 0;

      const newPlan = makePlan(trimmed, initialCarriedOver);

      commit((prev) => {
        const updated = sortPlansChronologically([...prev, newPlan]);
        return isLocalMode ? propagateCarryOverFrom(updated, yearNum) : updated;
      });

      return newPlan;
    },
    [commit]
  );

  const renameYear = useCallback(
    (id: string, year: string) => {
      const trimmed = year.trim();
      if (!isValidYearFormat(trimmed)) {
        throw new Error("L'année doit être composée de 4 chiffres valides (ex: 2025).");
      }
      const duplicate = plansRef.current.some(
        (p) => p.id !== id && p.year === trimmed
      );
      if (duplicate) {
        throw new Error(`L'année ${trimmed} existe déjà.`);
      }

      const targetPlan = plansRef.current.find((p) => p.id === id);
      if (!targetPlan || targetPlan.year === trimmed) return;

      commit((prev) => {
        const updated = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                year: trimmed,
                publicHolidays: countLuxembourgCompensatoryHolidays(trimmed),
              }
            : p
        );
        const sorted = sortPlansChronologically(updated);
        const newYearNum = parseYearNumber(trimmed);
        if (newYearNum !== null) {
          const prevPlan = sorted.find(
            (p) => parseYearNumber(p.year) === newYearNum - 1
          );
          if (prevPlan) {
            const aligned = sorted.map((p) =>
              p.id === id
                ? { ...p, carriedOver: calculatePlanRemaining(prevPlan) }
                : p
            );
            return propagateCarryOverFrom(aligned, newYearNum);
          }
          return propagateCarryOverFrom(sorted, newYearNum);
        }
        return sorted;
      });
    },
    [commit]
  );

  const removeYear = useCallback(
    (id: string) => {
      commit((prev) => prev.filter((p) => p.id !== id));
    },
    [commit]
  );

  const updatePlan = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<YearPlan, "initialLeave" | "carriedOver" | "csupp">
      >
    ) => {
      const target = plansRef.current.find((p) => p.id === id);
      if (!target) return;

      commit((prev) => {
        const updated = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
        const yearNum = parseYearNumber(target.year);
        if (yearNum !== null) {
          return isLocalMode ? propagateCarryOverFrom(updated, yearNum) : updated;
        }
        return updated;
      });
    },
    [commit]
  );

  const addEntry = useCallback(
    (planId: string, draft: LeaveEntryDraft) => {
      const target = plansRef.current.find((p) => p.id === planId);
      if (!target) return;

      const validated = validDatesLeaveEntryDraftSchema.parse(draft);
      const entry = { ...validated, id: makeId(), createdAt: Date.now() };
      commit((prev) => {
        const updated = prev.map((p) =>
          p.id === planId ? { ...p, entries: [...p.entries, entry] } : p
        );
        const yearNum = parseYearNumber(target.year);
        if (yearNum !== null) {
          return isLocalMode ? propagateCarryOverFrom(updated, yearNum) : updated;
        }
        return updated;
      }, () => yearPlanRepository.saveEntry(planId, entry, "create"));
    },
    [commit]
  );

  const updateEntry = useCallback(
    (planId: string, entryId: string, draft: LeaveEntryDraft) => {
      const target = plansRef.current.find((p) => p.id === planId);
      if (!target) return;
      const existing = target.entries.find(e => e.id === entryId);
      if (!existing) return;
      const validated = validDatesLeaveEntryDraftSchema.parse(draft);
      const entry = { ...validated, id: existing.id, createdAt: existing.createdAt };

      commit((prev) => {
        const updated = prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                entries: p.entries.map((e) =>
                  e.id === entryId ? { ...validated, id: e.id, createdAt: e.createdAt } : e
                ),
              }
            : p
        );
        const yearNum = parseYearNumber(target.year);
        if (yearNum !== null) {
          return isLocalMode ? propagateCarryOverFrom(updated, yearNum) : updated;
        }
        return updated;
      }, () => yearPlanRepository.saveEntry(planId, entry, "update"));
    },
    [commit]
  );

  const removeEntry = useCallback(
    (planId: string, entryId: string) => {
      const target = plansRef.current.find((p) => p.id === planId);
      if (!target) return;

      commit((prev) => {
        const updated = prev.map((p) =>
          p.id === planId
            ? { ...p, entries: p.entries.filter((e) => e.id !== entryId) }
            : p
        );
        const yearNum = parseYearNumber(target.year);
        if (yearNum !== null) {
          return isLocalMode ? propagateCarryOverFrom(updated, yearNum) : updated;
        }
        return updated;
      }, () => yearPlanRepository.deleteEntry(planId, entryId));
    },
    [commit]
  );

  return {
    plans,
    loading,
    error,
    retry: load,
    addYear,
    renameYear,
    removeYear,
    updatePlan,
    addEntry,
    updateEntry,
    removeEntry,
  };
}
