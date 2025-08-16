#!/usr/bin/env node

/**
 * Interactive Database Query Tool
 * A Node.js alternative to sqlite3 CLI for cross-platform compatibility
 */

const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pedalplayground.db');

console.log('🗃️  Pedal Playground Database Query Tool');
console.log('=======================================');

// Check if database exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found. Run "npm run db:setup" first.');
    process.exit(1);
}

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database');
    console.log('💡 Type SQL commands or use these shortcuts:');
    console.log('   .tables    - List all tables');
    console.log('   .schema    - Show table schemas');
    console.log('   .help      - Show this help');
    console.log('   .quit      - Exit');
    console.log('');
    
    startRepl();
});

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sqlite> '
});

function startRepl() {
    rl.prompt();
    
    rl.on('line', (input) => {
        const query = input.trim();
        
        if (!query) {
            rl.prompt();
            return;
        }
        
        // Handle special commands
        switch (query.toLowerCase()) {
            case '.quit':
            case '.exit':
                console.log('👋 Goodbye!');
                db.close();
                process.exit(0);
                break;
                
            case '.tables':
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                    if (err) {
                        console.error('❌ Error:', err.message);
                    } else {
                        console.log('📋 Tables:');
                        rows.forEach(row => console.log(`  ${row.name}`));
                    }
                    rl.prompt();
                });
                return;
                
            case '.schema':
                db.all("SELECT sql FROM sqlite_master WHERE type='table'", (err, rows) => {
                    if (err) {
                        console.error('❌ Error:', err.message);
                    } else {
                        console.log('📝 Table Schemas:');
                        rows.forEach(row => {
                            if (row.sql) {
                                console.log(`\n${row.sql};\n`);
                            }
                        });
                    }
                    rl.prompt();
                });
                return;
                
            case '.help':
                console.log('💡 Available commands:');
                console.log('   .tables    - List all tables');
                console.log('   .schema    - Show table schemas');
                console.log('   .help      - Show this help');
                console.log('   .quit      - Exit');
                console.log('');
                console.log('📝 Example SQL queries:');
                console.log('   SELECT COUNT(*) FROM pedals;');
                console.log('   SELECT DISTINCT brand FROM pedals LIMIT 10;');
                console.log('   SELECT * FROM pedal_summary WHERE brand = "Boss";');
                rl.prompt();
                return;
        }
        
        // Execute SQL query
        if (query.toLowerCase().startsWith('select') || query.toLowerCase().startsWith('with')) {
            // SELECT queries
            db.all(query, (err, rows) => {
                if (err) {
                    console.error('❌ Error:', err.message);
                } else {
                    if (rows.length === 0) {
                        console.log('📭 No results found');
                    } else {
                        console.table(rows);
                        console.log(`📊 ${rows.length} row(s) returned`);
                    }
                }
                rl.prompt();
            });
        } else {
            // Other queries (INSERT, UPDATE, DELETE, etc.)
            db.run(query, function(err) {
                if (err) {
                    console.error('❌ Error:', err.message);
                } else {
                    if (this.changes !== undefined) {
                        console.log(`✅ Query executed successfully. ${this.changes} row(s) affected.`);
                    } else {
                        console.log('✅ Query executed successfully.');
                    }
                }
                rl.prompt();
            });
        }
    });
    
    rl.on('close', () => {
        console.log('\n👋 Goodbye!');
        db.close();
        process.exit(0);
    });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    db.close();
    process.exit(0);
});