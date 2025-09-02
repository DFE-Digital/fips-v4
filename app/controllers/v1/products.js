const fs = require('fs');
const path = require('path');

// Load products data
function loadProductsData() {
    try {
        const dataPath = path.join(__dirname, '../../data/fips.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        const allProducts = JSON.parse(data);
        
        // Filter out specified parent categories and all PP variants
        const excludedParents = [
            "End User Computing",
            "Corporate services", 
            "Shared IT core services",
            "zBusiness Operations (do not use)",
            "Voice and Data Network",
            "IT for the IT department"
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
        
        // Group filter
        if (filters.group && filters.group.length > 0) {
            const productParent = product.Parent ? 
                product.Parent.toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters.group.includes(productParent)) return false;
        }
        
        // Type filter
        if (filters.type && filters.type.length > 0) {
            const productType = product.Type ? 
                product.Type.toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters.type.includes(productType)) return false;
        }
        
        // Parent filter
        if (filters.parent && filters.parent.length > 0) {
            const productParent = product.Parent ? 
                product.Parent.toLowerCase().replace(/\s+/g, '_') : '';
            if (!filters.parent.includes(productParent)) return false;
        }
        
        // Subgroup filter - filter by products that belong to specific subgroups
        if (filters.subgroup && filters.subgroup.length > 0) {
            // For now, subgroup filter will work by filtering products that have
            // a Parent that matches the subgroup's parent
            // This is a simplified approach - in a real system you might have a direct subgroup field
            if (!product.Parent) return false;
            
            // Check if the product's parent matches any of the selected subgroups' parents
            const productParent = product.Parent.toLowerCase().replace(/\s+/g, '_');
            const hasMatchingSubgroup = filters.subgroup.some(subgroup => {
                // This would need to be enhanced with actual subgroup data
                // For now, we'll use a simple approach
                return subgroup === productParent;
            });
            
            if (!hasMatchingSubgroup) return false;
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

// Load and process user groups data for autocomplete
function loadUserGroupsData() {
    try {
        const dataPath = path.join(__dirname, '../../data/nested_all_user_groups.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        const userGroups = JSON.parse(data);
        
        // Extract all level 2 and 3 items with their hierarchy info
        const searchableItems = [];
        
        userGroups.forEach(level1 => {
            level1.children.forEach(level2 => {
                // Add level 2 item
                searchableItems.push({
                    id: level2.id,
                    label: level2.label,
                    level: 2,
                    aliases: level2.aliases || [],
                    parentLabel: level1.label,
                    searchText: [level2.label, ...(level2.aliases || [])].join(' ').toLowerCase()
                });
                
                // Add level 3 items if they exist
                if (level2.children && level2.children.length > 0) {
                    level2.children.forEach(level3 => {
                        searchableItems.push({
                            id: level3.id,
                            label: level3.label,
                            level: 3,
                            aliases: level3.aliases || [],
                            parentLabel: level2.label,
                            grandparentLabel: level1.label,
                            searchText: [level3.label, ...(level3.aliases || [])].join(' ').toLowerCase()
                        });
                    });
                }
            });
        });
        
        return searchableItems;
    } catch (error) {
        console.error('Error loading user groups data:', error);
        return [];
    }
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
    
    // Get unique groups from categories.json (Taxonomy: "Group")
    let groups = [];
    try {
        const categoriesPath = path.join(__dirname, '../../data/categories.json');
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        const groupItems = categoriesData.filter(category => 
            category.Taxonomy === 'Group'
        );
        
        groups = groupItems.map(group => ({
            value: group.Slug || group.Item.toLowerCase().replace(/\s+/g, '_'),
            text: group.Item,
            count: products.filter(p => p.Parent === group.Item).length
        }));
    } catch (error) {
        console.error('Error loading groups:', error);
    }
    
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

    // Get unique types and create distinct filter options
    const uniqueTypes = [...new Set(products
        .map(p => p.Type)
        .filter(Boolean)
    )];
    
    const types = uniqueTypes.map(type => ({
        value: type.toLowerCase().replace(/\s+/g, '_'),
        text: type,
        count: products.filter(p => p.Type === type).length
    }));
    
    // Get unique subgroups from categories.json
    let subgroups = [];
    try {
        const categoriesPath = path.join(__dirname, '../../data/categories.json');
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        const subgroupItems = categoriesData.filter(category => 
            category.Taxonomy === 'SubGroup'
        );
        
        subgroups = subgroupItems.map(subgroup => ({
            value: subgroup.Slug || subgroup.Item.toLowerCase().replace(/\s+/g, '_'),
            text: subgroup.Item,
            parent: subgroup.Parent,
            parentSlug: (subgroup.Parent || '').toLowerCase().replace(/\s+/g, '_'),
            count: products.filter(p => p.Parent === subgroup.Parent).length
        }));
    } catch (error) {
        console.error('Error loading subgroups:', error);
    }
    
    return {
        phases: phases.sort((a, b) => a.text.localeCompare(b.text)),
        businessAreas: businessAreas.sort((a, b) => a.text.localeCompare(b.text)),
        groups: groups.sort((a, b) => a.text.localeCompare(b.text)),
        types: types.sort((a, b) => a.text.localeCompare(b.text)),
        parents: parents.sort((a, b) => a.text.localeCompare(b.text)),
        subgroups: subgroups.sort((a, b) => a.text.localeCompare(b.text))
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
            group: req.query.group ? (Array.isArray(req.query.group) ? req.query.group.filter(g => g !== '_unchecked') : [req.query.group].filter(g => g !== '_unchecked')) : [],
            type: req.query.type ? (Array.isArray(req.query.type) ? req.query.type.filter(t => t !== '_unchecked') : [req.query.type].filter(t => t !== '_unchecked')) : [],
            parent: req.query.parent ? (Array.isArray(req.query.parent) ? req.query.parent.filter(p => p !== '_unchecked') : [req.query.parent].filter(p => p !== '_unchecked')) : [],
            subgroup: req.query.subgroup ? (Array.isArray(req.query.subgroup) ? req.query.subgroup.filter(sg => sg !== '_unchecked') : [req.query.subgroup].filter(sg => sg !== '_unchecked')) : [],
            user: req.query.user ? (Array.isArray(req.query.user) ? req.query.user.filter(u => u !== '_unchecked') : [req.query.user].filter(u => u !== '_unchecked')) : [],
            keywords: req.query.keywords || ''
        };
        
        // Apply filters
        const filteredProducts = filterProducts(allProducts, filters);
        
        // Paginate results
        const page = parseInt(req.query.page) || 1;
        const paginatedResults = paginateResults(filteredProducts, page);
        
        // Get filter options with counts based on current filters
        const filterOptions = getFilterOptions(allProducts);
        
        // Load user groups data for autocomplete
        const userGroupsData = loadUserGroupsData();
        
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

        if (filters.group.length > 0) {
            selectedFilters.push({
                heading: { text: 'Group' },
                items: filters.group.map(group => ({
                    href: removeFilterFromUrl(req.originalUrl, 'group', group),
                    text: filterOptions.groups.find(g => g.value === group)?.text || group
                }))
            });
        }

        if (filters.type.length > 0) {
            selectedFilters.push({
                heading: { text: 'Type' },
                items: filters.type.map(type => ({
                    href: removeFilterFromUrl(req.originalUrl, 'type', type),
                    text: filterOptions.types.find(t => t.value === type)?.text || type
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
        
        if (filters.subgroup.length > 0) {
            selectedFilters.push({
                heading: { text: 'Sub-group' },
                items: filters.subgroup.map(subgroup => ({
                    href: removeFilterFromUrl(req.originalUrl, 'subgroup', subgroup),
                    text: subgroup
                }))
            });
        }
        
        if (filters.user.length > 0) {
            selectedFilters.push({
                heading: { text: 'User' },
                items: filters.user.map(userId => {
                    const selectedUser = userGroupsData.find(user => user.id === userId);
                    return {
                        href: removeFilterFromUrl(req.originalUrl, 'user', userId),
                        text: selectedUser ? selectedUser.label : userId
                    };
                })
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
        if (filters.group.length > 0) {
            filters.group.forEach(group => queryParams.append('group', group));
        }
        if (filters.type.length > 0) {
            filters.type.forEach(type => queryParams.append('type', type));
        }
        if (filters.parent.length > 0) {
            filters.parent.forEach(parent => queryParams.append('parent', parent));
        }
        if (filters.subgroup.length > 0) {
            filters.subgroup.forEach(subgroup => queryParams.append('subgroup', subgroup));
        }
        if (filters.user.length > 0) {
            filters.user.forEach(user => queryParams.append('user', user));
        }
        if (filters.keywords) {
            queryParams.append('keywords', filters.keywords);
        }
        const baseQuery = queryParams.toString();

        res.render('v1/products/index', {
            products: paginatedResults.products,
            pagination: paginatedResults,
            filters: filters,
            filterOptions: filterOptions,
            userGroupsData: userGroupsData,
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
        
        // Define contact keys to check (excluding Service Desk and Assigned To as they're not relevant contacts)
        const contactKeys = [
            'Owned By',
            'Senior Responsible Owner', 
            'Delivery Manager',
            'Information Asset Owner'
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
        
        res.render('v1/product/index', {
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

        const contactKeys = [
            'Owned By',
            'Senior Responsible Owner', 
            'Delivery Manager',
            'Information Asset Owner'
        ];
        
        
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

         // Build contacts array with non-null values
         const contacts = contactKeys
         .filter(key => product[key] && product[key].trim() !== '')
         .map(key => {
             const name = product[key];
             
             return {
                 role: key,
                 name: name,
             };
         });
        
        res.render('v1/product/categories', {
            product: product,
            categories: categories,
            categoryTypes: categoryTypes,
            allComponents: allComponents,
            contacts: contacts
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
