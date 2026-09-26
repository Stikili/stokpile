-- Receipt numbers: STK-MMYY-NNNN, where NNNN is a per-group sequence.
--
-- A contribution gets the group's next number the first time it is marked
-- paid, whichever code path does it (app, Flutterwave webhook, bulk mark,
-- SMS). The number never changes or gets reused, so a member can quote it.
--
-- Safe to re-run: additive only (IF NOT EXISTS / OR REPLACE), no drops of
-- data, and the backfill only touches rows that have no number yet.

ALTER TABLE groups        ADD COLUMN IF NOT EXISTS receipt_seq integer NOT NULL DEFAULT 0;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS receipt_no  integer;

CREATE UNIQUE INDEX IF NOT EXISTS contributions_group_receipt_no
  ON contributions (group_id, receipt_no)
  WHERE receipt_no IS NOT NULL;

-- Atomically take the next number for a group. The UPDATE row-locks the
-- group, so two payments recorded at the same moment can't share a number.
CREATE OR REPLACE FUNCTION next_receipt_no(p_group_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE groups
     SET receipt_seq = receipt_seq + 1
   WHERE id = p_group_id
  RETURNING receipt_seq;
$$;

CREATE OR REPLACE FUNCTION assign_receipt_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paid IS TRUE AND NEW.receipt_no IS NULL THEN
    NEW.receipt_no := next_receipt_no(NEW.group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributions_assign_receipt_no ON contributions;
CREATE TRIGGER contributions_assign_receipt_no
  BEFORE INSERT OR UPDATE OF paid ON contributions
  FOR EACH ROW EXECUTE FUNCTION assign_receipt_no();

-- Backfill: number existing paid contributions per group in the order they
-- happened, then move each group's counter past its highest number.
WITH numbered AS (
  SELECT c.id,
         COALESCE(g.receipt_seq, 0)
           + row_number() OVER (PARTITION BY c.group_id ORDER BY c.date, c.created_at, c.id) AS n
    FROM contributions c
    JOIN groups g ON g.id = c.group_id
   WHERE c.paid IS TRUE AND c.receipt_no IS NULL
)
UPDATE contributions c
   SET receipt_no = numbered.n
  FROM numbered
 WHERE c.id = numbered.id;

UPDATE groups g
   SET receipt_seq = GREATEST(g.receipt_seq, sub.max_no)
  FROM (SELECT group_id, MAX(receipt_no) AS max_no FROM contributions GROUP BY group_id) sub
 WHERE sub.group_id = g.id AND sub.max_no IS NOT NULL;
