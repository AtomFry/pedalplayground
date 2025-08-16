#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates the SQLite database and tables for Pedal Playground
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pedalplayground.db');
const sqlPath = path.join(__dirname, '..', 'create_tables.sql');

console.log('🗃️  Setting up Pedal Playground database...');

// Read the SQL schema file
const sql = fs.readFileSync(sqlPath, 'utf8');

// Create or open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Execute the schema
db.exec(sql, (err) => {
    if (err) {
        console.error('❌ Error creating tables:', err.message);
        process.exit(1);
    }
    console.log('✅ Database tables created successfully');
    
    // Verify tables were created
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('❌ Error verifying tables:', err.message);
        } else {
            console.log('📋 Created tables:', tables.map(t => t.name).join(', '));
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('🎉 Database setup complete!');
                console.log('💡 Next steps:');
                console.log('   - Run "npm run db:seed" to populate with data');
                console.log('   - Run "npm run db:query" to open SQLite shell');
            }
        });
    });
});