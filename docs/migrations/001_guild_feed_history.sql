-- 길드별 피드 발송 이력 추적 테이블
CREATE TABLE limbus.guild_feed_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guild_id text NOT NULL,
  source text NOT NULL,
  feed_guid text NOT NULL,
  pub_date timestamptz,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(guild_id, source, feed_guid)
);

CREATE INDEX idx_gfh_lookup
  ON limbus.guild_feed_history(guild_id, source, pub_date DESC);

-- 기존 feed_tracker에 last_pub_date 추가
ALTER TABLE limbus.feed_tracker
  ADD COLUMN IF NOT EXISTS last_pub_date timestamptz;
