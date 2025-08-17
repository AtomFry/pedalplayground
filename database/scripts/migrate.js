#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes SQL migration files in sequential order
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'pedalplayground.db');
const migrationsDir = path.join(__dirname, 'migrations');

class MigrationRunner {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize database connection
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to database for migrations');
                    resolve();
                }
            });
        });
    }

    /**
     * Create migrations tracking table if it doesn't exist
     */
    async createMigrationsTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('❌ Error creating migrations table:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Migrations tracking table ready');
                    resolve();
                }
            });
        });
    }

    /**
     * Get list of already executed migrations
     */
    async getExecutedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT version FROM schema_migrations ORDER BY version', (err, rows) => {
                if (err) {
                    console.error('❌ Error fetching executed migrations:', err.message);
                    reject(err);
                } else {
                    const versions = rows.map(row => row.version);
                    resolve(versions);
                }
            });
        });
    }

    /**
     * Get list of available migration files
     */
    getAvailableMigrations() {
        try {
            const files = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
            
            console.log(`📁 Found ${files.length} migration files`);
            return files;
        } catch (error) {
            console.error('❌ Error reading migrations directory:', error.message);
            return [];
        }
    }

    /**
     * Execute a single migration file
     */
    async executeMigration(filename) {
        const migrationPath = path.join(migrationsDir, filename);
        const version = filename.replace('.sql', '');
        
        try {
            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Execute the migration SQL
                    this.db.exec(sql, (err) => {
                        if (err) {
                            console.error(`❌ Error executing migration ${filename}:`, err.message);
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Record the migration as executed
                        this.db.run(
                            'INSERT INTO schema_migrations (version) VALUES (?)',
                            [version],
                            (err) => {
                                if (err) {
                                    console.error(`❌ Error recording migration ${filename}:`, err.message);
                                    this.db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                this.db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error(`❌ Error committing migration ${filename}:`, err.message);
                                        reject(err);
                                    } else {
                                        console.log(`✅ Migration ${filename} executed successfully`);
                                        resolve();
                                    }
                                });
                            }
                        );
                    });
                });
            });
        } catch (error) {
            console.error(`❌ Error reading migration file ${filename}:`, error.message);
            throw error;
        }
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        try {
            await this.connect();
            await this.createMigrationsTable();
            
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            
            const pendingMigrations = availableMigrations.filter(file => {
                const version = file.replace('.sql', '');
                return !executedMigrations.includes(version);
            });
            
            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations to run');
                return;
            }
            
            console.log(`🚀 Running ${pendingMigrations.length} pending migrations...`);
            
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            
            console.log('🎉 All migrations completed successfully!');
            
        } catch (error) {
            console.error('💥 Migration failed:', error.message);
            process.exit(1);
        } finally {
            this.close();
        }
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
     * List migration status
     */
    async status() {
        try {
            await this.connect();
            await this.createMigrationsTable();
            
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            
            console.log('\n📊 Migration Status:');
            console.log('================');
            
            availableMigrations.forEach(file => {
                const version = file.replace('.sql', '');
                const status = executedMigrations.includes(version) ? '✅ Executed' : '⏳ Pending';
                console.log(`${status} - ${file}`);
            });
            
            console.log(`\nTotal: ${availableMigrations.length} migrations, ${executedMigrations.length} executed\n`);
            
        } catch (error) {
            console.error('💥 Error checking migration status:', error.message);
            process.exit(1);
        } finally {
            this.close();
        }
    }
}

// CLI handling
const command = process.argv[2];
const runner = new MigrationRunner();

switch (command) {
    case 'status':
        runner.status();
        break;
    case 'run':
    default:
        runner.runMigrations();
        break;
}