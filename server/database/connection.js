/**
 * SQLite Database Connection Manager
 * Provides connection and query utilities for the Pedal Playground API
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'database', 'pedalplayground.db');

class DatabaseConnection {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize database connection
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    /**
     * Execute a SELECT query and return all results
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Database query error:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Execute a SELECT query and return first result
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Database query error:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('📪 Database connection closed');
                }
            });
        }
    }

    /**
     * Build WHERE clause for filtering
     */
    buildWhereClause(filters) {
        const conditions = [];
        const params = [];

        if (filters.brand) {
            conditions.push('LOWER(brand) LIKE LOWER(?)');
            params.push(`%${filters.brand}%`);
        }

        if (filters.search) {
            conditions.push('(LOWER(brand) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?))');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.minWidth) {
            conditions.push('width >= ?');
            params.push(parseFloat(filters.minWidth));
        }

        if (filters.maxWidth) {
            conditions.push('width <= ?');
            params.push(parseFloat(filters.maxWidth));
        }

        if (filters.minHeight) {
            conditions.push('height >= ?');
            params.push(parseFloat(filters.minHeight));
        }

        if (filters.maxHeight) {
            conditions.push('height <= ?');
            params.push(parseFloat(filters.maxHeight));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { whereClause, params };
    }

    /**
     * Build LIMIT/OFFSET clause for pagination
     */
    buildPaginationClause(page = 1, limit = 50) {
        const parsedPage = Math.max(1, parseInt(page) || 1);
        const parsedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 50)); // Max 1000 items per page
        const offset = (parsedPage - 1) * parsedLimit;
        
        return {
            limitClause: `LIMIT ${parsedLimit} OFFSET ${offset}`,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                offset
            }
        };
    }
}

// Export singleton instance
module.exports = new DatabaseConnection();