# Plan: Replace JSON File Reading with REST API Calls (No Fallback)

## Understanding of Current Architecture

**Current Data Flow:**
1. `GetPedalData()` - Fetches `public/data/pedals.json` via AJAX
2. `GetPedalBoardData()` - Fetches `public/data/pedalboards.json` via AJAX
3. Data is parsed and converted to `Pedal` and `PedalBoard` objects
4. Objects are sorted alphabetically by brand/name
5. Rendered into select2 dropdowns via `RenderPedals()` and `RenderPedalBoards()`

**Current Data Structure Mapping:**
- JSON: `{"Brand": "Boss", "Name": "DD-7", "Width": 2.88, "Height": 5.13, "Image": "boss-dd7.png"}`
- Constructor: `new Pedal(Type, Brand, Name, Width, Height, Image)`
- API: `{"brand": "Boss", "name": "DD-7", "width": 2.88, "height": 5.13, "image": "boss-dd7.png"}`

**Key Challenges:**
1. **Data Structure Differences**: JSON uses `Brand/Name/Width/Height/Image` vs API uses `brand/name/width/height/image`
2. **Missing Type Field**: Current constructor expects `Type` field which doesn't exist in JSON or API
3. **Error Handling**: Need robust error handling for API failures
4. **Performance**: API pagination vs loading all data at once

## Implementation Strategy

### Phase 1: Create API Service Layer
**Objective**: Abstract API calls into reusable service functions

**Approach:**
- Create `APIService` object with methods for pedals/pedalboards
- Handle API errors gracefully with user-friendly messages
- Implement caching to avoid repeated API calls
- Support pagination for large datasets

**Key Functions:**
```javascript
APIService = {
    getPedals: function(callback, errorCallback),
    getPedalboards: function(callback, errorCallback),
    checkHealth: function(callback)
}
```

### Phase 2: Update Data Loading Functions
**Objective**: Modify `GetPedalData()` and `GetPedalBoardData()` to use APIs exclusively

**Changes Required:**
1. **Replace AJAX Calls**: Change from JSON file URLs to API endpoints
2. **Handle Response Format**: Map API response fields to constructor parameters
3. **Error Handling**: Show clear error messages if API fails
4. **Pagination**: Handle API pagination to get all data
5. **Performance**: Implement caching for better user experience

**API Endpoints to Use:**
- `GET /api/pedals?limit=10000` - Get all pedals (high limit to get everything)
- `GET /api/pedalboards?limit=1000` - Get all pedalboards

### Phase 3: Data Structure Normalization
**Objective**: Ensure consistent data structure between API and existing code

**Mapping Strategy:**
```javascript
// API Response -> Constructor Parameters
{
    Type: "", // Default empty (not in API)
    Brand: apiData.brand,
    Name: apiData.name, 
    Width: apiData.width,
    Height: apiData.height,
    Image: apiData.image
}
```

### Phase 4: Enhanced Error Handling
**Objective**: Provide clear feedback when API is unavailable

**Error Handling Strategy:**
1. **Loading States**: Show loading indicators during API calls
2. **Error Messages**: Display specific error messages for different failure types
3. **Retry Mechanism**: Allow users to retry failed API calls
4. **Health Check**: Verify API availability before making requests

## Detailed Implementation Plan

### Step 1: Create API Service Module
```javascript
// Add to beginning of scripts.js
window.APIService = {
    baseURL: 'http://localhost:3001/api',
    cache: {
        pedals: null,
        pedalboards: null,
        timestamp: null
    },
    cacheTimeout: 300000, // 5 minutes
    
    checkHealth: function(callback, errorCallback) {
        $.ajax({
            url: this.baseURL + '/health',
            timeout: 5000,
            success: callback,
            error: errorCallback
        });
    },
    
    getPedals: function(successCallback, errorCallback) {
        // Check cache first
        if (this.isCacheValid('pedals')) {
            successCallback(this.cache.pedals);
            return;
        }
        
        $.ajax({
            url: this.baseURL + '/pedals?limit=10000&sort=brand&order=asc',
            timeout: 10000,
            success: (data) => {
                this.cache.pedals = data;
                this.cache.timestamp = Date.now();
                successCallback(data);
            },
            error: errorCallback
        });
    },
    
    getPedalboards: function(successCallback, errorCallback) {
        // Similar implementation for pedalboards
    },
    
    isCacheValid: function(type) {
        return this.cache[type] && 
               this.cache.timestamp && 
               (Date.now() - this.cache.timestamp) < this.cacheTimeout;
    }
}
```

### Step 2: Update GetPedalData Function
**Replace existing function (~Line 576):**
```javascript
window.GetPedalData = function () {
    // Show loading indicator
    showLoadingMessage('Loading pedals...');
    
    APIService.getPedals(
        function(apiResponse) {
            hideLoadingMessage();
            
            var pedals = [];
            apiResponse.data.forEach(function(pedalData) {
                pedals.push(new Pedal(
                    "", // Type (not in API/JSON)
                    pedalData.brand,
                    pedalData.name,
                    pedalData.width,
                    pedalData.height,
                    pedalData.image
                ));
            });
            
            // Sort brands and pedals alphabetically (API already sorted)
            pedals.forEach(RenderPedals);
            listPedals(pedals);
        },
        function(xhr, status, error) {
            hideLoadingMessage();
            showErrorMessage('Failed to load pedals: ' + error + '. Please ensure the API server is running.');
        }
    );
};
```

### Step 3: Update GetPedalBoardData Function
**Replace existing function (~Line 647):**
```javascript
window.GetPedalBoardData = function () {
    showLoadingMessage('Loading pedalboards...');
    
    APIService.getPedalboards(
        function(apiResponse) {
            hideLoadingMessage();
            
            var pedalboards = [];
            apiResponse.data.forEach(function(boardData) {
                pedalboards.push(new PedalBoard(
                    boardData.brand,
                    boardData.name,
                    boardData.width,
                    boardData.height,
                    boardData.image
                ));
            });
            
            console.log("Pedalboard data loaded from API");
            RenderPedalBoards(pedalboards);
        },
        function(xhr, status, error) {
            hideLoadingMessage();
            showErrorMessage('Failed to load pedalboards: ' + error + '. Please ensure the API server is running.');
        }
    );
};
```

### Step 4: Add UI Helper Functions
```javascript
function showLoadingMessage(message) {
    // Show loading spinner/message in UI
    $('.pedal-list, .pedalboard-list').prop('disabled', true);
    // Add loading indicator
}

function hideLoadingMessage() {
    $('.pedal-list, .pedalboard-list').prop('disabled', false);
    // Remove loading indicator
}

function showErrorMessage(message) {
    // Display error message to user
    alert(message); // Or better: custom modal/toast
}
```

### Step 5: Update Application Initialization
**Modify document ready (~Line 7):**
```javascript
$(document).ready(function () {
    // Check API health before loading data
    APIService.checkHealth(
        function() {
            // API is healthy, proceed with normal loading
            GetPedalData();
            GetPedalBoardData();
        },
        function() {
            showErrorMessage('API server is not available. Please ensure the server is running on http://localhost:3001');
        }
    );
    
    // Remove the alert('hey') - Line 12
    // ... rest of existing initialization
});
```

## Configuration

### API Configuration
```javascript
window.PedalPlaygroundConfig = {
    api: {
        baseURL: 'http://localhost:3001/api',
        timeout: 10000,
        retryAttempts: 2
    },
    cache: {
        enabled: true,
        duration: 300000 // 5 minutes
    },
    ui: {
        showLoadingIndicators: true,
        enableRetryButton: true
    }
}
```

## Benefits of This Approach

1. **Clean Architecture**: Pure API integration without mixed approaches
2. **Better Performance**: Database queries vs JSON file parsing
3. **Real-time Data**: Always current data from database
4. **Enhanced Features**: Leverage API capabilities (filtering, pagination, search)
5. **Scalability**: Foundation for advanced features
6. **Error Visibility**: Clear visibility into API/database issues

## Error Handling Strategy

### API Server Down
- **Detection**: Health check on application start
- **User Feedback**: Clear error message with instructions
- **Action**: Provide retry mechanism or server startup instructions

### Network Issues
- **Detection**: AJAX timeout/error handling
- **User Feedback**: Specific network error messages
- **Action**: Retry button for transient issues

### Data Issues
- **Detection**: Response validation
- **User Feedback**: Data-specific error messages
- **Action**: Log errors for debugging

## Testing Strategy

1. **API Available**: Test with API server running normally
2. **API Unavailable**: Test with API server stopped
3. **Network Issues**: Test with simulated timeouts
4. **Data Validation**: Ensure proper mapping between API and constructor
5. **Performance**: Monitor loading times and caching effectiveness
6. **Error States**: Test all error scenarios and user feedback

## Implementation Order

1. **Create APIService module** - Foundation for all API calls
2. **Add UI helper functions** - Loading states and error handling
3. **Update GetPedalData** - Replace JSON with API
4. **Update GetPedalBoardData** - Replace JSON with API  
5. **Update initialization** - Add health check
6. **Test thoroughly** - All scenarios and error states
7. **Remove debug alert** - Clean up Line 12

This approach commits fully to the API/database architecture and will ensure any issues are immediately visible and addressable.