# User Management Technical Specification

## 1. Executive Summary

### 1.1 Overview
This specification outlines the implementation of user authentication and data management functionality for PedalPlayground, enabling users to save favorites and pedalboard layouts across devices while maintaining the current guest user experience.

### 1.2 Core Objectives
- **Data Collection**: Enable user-specific data storage for analytics and engagement
- **Cross-Device Sync**: Replace local JSON file system with cloud-based storage
- **User Favorites**: Allow users to favorite pedals and pedalboards
- **Layout Persistence**: Save and load pedalboard configurations from user accounts
- **Backward Compatibility**: Maintain current guest functionality unchanged

### 1.3 Success Metrics
- User registration and retention rates
- Cross-device usage patterns
- Reduced local storage dependency
- Enhanced user engagement through persistent data

## 2. Architecture Overview

### 2.1 System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API    │    │   SQLite DB     │
│   (jQuery/ES5)  │◄──►│   (Session Auth) │◄──►│   (User Data)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2.2 Authentication Flow
- Traditional server-side sessions with secure cookies
- Email/password authentication stored in SQLite
- Session persistence across browser tabs and devices
- Graceful degradation for guest users

### 2.3 Data Strategy
- **Static Data**: Pedals/pedalboards remain publicly accessible
- **User Data**: Favorites and layouts tied to authenticated sessions
- **Local Fallback**: Guest functionality preserved via cookies/localStorage
- **Sync Strategy**: Network-first with local caching

## 3. Database Schema Design

### 3.1 New Tables

#### 3.1.1 Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

#### 3.1.2 User Sessions Table
```sql
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

#### 3.1.3 User Pedal Favorites Table
```sql
CREATE TABLE user_pedal_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pedal_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, pedal_id)
);

CREATE INDEX idx_user_pedal_favorites_user ON user_pedal_favorites(user_id);
CREATE INDEX idx_user_pedal_favorites_pedal ON user_pedal_favorites(pedal_id);
```

#### 3.1.4 User Pedalboard Favorites Table
```sql
CREATE TABLE user_pedalboard_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pedalboard_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, pedalboard_id)
);

CREATE INDEX idx_user_pedalboard_favorites_user ON user_pedalboard_favorites(user_id);
CREATE INDEX idx_user_pedalboard_favorites_board ON user_pedalboard_favorites(pedalboard_id);
```

#### 3.1.5 Saved Layouts Table
```sql
CREATE TABLE saved_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    layout_data TEXT NOT NULL, -- JSON string of pedalboard configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_layouts_user ON saved_layouts(user_id);
CREATE INDEX idx_saved_layouts_updated ON saved_layouts(updated_at);
```

#### 3.1.6 Password Reset Tokens Table
```sql
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_expires ON password_reset_tokens(expires_at);
```

### 3.2 Database Migration Strategy
```javascript
// migrations/001_create_user_tables.js
const migrations = [
    // Create users table
    `CREATE TABLE users (...)`,
    
    // Create sessions table  
    `CREATE TABLE user_sessions (...)`,
    
    // Create favorites tables
    `CREATE TABLE user_pedal_favorites (...)`,
    `CREATE TABLE user_pedalboard_favorites (...)`,
    
    // Create saved layouts table
    `CREATE TABLE saved_layouts (...)`,
    
    // Create password reset table
    `CREATE TABLE password_reset_tokens (...)`
];
```

## 4. API Design

### 4.1 Authentication Endpoints

#### 4.1.1 User Registration
```
POST /api/auth/register
Content-Type: application/json

Request:
{
    "email": "user@example.com",
    "password": "userpassword"
}

Response (201):
{
    "success": true,
    "user": {
        "id": 123,
        "email": "user@example.com"
    }
}

Response (400):
{
    "success": false,
    "error": "Email already exists"
}
```

#### 4.1.2 User Login
```
POST /api/auth/login
Content-Type: application/json

Request:
{
    "email": "user@example.com", 
    "password": "userpassword"
}

Response (200):
{
    "success": true,
    "user": {
        "id": 123,
        "email": "user@example.com"
    }
}

Response (401):
{
    "success": false,
    "error": "Invalid credentials"
}
```

#### 4.1.3 User Logout
```
POST /api/auth/logout

Response (200):
{
    "success": true
}
```

#### 4.1.4 Password Reset Request
```
POST /api/auth/reset-request
Content-Type: application/json

Request:
{
    "email": "user@example.com"
}

Response (200):
{
    "success": true,
    "message": "Reset link sent to email"
}
```

#### 4.1.5 Password Reset Confirm
```
POST /api/auth/reset-confirm
Content-Type: application/json

Request:
{
    "token": "reset_token_here",
    "password": "newpassword"
}

Response (200):
{
    "success": true,
    "message": "Password updated successfully"
}
```

### 4.2 User Data Endpoints

#### 4.2.1 Get User Profile
```
GET /api/user/profile

Response (200):
{
    "success": true,
    "user": {
        "id": 123,
        "email": "user@example.com",
        "created_at": "2025-01-15T10:30:00Z"
    }
}
```

#### 4.2.2 Pedal Favorites Management
```
POST /api/user/favorites/pedals
Content-Type: application/json

Request:
{
    "pedal_id": 456
}

Response (201):
{
    "success": true,
    "message": "Pedal added to favorites"
}

DELETE /api/user/favorites/pedals/456

Response (200):
{
    "success": true,
    "message": "Pedal removed from favorites"
}

GET /api/user/favorites/pedals

Response (200):
{
    "success": true,
    "favorites": [456, 789, 123]
}
```

#### 4.2.3 Pedalboard Favorites Management
```
POST /api/user/favorites/pedalboards
Content-Type: application/json

Request:
{
    "pedalboard_id": 789
}

Response (201):
{
    "success": true,
    "message": "Pedalboard added to favorites"
}

DELETE /api/user/favorites/pedalboards/789

Response (200):
{
    "success": true,
    "message": "Pedalboard removed from favorites"
}

GET /api/user/favorites/pedalboards

Response (200):
{
    "success": true,
    "favorites": [789, 234, 567]
}
```

#### 4.2.4 Saved Layouts Management
```
POST /api/user/layouts
Content-Type: application/json

Request:
{
    "name": "My Awesome Board",
    "description": "Blues and rock setup",
    "layout_data": {...} // JSON pedalboard configuration
}

Response (201):
{
    "success": true,
    "layout": {
        "id": 101,
        "name": "My Awesome Board",
        "description": "Blues and rock setup",
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }
}

GET /api/user/layouts

Response (200):
{
    "success": true,
    "layouts": [
        {
            "id": 101,
            "name": "My Awesome Board",
            "description": "Blues and rock setup",
            "created_at": "2025-01-15T10:30:00Z",
            "updated_at": "2025-01-15T10:30:00Z"
        }
    ]
}

GET /api/user/layouts/101

Response (200):
{
    "success": true,
    "layout": {
        "id": 101,
        "name": "My Awesome Board", 
        "description": "Blues and rock setup",
        "layout_data": {...}, // Full JSON configuration
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }
}

PUT /api/user/layouts/101
Content-Type: application/json

Request:
{
    "name": "Updated Board Name",
    "description": "Updated description",
    "layout_data": {...} // Updated JSON configuration
}

Response (200):
{
    "success": true,
    "layout": {
        "id": 101,
        "name": "Updated Board Name",
        "description": "Updated description", 
        "updated_at": "2025-01-15T11:30:00Z"
    }
}

DELETE /api/user/layouts/101

Response (200):
{
    "success": true,
    "message": "Layout deleted successfully"
}
```

### 4.3 Authentication Middleware
```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
}

function optionalAuth(req, res, next) {
    // Attach user info if logged in, but don't require it
    if (req.session.userId) {
        // Attach user to request object
        req.user = { id: req.session.userId };
    }
    next();
}
```

## 5. Frontend Implementation

### 5.1 Authentication UI Components

#### 5.1.1 Login Modal
```html
<!-- Login Modal -->
<div class="modal fade" id="loginModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Login to PedalPlayground</h4>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="loginForm">
                    <div class="form-group">
                        <label for="loginEmail">Email:</label>
                        <input type="email" class="form-control" id="loginEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password:</label>
                        <input type="password" class="form-control" id="loginPassword" required>
                    </div>
                    <div class="form-group">
                        <div class="alert alert-danger" id="loginError" style="display: none;"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="loginSubmit">Login</button>
                <button type="button" class="btn btn-link" id="showRegister">Create Account</button>
                <button type="button" class="btn btn-link" id="showReset">Forgot Password?</button>
            </div>
        </div>
    </div>
</div>
```

#### 5.1.2 Registration Modal
```html
<!-- Registration Modal -->
<div class="modal fade" id="registerModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Create Account</h4>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="registerForm">
                    <div class="form-group">
                        <label for="registerEmail">Email:</label>
                        <input type="email" class="form-control" id="registerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Password:</label>
                        <input type="password" class="form-control" id="registerPassword" required>
                        <small class="form-text text-muted">Must be at least 4 characters</small>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password:</label>
                        <input type="password" class="form-control" id="confirmPassword" required>
                    </div>
                    <div class="form-group">
                        <div class="alert alert-danger" id="registerError" style="display: none;"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="registerSubmit">Create Account</button>
                <button type="button" class="btn btn-link" id="showLogin">Already have an account?</button>
            </div>
        </div>
    </div>
</div>
```

### 5.2 Navigation Integration
```html
<!-- Updated Navigation Bar -->
<nav class="navbar navbar-default">
    <div class="container-fluid">
        <div class="navbar-header">
            <a class="navbar-brand" href="#">PedalPlayground</a>
        </div>
        <div class="navbar-collapse">
            <ul class="navbar-nav navbar-right">
                <!-- Guest User -->
                <li id="guestNav" style="display: none;">
                    <a href="#" id="loginLink">Login</a>
                </li>
                <!-- Authenticated User -->
                <li class="dropdown" id="userNav" style="display: none;">
                    <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                        <span id="userEmail"></span> <span class="caret"></span>
                    </a>
                    <ul class="dropdown-menu">
                        <li><a href="#" id="savedLayoutsLink">My Layouts</a></li>
                        <li><a href="#" id="favoritesLink">My Favorites</a></li>
                        <li class="divider"></li>
                        <li><a href="#" id="logoutLink">Logout</a></li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>
</nav>
```

### 5.3 JavaScript Authentication Manager
```javascript
// js/auth.js
var AuthManager = {
    currentUser: null,
    
    init: function() {
        this.bindEvents();
        this.checkAuthStatus();
    },
    
    bindEvents: function() {
        $('#loginLink').click(this.showLoginModal.bind(this));
        $('#loginSubmit').click(this.handleLogin.bind(this));
        $('#registerSubmit').click(this.handleRegister.bind(this));
        $('#logoutLink').click(this.handleLogout.bind(this));
        $('#showRegister').click(this.showRegisterModal.bind(this));
        $('#showLogin').click(this.showLoginModal.bind(this));
    },
    
    checkAuthStatus: function() {
        $.ajax({
            url: '/api/user/profile',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    this.setAuthenticatedState(response.user);
                } else {
                    this.setGuestState();
                }
            }.bind(this),
            error: function() {
                this.setGuestState();
            }.bind(this)
        });
    },
    
    handleLogin: function(e) {
        e.preventDefault();
        var email = $('#loginEmail').val();
        var password = $('#loginPassword').val();
        
        $.ajax({
            url: '/api/auth/login',
            method: 'POST',
            data: JSON.stringify({ email: email, password: password }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    this.setAuthenticatedState(response.user);
                    $('#loginModal').modal('hide');
                    this.syncLocalData();
                } else {
                    $('#loginError').text(response.error).show();
                }
            }.bind(this),
            error: function() {
                $('#loginError').text('Login failed. Please try again.').show();
            }
        });
    },
    
    handleRegister: function(e) {
        e.preventDefault();
        var email = $('#registerEmail').val();
        var password = $('#registerPassword').val();
        var confirmPassword = $('#confirmPassword').val();
        
        if (password !== confirmPassword) {
            $('#registerError').text('Passwords do not match').show();
            return;
        }
        
        $.ajax({
            url: '/api/auth/register',
            method: 'POST',
            data: JSON.stringify({ email: email, password: password }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    this.setAuthenticatedState(response.user);
                    $('#registerModal').modal('hide');
                } else {
                    $('#registerError').text(response.error).show();
                }
            }.bind(this),
            error: function() {
                $('#registerError').text('Registration failed. Please try again.').show();
            }
        });
    },
    
    handleLogout: function(e) {
        e.preventDefault();
        $.ajax({
            url: '/api/auth/logout',
            method: 'POST',
            success: function() {
                this.setGuestState();
            }.bind(this)
        });
    },
    
    setAuthenticatedState: function(user) {
        this.currentUser = user;
        $('#userEmail').text(user.email);
        $('#userNav').show();
        $('#guestNav').hide();
        this.loadUserData();
    },
    
    setGuestState: function() {
        this.currentUser = null;
        $('#userNav').hide();
        $('#guestNav').show();
    },
    
    showLoginModal: function() {
        $('#loginModal').modal('show');
        $('#loginError').hide();
    },
    
    showRegisterModal: function() {
        $('#registerModal').modal('show');
        $('#registerError').hide();
    },
    
    loadUserData: function() {
        // Load user favorites and layouts
        this.loadFavorites();
        this.loadSavedLayouts();
    },
    
    syncLocalData: function() {
        // Sync any local favorites/layouts to server
        // Implementation depends on current local storage structure
    }
};

// Initialize when document ready
$(document).ready(function() {
    AuthManager.init();
});
```

### 5.4 Favorites Management
```javascript
// js/favorites.js
var FavoritesManager = {
    pedalFavorites: [],
    pedalboardFavorites: [],
    
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        $(document).on('click', '.favorite-pedal-btn', this.togglePedalFavorite.bind(this));
        $(document).on('click', '.favorite-pedalboard-btn', this.togglePedalboardFavorite.bind(this));
    },
    
    loadFavorites: function() {
        if (!AuthManager.currentUser) return;
        
        // Load pedal favorites
        $.ajax({
            url: '/api/user/favorites/pedals',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    this.pedalFavorites = response.favorites;
                    this.updatePedalUI();
                }
            }.bind(this)
        });
        
        // Load pedalboard favorites
        $.ajax({
            url: '/api/user/favorites/pedalboards',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    this.pedalboardFavorites = response.favorites;
                    this.updatePedalboardUI();
                }
            }.bind(this)
        });
    },
    
    togglePedalFavorite: function(e) {
        e.preventDefault();
        var pedalId = $(e.target).data('pedal-id');
        var isFavorite = this.pedalFavorites.indexOf(pedalId) !== -1;
        
        if (!AuthManager.currentUser) {
            AuthManager.showLoginModal();
            return;
        }
        
        if (isFavorite) {
            this.removePedalFavorite(pedalId);
        } else {
            this.addPedalFavorite(pedalId);
        }
    },
    
    addPedalFavorite: function(pedalId) {
        $.ajax({
            url: '/api/user/favorites/pedals',
            method: 'POST',
            data: JSON.stringify({ pedal_id: pedalId }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    this.pedalFavorites.push(pedalId);
                    this.updatePedalUI();
                }
            }.bind(this)
        });
    },
    
    removePedalFavorite: function(pedalId) {
        $.ajax({
            url: '/api/user/favorites/pedals/' + pedalId,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    var index = this.pedalFavorites.indexOf(pedalId);
                    if (index !== -1) {
                        this.pedalFavorites.splice(index, 1);
                    }
                    this.updatePedalUI();
                }
            }.bind(this)
        });
    },
    
    updatePedalUI: function() {
        // Update favorite buttons state in pedal browser
        $('.favorite-pedal-btn').each(function() {
            var pedalId = $(this).data('pedal-id');
            var isFavorite = this.pedalFavorites.indexOf(pedalId) !== -1;
            $(this).toggleClass('favorited', isFavorite);
        }.bind(this));
    }
};
```

### 5.5 Saved Layouts Management
```javascript
// js/savedLayouts.js
var SavedLayoutsManager = {
    layouts: [],
    
    init: function() {
        this.bindEvents();
    },
    
    bindEvents: function() {
        $('#saveLayoutBtn').click(this.showSaveDialog.bind(this));
        $('#loadLayoutBtn').click(this.showLoadDialog.bind(this));
        $(document).on('click', '.load-layout-btn', this.loadLayout.bind(this));
        $(document).on('click', '.delete-layout-btn', this.deleteLayout.bind(this));
    },
    
    loadSavedLayouts: function() {
        if (!AuthManager.currentUser) return;
        
        $.ajax({
            url: '/api/user/layouts',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    this.layouts = response.layouts;
                    this.updateLayoutsList();
                }
            }.bind(this)
        });
    },
    
    saveCurrentLayout: function(name, description) {
        if (!AuthManager.currentUser) {
            AuthManager.showLoginModal();
            return;
        }
        
        var layoutData = PedalboardManager.getCurrentLayout(); // Existing function
        
        $.ajax({
            url: '/api/user/layouts',
            method: 'POST',
            data: JSON.stringify({
                name: name,
                description: description,
                layout_data: layoutData
            }),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    this.layouts.push(response.layout);
                    this.updateLayoutsList();
                    this.showSuccessMessage('Layout saved successfully!');
                }
            }.bind(this),
            error: function() {
                this.showErrorMessage('Failed to save layout. Please try again.');
            }.bind(this)
        });
    },
    
    loadLayout: function(e) {
        e.preventDefault();
        var layoutId = $(e.target).data('layout-id');
        
        $.ajax({
            url: '/api/user/layouts/' + layoutId,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    PedalboardManager.loadLayout(response.layout.layout_data);
                    this.showSuccessMessage('Layout loaded successfully!');
                }
            }.bind(this),
            error: function() {
                this.showErrorMessage('Failed to load layout. Please try again.');
            }.bind(this)
        });
    },
    
    deleteLayout: function(e) {
        e.preventDefault();
        var layoutId = $(e.target).data('layout-id');
        
        if (!confirm('Are you sure you want to delete this layout?')) {
            return;
        }
        
        $.ajax({
            url: '/api/user/layouts/' + layoutId,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    this.layouts = this.layouts.filter(function(layout) {
                        return layout.id !== layoutId;
                    });
                    this.updateLayoutsList();
                    this.showSuccessMessage('Layout deleted successfully!');
                }
            }.bind(this),
            error: function() {
                this.showErrorMessage('Failed to delete layout. Please try again.');
            }.bind(this)
        });
    }
};
```

## 6. Security Implementation

### 6.1 Password Security
```javascript
// utils/security.js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

function validatePassword(password) {
    return password && password.length >= 4;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
```

### 6.2 Session Security
```javascript
// middleware/session.js
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const sessionConfig = {
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './db'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
    }
};
```

### 6.3 Rate Limiting
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute  
    max: 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too many requests. Please slow down.'
    }
});
```

### 6.4 Input Validation & Sanitization
```javascript
// middleware/validation.js
const validator = require('validator');

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return validator.escape(input.trim());
}

function validateRegistration(req, res, next) {
    const { email, password } = req.body;
    
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Valid email address is required'
        });
    }
    
    if (!password || password.length < 4) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 4 characters'
        });
    }
    
    req.body.email = validator.normalizeEmail(email);
    req.body.password = sanitizeInput(password);
    
    next();
}
```

### 6.5 CSRF Protection
```javascript
// middleware/csrf.js
const csrf = require('csurf');

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// Apply to state-changing endpoints
app.use('/api/user', csrfProtection);
app.use('/api/auth/register', csrfProtection);
app.use('/api/auth/logout', csrfProtection);
```

## 7. Implementation Phases

### 7.1 Phase 1: Core Authentication (Week 1-2)
**Deliverables:**
- Database schema creation and migration scripts
- User registration and login endpoints
- Session management middleware
- Basic authentication UI (login/register modals)
- Password reset functionality

**Acceptance Criteria:**
- Users can create accounts with email/password
- Users can log in and maintain sessions across browser tabs
- Password reset via email works end-to-end
- Guest users retain current functionality unchanged

### 7.2 Phase 2: Favorites System (Week 3)
**Deliverables:**
- Pedal and pedalboard favorites API endpoints
- Frontend favorites management
- Favorite indicators in existing UI
- My Favorites page/modal

**Acceptance Criteria:**
- Authenticated users can favorite/unfavorite pedals and pedalboards
- Favorites persist across devices and sessions
- Guest users see favorite buttons but are prompted to log in
- Favorites are visually indicated in pedal browser

### 7.3 Phase 3: Saved Layouts (Week 4-5)
**Deliverables:**
- Saved layouts API endpoints
- Layout save/load UI integration
- My Layouts management interface
- Migration from local JSON system

**Acceptance Criteria:**
- Users can save named pedalboard layouts to their account
- Users can load, edit, and delete saved layouts
- Layouts sync across devices automatically
- Smooth migration path from existing local save system

### 7.4 Phase 4: Polish & Security (Week 6)
**Deliverables:**
- Rate limiting implementation
- CSRF protection
- Input validation and sanitization
- Error handling improvements
- Performance optimizations

**Acceptance Criteria:**
- All security measures implemented and tested
- Error handling provides clear user feedback
- Performance meets stated requirements (<1s load times)
- Rate limiting prevents abuse

## 8. Testing Strategy

### 8.1 Backend Testing
```javascript
// tests/auth.test.js
describe('Authentication', () => {
    test('User registration with valid data', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'testpassword'
            });
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe('test@example.com');
    });
    
    test('User login with valid credentials', async () => {
        // Create user first
        await createTestUser();
        
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'testpassword'
            });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
```

### 8.2 Frontend Testing
```javascript
// tests/frontend/auth.test.js
describe('AuthManager', () => {
    beforeEach(() => {
        // Mock jQuery and AJAX
        global.$ = mockJQuery;
    });
    
    test('Shows login modal when clicking login link', () => {
        AuthManager.showLoginModal();
        expect($('#loginModal').modal).toHaveBeenCalledWith('show');
    });
    
    test('Updates UI state after successful login', () => {
        const user = { id: 1, email: 'test@example.com' };
        AuthManager.setAuthenticatedState(user);
        
        expect($('#userEmail').text).toHaveBeenCalledWith('test@example.com');
        expect($('#userNav').show).toHaveBeenCalled();
        expect($('#guestNav').hide).toHaveBeenCalled();
    });
});
```

### 8.3 Integration Testing
- Full authentication flow (register → login → use features → logout)
- Favorites management across sessions
- Layout save/load functionality
- Cross-device sync simulation
- Rate limiting verification
- Security vulnerability scanning

## 9. Deployment Considerations

### 9.1 Environment Configuration
```javascript
// config/environment.js
module.exports = {
    development: {
        database: './db/pedalplayground_dev.db',
        sessionSecret: 'dev-secret-key',
        emailService: {
            provider: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY
        }
    },
    production: {
        database: process.env.DATABASE_PATH || './db/pedalplayground.db',
        sessionSecret: process.env.SESSION_SECRET,
        emailService: {
            provider: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY
        }
    }
};
```

### 9.2 Database Backup Strategy
- Daily automated backups of SQLite database
- Version-controlled migration scripts
- Rollback procedures for failed deployments
- Data export functionality for compliance

### 9.3 Monitoring & Analytics
- User registration/login metrics
- Feature adoption tracking (favorites usage, layouts saved)
- Performance monitoring (response times, error rates)
- Security monitoring (failed login attempts, rate limiting hits)

## 10. Future Enhancements

### 10.1 Social Features (Phase 5)
- Public pedalboard gallery
- User profiles and sharing
- Community favorites and ratings
- Export layouts as images for social sharing

### 10.2 Advanced Features (Phase 6)
- Pedalboard layout folders/categories
- Collaborative editing
- Layout versioning and history
- Import from other pedalboard tools

### 10.3 Mobile Optimization (Phase 7)
- Progressive Web App (PWA) implementation
- Touch-optimized drag and drop
- Offline functionality
- Push notifications for layout updates

## 11. Success Metrics & KPIs

### 11.1 User Engagement
- User registration conversion rate (target: 15-25%)
- Daily/weekly active users
- Average layouts per user
- Favorites engagement rate

### 11.2 Technical Performance
- Page load times (target: <1s)
- API response times (target: <200ms)
- Error rates (target: <1%)
- Uptime (target: 99.9%)

### 11.3 Business Impact
- User retention rates
- Cross-device usage patterns
- Feature adoption curves
- Support ticket reduction

---

*This technical specification serves as the comprehensive guide for implementing user management functionality in PedalPlayground. All implementation should follow the patterns and standards outlined above while maintaining the existing user experience for guest users.*