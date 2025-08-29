const fs = require('fs');
const path = require('path');

// Load products data
function loadProductsData() {
    try {
        const dataPath = path.join(__dirname, '../data/fips.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        const allProducts = JSON.parse(data);
        
        // Filter out specified parent categories and all PP variants
        const excludedParents = [
            "End User Computing",
            "Corporate services", 
            "Shared IT core services",
            "zBusiness Operations (do not use)",
            "Voice and Data Network"
        ];
        
        return allProducts.filter(product => {
            // Exclude if Parent matches excluded categories
            if (excludedParents.includes(product.Parent)) return false;
            
            // Exclude all products with (PP) in Parent field
            if (product.Parent && product.Parent.includes("(PP)")) return false;
            
            // Exclude products with "New" operational status
            if (product['Operational Status'] === "New") return false;
            
            return true;
        });
    } catch (error) {
        console.error('Error loading products data:', error);
        return [];
    }
}

// Filter products based on query parameters
function filterProducts(products, filters) {
    return products.filter(product => {
        // Phase filter
        if (filters.phase && filters.phase.length > 0) {
            const productPhase = product.phase ? product.phase.toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters.phase.includes(productPhase)) return false;
        }
        
        // Business area filter
        if (filters['business-area'] && filters['business-area'].length > 0) {
            const productBusinessArea = product['business-area'] ? 
                product['business-area'].toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters['business-area'].includes(productBusinessArea)) return false;
        }
        
        // Parent filter
        if (filters.parent && filters.parent.length > 0) {
            const productParent = product.Parent ? 
                product.Parent.toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters.parent.includes(productParent)) return false;
        }
        
        // Keywords filter - search only in Name field
        if (filters.keywords && filters.keywords.trim()) {
            const searchTerm = filters.keywords.toLowerCase();
            const productName = (product.Name || '').toLowerCase();
            
            if (!productName.includes(searchTerm)) return false;
        }
        
        return true;
    });
}

// Paginate results
function paginateResults(products, page = 1, perPage = 12) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    return {
        products: products.slice(startIndex, endIndex),
        totalPages: Math.ceil(products.length / perPage),
        currentPage: page,
        totalResults: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1
    };
}

// Get unique values for filter options
function getFilterOptions(products) {
    // Get unique phases and create distinct filter options
    const uniquePhases = [...new Set(products
        .map(p => p.phase)
        .filter(Boolean)
    )];
    
    const phases = uniquePhases.map(phase => ({
        value: phase.toLowerCase().replace(/\s+/g, '_'),
        text: phase,
        count: products.filter(p => p.phase === phase).length
    }));
    
    // Get unique business areas and create distinct filter options
    const uniqueBusinessAreas = [...new Set(products
        .map(p => p['business-area'])
        .filter(Boolean)
    )];
    
    const businessAreas = uniqueBusinessAreas.map(area => ({
        value: area.toLowerCase().replace(/\s+/g, '_'),
        text: area,
        count: products.filter(p => p['business-area'] === area).length
    }));
    
    // Get unique parents and create distinct filter options
    const uniqueParents = [...new Set(products
        .map(p => p.Parent)
        .filter(Boolean)
    )];
    
    const parents = uniqueParents.map(parent => ({
        value: parent.toLowerCase().replace(/\s+/g, '_'),
        text: parent,
        count: products.filter(p => p.Parent === parent).length
    }));
    
    return {
        phases: phases.sort((a, b) => a.text.localeCompare(b.text)),
        businessAreas: businessAreas.sort((a, b) => a.text.localeCompare(b.text)),
        parents: parents.sort((a, b) => a.text.localeCompare(b.text))
    };
}

// Products index controller
exports.index = (req, res) => {
    try {
        const allProducts = loadProductsData();
        
        // Extract filters from query parameters
        const filters = {
            phase: req.query.phase ? (Array.isArray(req.query.phase) ? req.query.phase.filter(p => p !== '_unchecked') : [req.query.phase].filter(p => p !== '_unchecked')) : [],
            'business-area': req.query['business-area'] ? (Array.isArray(req.query['business-area']) ? req.query['business-area'].filter(ba => ba !== '_unchecked') : [req.query['business-area']].filter(ba => ba !== '_unchecked')) : [],
            parent: req.query.parent ? (Array.isArray(req.query.parent) ? req.query.parent.filter(p => p !== '_unchecked') : [req.query.parent].filter(p => p !== '_unchecked')) : [],
            keywords: req.query.keywords || ''
        };
        
        // Apply filters
        const filteredProducts = filterProducts(allProducts, filters);
        
        // Paginate results
        const page = parseInt(req.query.page) || 1;
        const paginatedResults = paginateResults(filteredProducts, page);
        
        // Get filter options with counts based on current filters
        const filterOptions = getFilterOptions(filteredProducts);
        
        // Prepare selected filters for display
        const selectedFilters = [];
        
        if (filters.phase.length > 0) {
            selectedFilters.push({
                heading: { text: 'Phase' },
                items: filters.phase.map(phase => ({
                    href: removeFilterFromUrl(req.originalUrl, 'phase', phase),
                    text: filterOptions.phases.find(p => p.value === phase)?.text || phase
                }))
            });
        }
        
        if (filters['business-area'].length > 0) {
            selectedFilters.push({
                heading: { text: 'Business area' },
                items: filters['business-area'].map(area => ({
                    href: removeFilterFromUrl(req.originalUrl, 'business-area', area),
                    text: filterOptions.businessAreas.find(ba => ba.value === area)?.text || area
                }))
            });
        }
        
        if (filters.parent.length > 0) {
            selectedFilters.push({
                heading: { text: 'Parent service' },
                items: filters.parent.map(parent => ({
                    href: removeFilterFromUrl(req.originalUrl, 'parent', parent),
                    text: filterOptions.parents.find(p => p.value === parent)?.text || parent
                }))
            });
        }
        
        // Build current query string without page parameter for pagination links
        const queryParams = new URLSearchParams();
        if (filters.phase.length > 0) {
            filters.phase.forEach(phase => queryParams.append('phase', phase));
        }
        if (filters['business-area'].length > 0) {
            filters['business-area'].forEach(area => queryParams.append('business-area', area));
        }
        if (filters.parent.length > 0) {
            filters.parent.forEach(parent => queryParams.append('parent', parent));
        }
        if (filters.keywords) {
            queryParams.append('keywords', filters.keywords);
        }
        const baseQuery = queryParams.toString();

        res.render('products/index', {
            products: paginatedResults.products,
            pagination: paginatedResults,
            filters: filters,
            filterOptions: filterOptions,
            selectedFilters: selectedFilters,
            clearFiltersUrl: req.baseUrl + req.path,
            baseQuery: baseQuery
        });
        
    } catch (error) {
        console.error('Error in products controller:', error);
        res.status(500).render('error', { 
            error: 'Unable to load products data' 
        });
    }
};

// Product show controller
exports.show = (req, res) => {
    try {
        const allProducts = loadProductsData();
        const productId = req.params.id;
        
        // Find product by ID
        const product = allProducts.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).render('error', { 
                error: 'Product not found',
                message: 'The product you are looking for does not exist.'
            });
        }
        
        // Define contact keys to check (excluding Service Desk as it's not a person)
        const contactKeys = [
            'Owned By',
            'Senior Responsible Owner', 
            'Delivery Manager',
            'Information Asset Owner',
            'Assigned To'
        ];
        
        // Helper function to convert name to email
        function nameToEmail(name) {
            if (!name || typeof name !== 'string') return null;
            
            // Split the name and take first two parts (assuming "First LAST" format)
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length < 2) return null;
            
            const firstName = nameParts[0].toLowerCase();
            const lastName = nameParts[1].toLowerCase();
            
            return `${firstName}.${lastName}@education.gov.uk`;
        }

        // Build contacts array with non-null values
        const contacts = contactKeys
            .filter(key => product[key] && product[key].trim() !== '')
            .map(key => {
                const name = product[key];
                const email = nameToEmail(name);
                
                return {
                    role: key,
                    name: name,
                    email: email
                };
            });
        
        res.render('product/index', {
            product: product,
            contacts: contacts
        });
        
    } catch (error) {
        console.error('Error in product show controller:', error);
        res.status(500).render('error', { 
            error: 'Unable to load product data' 
        });
    }
};

// Product categories controller
exports.categories = (req, res) => {
    try {
        const allProducts = loadProductsData();
        const productId = req.params.id;
        
        // Find product by ID
        const product = allProducts.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).render('error', { 
                error: 'Product not found',
                message: 'The product you are looking for does not exist.'
            });
        }
        
        // Process categories data
        const categories = product.categories || {};
        const categoryTypes = Object.keys(categories);
        
        // Flatten all components from all category types
        const allComponents = [];
        categoryTypes.forEach(type => {
            if (categories[type] && Array.isArray(categories[type])) {
                categories[type].forEach(component => {
                    allComponents.push({
                        type: component.type || type,
                        name: component.name,
                        description: component.description
                    });
                });
            }
        });
        
        res.render('product/categories', {
            product: product,
            categories: categories,
            categoryTypes: categoryTypes,
            allComponents: allComponents
        });
        
    } catch (error) {
        console.error('Error in product categories controller:', error);
        res.status(500).render('error', { 
            error: 'Unable to load product categories data' 
        });
    }
};

// Helper function to remove a filter value from URL
function removeFilterFromUrl(url, filterName, filterValue) {
    const urlObj = new URL(url, 'http://localhost');
    const params = urlObj.searchParams;
    
    const currentValues = params.getAll(filterName);
    const newValues = currentValues.filter(value => value !== filterValue);
    
    params.delete(filterName);
    newValues.forEach(value => params.append(filterName, value));
    
    return urlObj.pathname + (urlObj.search ? urlObj.search : '');
}
