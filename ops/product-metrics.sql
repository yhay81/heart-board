WITH
event_counts AS (
  SELECT
    COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
    COUNT(DISTINCT CASE WHEN name = 'openchat_opened' THEN session_id END)
      AS outbound_users,
    COUNT(DISTINCT CASE WHEN name = 'openchat_opened' THEN context END)
      AS cards_with_outbound,
    COUNT(DISTINCT CASE WHEN name = 'join_confirmed' THEN session_id END)
      AS confirmed_users,
    COUNT(DISTINCT CASE WHEN name = 'join_confirmed' THEN context END)
      AS cards_with_confirmation,
    COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END)
      AS returned_organizers,
    COUNT(DISTINCT CASE
      WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS users_7d,
    COUNT(DISTINCT CASE
      WHEN name = 'openchat_opened' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS outbound_users_7d,
    COUNT(DISTINCT CASE
      WHEN name = 'join_confirmed' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS confirmed_users_7d
  FROM product_events
),
listing_counts AS (
  SELECT
    COUNT(*) AS listings_created,
    COUNT(CASE WHEN status = 'active' AND expires_at > unixepoch() THEN 1 END)
      AS active_listings,
    COUNT(CASE WHEN status = 'hidden' THEN 1 END) AS hidden_listings,
    COUNT(DISTINCT creator_session_id) AS organizers,
    COUNT(CASE WHEN created_at >= unixepoch() - (7 * 86400) THEN 1 END)
      AS listings_7d,
    COUNT(DISTINCT CASE
      WHEN created_at >= unixepoch() - (7 * 86400) THEN creator_session_id
    END) AS organizers_7d
  FROM listings
),
organizer_outcomes AS (
  SELECT
    COUNT(DISTINCT CASE WHEN opened.context IS NOT NULL THEN listings.creator_session_id END)
      AS organizers_with_outbound,
    COUNT(DISTINCT CASE WHEN confirmed.context IS NOT NULL THEN listings.creator_session_id END)
      AS organizers_with_confirmation
  FROM listings
  LEFT JOIN (
    SELECT DISTINCT context FROM product_events WHERE name = 'openchat_opened'
  ) AS opened ON opened.context = listings.id
  LEFT JOIN (
    SELECT DISTINCT context FROM product_events WHERE name = 'join_confirmed'
  ) AS confirmed ON confirmed.context = listings.id
),
report_counts AS (
  SELECT COUNT(*) AS reports FROM reports
)
SELECT
  event_counts.*,
  listing_counts.*,
  organizer_outcomes.*,
  report_counts.reports
FROM event_counts, listing_counts, organizer_outcomes, report_counts;
