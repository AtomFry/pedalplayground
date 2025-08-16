#!/usr/bin/env node

/**
 * JSON Export Script
 * Exports SQLite database content back to JSON files for production use
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pedalplayground.db');
const pedalsJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'pedals.json');
const pedalboardsJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'pedalboards.json');

console.log('📤 Exporting database to JSON files...');

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database not found. Run "npm run db:setup" and "npm run db:seed" first.');
    process.exit(1);
}

// Open database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// Export pedals
db.all(`
    SELECT brand as Brand, name as Name, width as Width, height as Height, image as Image 
    FROM pedals 
    ORDER BY brand, name
`, (err, pedals) => {
    if (err) {
        console.error('❌ Error querying pedals:', err.message);
        return;
    }
    
    try {
        // Create backup of current file
        if (fs.existsSync(pedalsJsonPath)) {
            const backupPath = pedalsJsonPath + '.backup.' + Date.now();
            fs.copyFileSync(pedalsJsonPath, backupPath);
            console.log(`💾 Backed up existing pedals.json to ${path.basename(backupPath)}`);
        }
        
        // Write new JSON file
        fs.writeFileSync(pedalsJsonPath, JSON.stringify(pedals, null, '\t'));
        console.log(`✅ Exported ${pedals.length} pedals to pedals.json`);
    } catch (writeErr) {
        console.error('❌ Error writing pedals.json:', writeErr.message);
    }
    
    // Export pedalboards
    db.all(`
        SELECT brand as Brand, name as Name, width as Width, height as Height, image as Image 
        FROM pedalboards 
        ORDER BY brand, name
    `, (err, pedalboards) => {
        if (err) {
            console.error('❌ Error querying pedalboards:', err.message);
            return;
        }
        
        try {
            // Create backup of current file
            if (fs.existsSync(pedalboardsJsonPath)) {
                const backupPath = pedalboardsJsonPath + '.backup.' + Date.now();
                fs.copyFileSync(pedalboardsJsonPath, backupPath);
                console.log(`💾 Backed up existing pedalboards.json to ${path.basename(backupPath)}`);
            }
            
            // Write new JSON file
            fs.writeFileSync(pedalboardsJsonPath, JSON.stringify(pedalboards, null, '\t'));
            console.log(`✅ Exported ${pedalboards.length} pedalboards to pedalboards.json`);
        } catch (writeErr) {
            console.error('❌ Error writing pedalboards.json:', writeErr.message);
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('🎉 JSON export complete!');
                console.log('💡 The website will now use the updated JSON files');
            }
        });
    });
});