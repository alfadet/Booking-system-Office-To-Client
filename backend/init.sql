-- Schema database Alfa Security - Preventivi

CREATE TABLE IF NOT EXISTS quotes (
  id           VARCHAR(100) PRIMARY KEY,
  timestamp    TIMESTAMPTZ NOT NULL,
  service      JSONB NOT NULL DEFAULT '{}',
  client       JSONB NOT NULL DEFAULT '{}',
  payment      VARCHAR(100) NOT NULL,
  calculations JSONB NOT NULL DEFAULT '{}',
  total        NUMERIC(10,2),
  discount     NUMERIC(5,2) DEFAULT 0
);
