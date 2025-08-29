const fs = require('fs');
const path = require('path');

// Load version configuration
function loadVersions() {
    try {
        const versionsPath = path.join(__dirname, '../data/versions.json');
        const versionsData = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
        return versionsData;
    } catch (error) {
        console.error('Error loading versions:', error);
        return null;
    }
}

// Version detection middleware
function versionMiddleware(req, res, next) {
    const versions = loadVersions();
    
    // Default to v1 if no version data
    if (!versions) {
        req.version = 'v1';
        req.versionConfig = null;
        return next();
    }
    
    // Extract version from URL path by checking route prefixes
    const urlPath = req.path;
    let detectedVersion = 'v1'; // Default version
    
    // Check which version this URL belongs to based on route prefixes
    for (const versionKey in versions.versions) {
        const version = versions.versions[versionKey];
        const prefix = version.routePrefix;
        
        // Skip v1 (empty prefix) for now
        if (prefix && urlPath.startsWith(prefix)) {
            detectedVersion = versionKey;
            break;
        }
    }
    
    // Set version info in request
    req.version = detectedVersion;
    req.versionConfig = versions.versions[detectedVersion];
    req.allVersions = versions;
    
    // Helper function to get version-specific view path
    req.getVersionView = function(viewPath) {
        if (detectedVersion === 'v1') {
            return viewPath;
        }
        
        // Check if version-specific view exists
        const versionSpecificPath = `${detectedVersion}/${viewPath}`;
        const fullPath = path.join(__dirname, '../views', versionSpecificPath + '.html');
        
        if (fs.existsSync(fullPath)) {
            return versionSpecificPath;
        }
        
        // Fallback to default view
        return viewPath;
    };
    
    // Helper function to get version-aware URLs using the route prefix
    req.getVersionUrl = function(routeType) {
        const versionConfig = versions.versions[detectedVersion];
        const prefix = versionConfig ? (versionConfig.routePrefix || '') : '';
        
        // Standard route patterns
        const baseRoutes = {
            'products': '/products',
            'product': '/product/:id',
            'categories': '/product/:id/categories',
            'about': '/about'
        };
        
        const baseRoute = baseRoutes[routeType] || routeType;
        return `${prefix}${baseRoute}`;
    };
    
    next();
}

module.exports = versionMiddleware;
