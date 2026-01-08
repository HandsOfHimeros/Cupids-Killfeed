-- Add session tracking for distance rewards
CREATE TABLE IF NOT EXISTS player_sessions (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    connected_at BIGINT NOT NULL,
    start_x FLOAT,
    start_y FLOAT,
    start_z FLOAT,
    last_x FLOAT,
    last_y FLOAT,
    last_z FLOAT,
    total_distance FLOAT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(guild_id, player_name)
);

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_active_sessions ON player_sessions(guild_id, is_active);
