CREATE TABLE IF NOT EXISTS services (
  url TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'up',
  last_state_change TEXT,
  last_notification_sent TEXT,
  latency INTEGER,
  status_code INTEGER,
  error_message TEXT,
  last_check TEXT
);

CREATE TABLE IF NOT EXISTS latency_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  latency INTEGER,
  status TEXT NOT NULL,
  FOREIGN KEY (url) REFERENCES services(url)
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'down',
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  duration_minutes INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS daily_uptime (
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  checks INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (url, date),
  FOREIGN KEY (url) REFERENCES services(url)
);

CREATE INDEX IF NOT EXISTS idx_latency_checks_timestamp ON latency_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_latency_checks_url ON latency_checks(url);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON incidents(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_uptime_date ON daily_uptime(date);
