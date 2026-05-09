CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
  total_tickets          bigint,
  open_tickets           bigint,
  ai_resolved            bigint,
  total_resolved         bigint,
  avg_resolution_seconds double precision,
  tickets_per_day        json
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM ticket),

    (SELECT COUNT(*) FROM ticket
     WHERE status IN ('new', 'processing', 'open')),

    (SELECT COUNT(*) FROM ticket t
     WHERE t.status = 'resolved'
       AND EXISTS (
         SELECT 1 FROM reply r
         WHERE  r."ticketId"   = t.id
           AND  r."senderType" = 'agent'
           AND  r."userId"     IS NULL
       )
    ),

    (SELECT COUNT(*) FROM ticket
     WHERE status IN ('resolved', 'closed')),

    (SELECT EXTRACT(EPOCH FROM AVG("updatedAt" - "createdAt"))
     FROM ticket
     WHERE status IN ('resolved', 'closed')),

    (SELECT COALESCE(
       json_agg(
         json_build_object('date', d.date, 'count', d.count)
         ORDER BY d.date
       ),
       '[]'::json
     )
     FROM (
       SELECT
         gs.day::date::text          AS date,
         COUNT(t.id)::int            AS count
       FROM generate_series(
         CURRENT_DATE - INTERVAL '29 days',
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS gs(day)
       LEFT JOIN ticket t ON t."createdAt"::date = gs.day::date
       GROUP BY gs.day
     ) d
    )
$$;
