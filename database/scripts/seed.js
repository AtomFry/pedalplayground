#!/usr/bin/env node

/**
 * Database Seeding Script
 * Imports data from existing JSON files into SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pedalplayground.db');
const pedalsJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'pedals.json');
const pedalboardsJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'pedalboards.json');

console.log('🌱 Seeding Pedal Playground database...');

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found. Run "npm run db:setup" first.');
    process.exit(1);
}

// Read JSON data
let pedalsData, pedalboardsData;

try {
    pedalsData = JSON.parse(fs.readFileSync(pedalsJsonPath, 'utf8'));
    pedalboardsData = JSON.parse(fs.readFileSync(pedalboardsJsonPath, 'utf8'));
    console.log(`📖 Read ${pedalsData.length} pedals and ${pedalboardsData.length} pedalboards from JSON`);
} catch (err) {
    console.error('❌ Error reading JSON files:', err.message);
    process.exit(1);
}

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// Begin transaction for better performance
db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    db.run("DELETE FROM pedals");
    db.run("DELETE FROM pedalboards");
    
    // Prepare statements with IGNORE to handle duplicates
    const insertPedal = db.prepare(`
        INSERT OR IGNORE INTO pedals (brand, name, width, height, image) 
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertPedalboard = db.prepare(`
        INSERT OR IGNORE INTO pedalboards (brand, name, width, height, image) 
        VALUES (?, ?, ?, ?, ?)
    `);
    
    // Insert pedals
    console.log('🎸 Inserting pedals...');
    let pedalCount = 0;
    pedalsData.forEach((pedal) => {
        insertPedal.run([
            pedal.Brand,
            pedal.Name,
            pedal.Width,
            pedal.Height,
            pedal.Image
        ], function(err) {
            if (err) {
                console.error(`❌ Error inserting pedal ${pedal.Brand} ${pedal.Name}:`, err.message);
            } else {
                pedalCount++;
            }
        });
    });
    
    // Insert pedalboards
    console.log('📋 Inserting pedalboards...');
    let pedalboardCount = 0;
    pedalboardsData.forEach((board) => {
        insertPedalboard.run([
            board.Brand,
            board.Name,
            board.Width,
            board.Height,
            board.Image
        ], function(err) {
            if (err) {
                console.error(`❌ Error inserting pedalboard ${board.Brand} ${board.Name}:`, err.message);
            } else {
                pedalboardCount++;
            }
        });
    });
    
    // Finalize statements and commit
    insertPedal.finalize();
    insertPedalboard.finalize();
    
    db.run("COMMIT", (err) => {
        if (err) {
            console.error('❌ Error committing transaction:', err.message);
        } else {
            console.log(`✅ Successfully imported ${pedalCount} pedals and ${pedalboardCount} pedalboards`);
            
            // Verify data
            db.get("SELECT COUNT(*) as count FROM pedals", (err, row) => {
                if (!err) console.log(`📊 Pedals in database: ${row.count}`);
            });
            
            db.get("SELECT COUNT(*) as count FROM pedalboards", (err, row) => {
                if (!err) console.log(`📊 Pedalboards in database: ${row.count}`);
            });
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('🎉 Database seeding complete!');
                console.log('💡 You can now:');
                console.log('   - Query the database: npm run db:query');
                console.log('   - Export to JSON: npm run db:export');
            }
        });
    });
});