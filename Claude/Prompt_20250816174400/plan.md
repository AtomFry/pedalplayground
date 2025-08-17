# Plan: Backend REST APIs for Pedals and Pedalboards

## Understanding of Requirements
- Create REST APIs to serve pedal and pedalboard data from SQLite database
- Integrate API server to run alongside the existing static site development server
- Do NOT modify existing frontend JavaScript logic that reads JSON files yet
- APIs should run when `npm start` is executed
- Maintain current browser-sync development workflow

## Current Architecture Analysis
- **Frontend**: Static site using browser-sync (port 3000)
- **Data Loading**: JavaScript functions `GetPedalData()` and `GetPedalBoardData()` fetch from JSON files
- **Build System**: Gulp + npm-run-all for parallel tasks
- **Database**: SQLite with 7500+ pedals and 243+ pedalboards

## Proposed Technical Approach

### 1. **Backend Framework Selection**
- **Express.js** - Lightweight, familiar, integrates well with existing Node.js setup
- **Port 3001** - Run API server on separate port to avoid conflicts

### 2. **API Endpoints Design**
```
GET /api/pedals              - Get all pedals (with pagination)
GET /api/pedals?brand=Boss   - Filter by brand
GET /api/pedals?search=fuzz  - Search by name
GET /api/pedals/:id          - Get specific pedal

GET /api/pedalboards         - Get all pedalboards (with pagination)
GET /api/pedalboards?brand=Pedaltrain - Filter by brand
GET /api/pedalboards/:id     - Get specific pedalboard

GET /api/health              - Health check endpoint
```

### 3. **Integration Strategy**
- Add Express.js to dependencies
- Create `server/` directory with API code
- Update `npm start` to run both browser-sync AND Express server
- Use `concurrently` or extend `npm-run-all` configuration

### 4. **File Structure**
```
server/
├── app.js              - Express app setup
├── routes/
│   ├── pedals.js       - Pedal endpoints
│   └── pedalboards.js  - Pedalboard endpoints
├── middleware/
│   ├── cors.js         - CORS configuration
│   └── error.js        - Error handling
└── database/
    └── connection.js   - SQLite connection management
```

## Implementation Steps

### Phase 1: Server Setup
1. Add Express.js dependencies to package.json
2. Create basic Express server structure
3. Set up SQLite database connection
4. Create health check endpoint
5. Configure CORS for cross-origin requests

### Phase 2: API Development
1. Implement pedals endpoints with filtering/pagination
2. Implement pedalboards endpoints with filtering/pagination
3. Add input validation and error handling
4. Create response formatting utilities

### Phase 3: Development Integration
1. Update npm scripts to run API server alongside browser-sync
2. Test APIs independently
3. Verify both servers run concurrently on `npm start`
4. Add API documentation

### Phase 4: Testing & Validation
1. Test all endpoints with sample data
2. Verify pagination and filtering work correctly
3. Test error scenarios and edge cases
4. Document API usage for future frontend integration

## Expected Deliverables
- **Working REST API** serving pedal and pedalboard data
- **Concurrent development servers** (browser-sync + Express)
- **No disruption** to existing frontend functionality
- **API documentation** with endpoint details and examples
- **Ready for future frontend integration** when needed

## Benefits
- **Parallel Development**: APIs ready for gradual frontend migration
- **Better Performance**: Database queries vs JSON file parsing
- **Enhanced Features**: Pagination, filtering, search capabilities
- **Future-Ready**: Foundation for advanced features (user accounts, favorites, etc.)

This approach provides a smooth transition path while maintaining current functionality.