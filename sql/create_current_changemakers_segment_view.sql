CREATE OR REPLACE VIEW segments AS WITH attendance AS (
    SELECT CAST(h.date AS DATE) AS date,
      NULL AS airtable_id,
      l.email
    FROM hoa_events h
      JOIN luma_attendance l ON l.event_id = h.id
      AND l.did_join_event is true
  ),
  merged_members AS (
    SELECT c.airtable_id,
      SUM(
        CASE
          WHEN a.date >= NOW() - INTERVAL '60 DAY' THEN 1
          ELSE 0
        END
      ) AS hoas_in_past_two_months,
      SUM(
        CASE
          WHEN a.date >= NOW() - INTERVAL '30 DAY' THEN 1
          ELSE 0
        END
      ) AS hoas_in_past_one_month
    FROM contacts c
      LEFT JOIN attendance a ON a.email = c.email
      OR a.airtable_id = c.airtable_id
    GROUP BY 1
  )
SELECT airtable_id,
  CASE
    WHEN hoas_in_past_two_months = 0 THEN 0
    WHEN hoas_in_past_two_months > 0
    AND hoas_in_past_one_month = 0 THEN 1
    WHEN hoas_in_past_one_month = 1 THEN 2
    WHEN hoas_in_past_one_month = 2 THEN 3
    WHEN hoas_in_past_one_month >= 3 THEN 4
    ELSE -1 -- unknown, shouldn't have any members with this value
  END AS segment
FROM merged_members;
