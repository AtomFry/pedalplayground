-- ==========================================
-- Pedal Playground Database Schema
-- ==========================================
-- This script creates the SQLite database tables for pedals and pedalboards
-- based on the existing JSON data structure from the Pedal Playground project

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ==========================================
-- PEDALS Table
-- ==========================================
-- Stores information about guitar effect pedals
CREATE TABLE IF NOT EXISTS pedals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    width REAL NOT NULL,           -- Width in inches
    height REAL NOT NULL,          -- Height in inches  
    image TEXT NOT NULL,           -- Image filename
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pedals_width_positive CHECK (width > 0),
    CONSTRAINT pedals_height_positive CHECK (height > 0),
    CONSTRAINT pedals_brand_not_empty CHECK (LENGTH(TRIM(brand)) > 0),
    CONSTRAINT pedals_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT pedals_image_not_empty CHECK (LENGTH(TRIM(image)) > 0),
    
    -- Unique constraint on brand + name combination
    UNIQUE(brand, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pedals_brand ON pedals(brand);
CREATE INDEX IF NOT EXISTS idx_pedals_name ON pedals(name);
CREATE INDEX IF NOT EXISTS idx_pedals_dimensions ON pedals(width, height);

-- ==========================================
-- PEDALBOARDS Table  
-- ==========================================
-- Stores information about guitar pedalboards
CREATE TABLE IF NOT EXISTS pedalboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    width REAL NOT NULL,           -- Width in inches
    height REAL NOT NULL,          -- Height in inches
    image TEXT NOT NULL,           -- Image filename
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pedalboards_width_positive CHECK (width > 0),
    CONSTRAINT pedalboards_height_positive CHECK (height > 0),
    CONSTRAINT pedalboards_brand_not_empty CHECK (LENGTH(TRIM(brand)) > 0),
    CONSTRAINT pedalboards_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT pedalboards_image_not_empty CHECK (LENGTH(TRIM(image)) > 0),
    
    -- Unique constraint on brand + name combination
    UNIQUE(brand, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pedalboards_brand ON pedalboards(brand);
CREATE INDEX IF NOT EXISTS idx_pedalboards_name ON pedalboards(name);
CREATE INDEX IF NOT EXISTS idx_pedalboards_dimensions ON pedalboards(width, height);

-- ==========================================
-- Triggers for automatic timestamp updates
-- ==========================================

-- Update timestamp trigger for pedals table
CREATE TRIGGER IF NOT EXISTS update_pedals_timestamp 
    AFTER UPDATE ON pedals
    FOR EACH ROW
BEGIN
    UPDATE pedals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for pedalboards table
CREATE TRIGGER IF NOT EXISTS update_pedalboards_timestamp 
    AFTER UPDATE ON pedalboards
    FOR EACH ROW
BEGIN
    UPDATE pedalboards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ==========================================
-- Views for common queries
-- ==========================================

-- View to get pedal summary information
CREATE VIEW IF NOT EXISTS pedal_summary AS
SELECT 
    id,
    brand,
    name,
    width,
    height,
    width * height as area,
    image
FROM pedals
ORDER BY brand, name;

-- View to get pedalboard summary information
CREATE VIEW IF NOT EXISTS pedalboard_summary AS
SELECT 
    id,
    brand,
    name,
    width,
    height,
    width * height as area,
    image
FROM pedalboards
ORDER BY brand, name;

-- ==========================================
-- Initial data validation queries (for testing)
-- ==========================================

-- These can be uncommented for validation after data import:
-- SELECT COUNT(*) as total_pedals FROM pedals;
-- SELECT COUNT(*) as total_pedalboards FROM pedalboards;
-- SELECT COUNT(DISTINCT brand) as unique_pedal_brands FROM pedals;
-- SELECT COUNT(DISTINCT brand) as unique_pedalboard_brands FROM pedalboards;