/**
 * Pedals API Routes
 * REST endpoints for pedal data retrieval
 */

const express = require('express');
const { asyncHandler, createValidationError } = require('../middleware/error');
const db = require('../database/connection');

const router = express.Router();

/**
 * GET /api/pedals
 * Get all pedals with optional filtering and pagination
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 1000)
 * - brand: Filter by brand name (partial match)
 * - search: Search in brand and name (partial match)
 * - minWidth: Minimum width filter
 * - maxWidth: Maximum width filter
 * - minHeight: Minimum height filter
 * - maxHeight: Maximum height filter
 * - sort: Sort field (brand, name, width, height) (default: brand)
 * - order: Sort order (asc, desc) (default: asc)
 */
router.get('/', asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        brand,
        search,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        sort = 'brand',
        order = 'asc'
    } = req.query;

    // Validate sort field
    const validSortFields = ['brand', 'name', 'width', 'height', 'created_at'];
    if (!validSortFields.includes(sort)) {
        throw createValidationError(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }

    // Validate sort order
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(order.toLowerCase())) {
        throw createValidationError('Invalid sort order. Must be "asc" or "desc"');
    }

    // Build filter conditions
    const filters = { brand, search, minWidth, maxWidth, minHeight, maxHeight };
    const { whereClause, params } = db.buildWhereClause(filters);
    
    // Build pagination
    const { limitClause, pagination } = db.buildPaginationClause(page, limit);
    
    // Build ORDER BY clause
    const orderClause = `ORDER BY ${sort} ${order.toUpperCase()}, name ASC`;

    // Get total count (for pagination metadata)
    const countSql = `SELECT COUNT(*) as total FROM pedals ${whereClause}`;
    const countResult = await db.get(countSql, params);
    const total = countResult.total;

    // Get pedals data
    const pedalsSql = `
        SELECT 
            id,
            brand,
            name,
            width,
            height,
            image,
            created_at,
            updated_at
        FROM pedals 
        ${whereClause}
        ${orderClause}
        ${limitClause}
    `;
    
    const pedals = await db.all(pedalsSql, params);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pagination.limit);
    const hasNextPage = pagination.page < totalPages;
    const hasPrevPage = pagination.page > 1;

    res.json({
        success: true,
        data: pedals,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage
        },
        filters: {
            ...filters,
            sort,
            order
        }
    });
}));

/**
 * GET /api/pedals/brands
 * Get list of all unique pedal brands
 */
router.get('/brands', asyncHandler(async (req, res) => {
    const sql = `
        SELECT 
            brand,
            COUNT(*) as count
        FROM pedals 
        GROUP BY brand 
        ORDER BY brand ASC
    `;
    
    const brands = await db.all(sql);

    res.json({
        success: true,
        data: brands
    });
}));

/**
 * GET /api/pedals/stats
 * Get pedal statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const queries = [
        db.get('SELECT COUNT(*) as total FROM pedals'),
        db.get('SELECT COUNT(DISTINCT brand) as brands FROM pedals'),
        db.get('SELECT MIN(width) as minWidth, MAX(width) as maxWidth FROM pedals'),
        db.get('SELECT MIN(height) as minHeight, MAX(height) as maxHeight FROM pedals'),
        db.get('SELECT AVG(width) as avgWidth, AVG(height) as avgHeight FROM pedals')
    ];

    const [total, brands, widthStats, heightStats, avgStats] = await Promise.all(queries);

    res.json({
        success: true,
        data: {
            totalPedals: total.total,
            totalBrands: brands.brands,
            dimensions: {
                width: {
                    min: widthStats.minWidth,
                    max: widthStats.maxWidth,
                    avg: Math.round(avgStats.avgWidth * 100) / 100
                },
                height: {
                    min: heightStats.minHeight,
                    max: heightStats.maxHeight,
                    avg: Math.round(avgStats.avgHeight * 100) / 100
                }
            }
        }
    });
}));

/**
 * GET /api/pedals/:id
 * Get a specific pedal by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ID
    const pedalId = parseInt(id);
    if (isNaN(pedalId) || pedalId <= 0) {
        throw createValidationError('Invalid pedal ID. Must be a positive integer');
    }

    const sql = `
        SELECT 
            id,
            brand,
            name,
            width,
            height,
            image,
            created_at,
            updated_at
        FROM pedals 
        WHERE id = ?
    `;
    
    const pedal = await db.get(sql, [pedalId]);

    if (!pedal) {
        return res.status(404).json({
            success: false,
            error: {
                message: 'Pedal not found',
                status: 404
            }
        });
    }

    res.json({
        success: true,
        data: pedal
    });
}));

module.exports = router;