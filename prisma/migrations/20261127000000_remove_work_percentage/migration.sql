-- Preserve the exact entitlement computed by the previous application before dropping the rate.
ALTER TABLE holy.year_plans ADD COLUMN IF NOT EXISTS holiday_override numeric(5,2);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'holy' AND table_name = 'year_plans' AND column_name = 'work_percentage') THEN
    IF EXISTS (SELECT 1 FROM holy.year_plans WHERE year !~ '^[0-9]{4}$' OR year::integer < 1900 OR year::integer > 2100) THEN
      RAISE EXCEPTION 'F02: année hors plage 1900–2100, reprise manuelle nécessaire';
    END IF;
    WITH years AS (
      SELECT id, year::integer AS y, work_percentage AS rate FROM holy.year_plans
    ), calc AS (
      SELECT *, y % 19 AS a, y / 100 AS b, y % 100 AS c FROM years
    ), calc2 AS (
      SELECT *, (19*a+b-b/4-((b-((b+8)/25)+1)/3)+15)%30 AS h FROM calc
    ), calc3 AS (
      SELECT *, (32+2*(b%4)+2*(c/4)-h-(c%4))%7 AS l FROM calc2
    ), calc4 AS (
      SELECT *, (a+11*h+22*l)/451 AS m FROM calc3
    ), dates AS (
      SELECT *, make_date(y, (h+l-7*m+114)/31, (h+l-7*m+114)%31+1) AS easter FROM calc4
    ), counts AS (
      SELECT d.id, d.rate,
        (SELECT count(*) FROM (VALUES (make_date(d.y,1,1)), (make_date(d.y,5,1)),
          (make_date(d.y,6,23)), (make_date(d.y,8,15)), (make_date(d.y,11,1)),
          (make_date(d.y,12,25)), (make_date(d.y,12,26))) AS fixed(day)
         WHERE extract(dow FROM fixed.day) IN (0,6))
        + CASE WHEN d.y >= 2019 AND extract(dow FROM make_date(d.y,5,9)) IN (0,6) THEN 1 ELSE 0 END
        + CASE WHEN d.easter + 39 = make_date(d.y,5,1) THEN 1 ELSE 0 END
        + CASE WHEN d.y >= 2019 AND d.easter + 39 = make_date(d.y,5,9) THEN 1 ELSE 0 END AS total
      FROM dates d
    )
    UPDATE holy.year_plans p SET holiday_override = (floor((c.total::double precision * c.rate::double precision / 100) * 100 + 0.5) / 100)::numeric
    FROM counts c WHERE p.id = c.id AND (floor((c.total::double precision * c.rate::double precision / 100) * 100 + 0.5) / 100)::numeric <> c.total;
    ALTER TABLE holy.year_plans DROP COLUMN work_percentage;
  END IF;
END $$;
