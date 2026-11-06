-- Taux annuel ; les plans existants restent à temps plein.
ALTER TABLE holy.year_plans
  ADD COLUMN work_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100,
  ADD CONSTRAINT year_plans_work_percentage_bounds
    CHECK (work_percentage > 0 AND work_percentage <= 100),
  ALTER COLUMN carried_over TYPE NUMERIC(6, 2);
-- Le report doit conserver les centièmes issus du prorata, sans réduire sa plage.
