-- Migration 001: Create User Management Tables
-- Created: 2025-08-17
-- Description: Initial user authentication and data management tables

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- User sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- User pedal favorites table
CREATE TABLE IF NOT EXISTS user_pedal_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pedal_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, pedal_id)
);

-- Indexes for user_pedal_favorites table
CREATE INDEX IF NOT EXISTS idx_user_pedal_favorites_user ON user_pedal_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pedal_favorites_pedal ON user_pedal_favorites(pedal_id);

-- User pedalboard favorites table
CREATE TABLE IF NOT EXISTS user_pedalboard_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pedalboard_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, pedalboard_id)
);

-- Indexes for user_pedalboard_favorites table
CREATE INDEX IF NOT EXISTS idx_user_pedalboard_favorites_user ON user_pedalboard_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pedalboard_favorites_board ON user_pedalboard_favorites(pedalboard_id);

-- Saved layouts table
CREATE TABLE IF NOT EXISTS saved_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    layout_data TEXT NOT NULL, -- JSON string of pedalboard configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for saved_layouts table
CREATE INDEX IF NOT EXISTS idx_saved_layouts_user ON saved_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_layouts_updated ON saved_layouts(updated_at);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for password_reset_tokens table
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);