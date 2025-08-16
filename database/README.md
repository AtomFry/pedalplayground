# Pedal Playground Database Setup

This directory contains the SQLite database structure for the Pedal Playground project.

## Files

- `create_tables.sql` - SQL script to create the database schema with tables for pedals and pedalboards
- `pedalplayground.db` - SQLite database file (created after running the setup script)

## Database Schema

The database contains two main tables:

### `pedals` Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing unique identifier
- `brand` (TEXT NOT NULL) - Pedal manufacturer (e.g., "Boss", "Strymon")
- `name` (TEXT NOT NULL) - Pedal model name (e.g., "DD-7", "Timeline")
- `width` (REAL NOT NULL) - Width in inches
- `height` (REAL NOT NULL) - Height in inches
- `image` (TEXT NOT NULL) - Image filename
- `created_at` (DATETIME) - Timestamp when record was created
- `updated_at` (DATETIME) - Timestamp when record was last updated

### `pedalboards` Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing unique identifier
- `brand` (TEXT NOT NULL) - Pedalboard manufacturer (e.g., "Pedaltrain", "Boss")
- `name` (TEXT NOT NULL) - Pedalboard model name (e.g., "Classic JR", "BCB-60")
- `width` (REAL NOT NULL) - Width in inches
- `height` (REAL NOT NULL) - Height in inches
- `image` (TEXT NOT NULL) - Image filename
- `created_at` (DATETIME) - Timestamp when record was created
- `updated_at` (DATETIME) - Timestamp when record was last updated

## Setup Instructions

### Automated Setup (Recommended)

```bash
# Quick setup - run from project root
./setup-dev.sh
```

This will:
- Install Node.js dependencies (including sqlite3)
- Create the database and tables
- Import existing JSON data
- Set up the complete development environment

### Manual Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up database**:
   ```bash
   npm run db:setup
   ```

3. **Import existing data**:
   ```bash
   npm run db:seed
   ```

4. **Verify setup**:
   ```bash
   npm run db:query ".tables"
   ```

## Features

- **Constraints**: All tables include data validation constraints
- **Indexes**: Optimized indexes for common queries on brand, name, and dimensions
- **Triggers**: Automatic timestamp updates on record modifications
- **Views**: Pre-built views for common queries with calculated area (width × height)
- **Unique Constraints**: Prevents duplicate entries for the same brand/name combination

## Future Migration

This database structure is designed to eventually replace the current JSON files:
- `public/data/pedals.json` → `pedals` table
- `public/data/pedalboards.json` → `pedalboards` table

The schema maintains full compatibility with the existing JSON structure while adding benefits like:
- Better query performance
- Data validation
- Relational integrity
- Scalability for future features