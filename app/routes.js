//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const Airtable = require('airtable')

// Configure Airtable
const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID)

// Import controllers
const v1productsController = require('./controllers/v1/products')
const vspkproductsController = require('./controllers/v-spk-assessments/products')



// v1 routes (default)
router.get('/v1/', (req, res) => {
    // Get product count for homepage
    const fs = require('fs')
    const path = require('path')
    
    try {
        const dataPath = path.join(__dirname, 'data/fips.json')
        const data = fs.readFileSync(dataPath, 'utf8')
        const allProducts = JSON.parse(data)
        
        // Apply same filters as the products controller
        const excludedParents = [
            "End User Computing",
            "Corporate services", 
            "Shared IT core services",
            "zBusiness Operations (do not use)",
            "Voice and Data Network",
            "IT for the IT department"
        ]
        
        const filteredProducts = allProducts.filter(product => {
            if (excludedParents.includes(product.Parent)) return false
            if (product.Parent && product.Parent.includes("(PP)")) return false
            if (product['Operational Status'] === "New") return false
            return true
        })
        
        res.render('v1/index', {
            productCount: filteredProducts.length
        })
    } catch (error) {
        console.error('Error loading product count:', error)
        res.render('v1/index', {
            productCount: 0
        })
    }
})

router.get('/v1/products', v1productsController.index)
router.get('/v1/product/:id', v1productsController.show)
router.get('/v1/product/:id/categories', v1productsController.categories)

router.get('/v1/about', (req, res) => {
    res.render('v1/about/index')
})

router.get('/v1/categories', (req, res) => {
    // Load categories data
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Filter to only show the specified taxonomies
        const allowedTaxonomies = ['Group', 'Phase', 'Type', 'Channels']
        const filteredCategories = categoriesData.filter(category => 
            allowedTaxonomies.includes(category.Taxonomy)
        )
        
        // Group by taxonomy
        const groupedCategories = {}
        filteredCategories.forEach(category => {
            if (!groupedCategories[category.Taxonomy]) {
                groupedCategories[category.Taxonomy] = []
            }
            groupedCategories[category.Taxonomy].push(category)
        })
        
        res.render('v1/categories/index', {
            categories: groupedCategories
        })
    } catch (error) {
        console.error('Error loading categories:', error)
        res.render('v1/categories/index', {
            categories: {}
        })
    }
})

router.get('/v1/categories/category/:taxonomy', (req, res) => {
    // Load categories data for specific taxonomy
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Map URL slugs to taxonomy names
        const taxonomyMap = {
            'phase': 'Phase',
            'group': 'Group',
            'type': 'Type',
            'channels': 'Channels',
            'subgroup': 'SubGroup'
        }
        
        const taxonomyName = taxonomyMap[req.params.taxonomy]
        if (!taxonomyName) {
            return res.status(404).render('error', { 
                error: 'Taxonomy not found',
                message: 'The requested taxonomy does not exist.'
            })
        }
        
        // Filter categories for this taxonomy
        const taxonomyItems = categoriesData.filter(category => 
            category.Taxonomy === taxonomyName
        )
        
        // If this is a Group taxonomy, add subgroup counts
        if (taxonomyName === 'Group') {
            const allSubgroups = categoriesData.filter(category => 
                category.Taxonomy === 'SubGroup'
            )
            
            // Add subgroup count to each group
            taxonomyItems.forEach(group => {
                group.subgroupCount = allSubgroups.filter(subgroup => 
                    subgroup.Parent === group.Item
                ).length
            })
        }
        
        res.render('v1/categories/category/index', {
            taxonomy: taxonomyName,
            items: taxonomyItems
        })
    } catch (error) {
        console.error('Error loading taxonomy data:', error)
        res.status(500).render('error', { 
            error: 'Unable to load taxonomy data' 
        })
    }
})

// v1 subgroup page route
router.get('/v1/categories/group/:groupSlug/subgroups', (req, res) => {
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Find the group by slug
        const group = categoriesData.find(category => 
            category.Taxonomy === 'Group' && 
            (category.Slug === req.params.groupSlug || 
             category.Item.toLowerCase().replace(/\s+/g, '_') === req.params.groupSlug)
        )
        
        if (!group) {
            return res.status(404).render('error', { 
                error: 'Group not found',
                message: 'The requested group does not exist.'
            })
        }
        
        // Get subgroups for this specific group
        const subgroups = categoriesData.filter(category => 
            category.Taxonomy === 'SubGroup' && 
            category.Parent === group.Item
        )
        
        res.render('v1/categories/subgroups/index', {
            group: group,
            subgroups: subgroups
        })
    } catch (error) {
        console.error('Error loading subgroup data:', error)
        res.status(500).render('error', { 
            error: 'Unable to load subgroup data' 
        })
    }
})




// v-spk-assessments routes
router.get('/v-spk-assessments/', (req, res) => {
    // Get product count for homepage
    const fs = require('fs')
    const path = require('path')
    
    try {
        const dataPath = path.join(__dirname, 'data/fips.json')
        const data = fs.readFileSync(dataPath, 'utf8')
        const allProducts = JSON.parse(data)
        
        // Apply same filters as the products controller
        const excludedParents = [
            "End User Computing",
            "Corporate services", 
            "Shared IT core services",
            "zBusiness Operations (do not use)",
            "Voice and Data Network",
            "IT for the IT department"
        ]
        
        const filteredProducts = allProducts.filter(product => {
            if (excludedParents.includes(product.Parent)) return false
            if (product.Parent && product.Parent.includes("(PP)")) return false
            if (product['Operational Status'] === "New") return false
            return true
        })
        
        res.render('v-spk-assessments/index', {
            productCount: filteredProducts.length
        })
    } catch (error) {
        console.error('Error loading product count:', error)
        res.render('v-spk-assessments/index', {
            productCount: 0
        })
    }
})

router.get('/v-spk-assessments/products', vspkproductsController.index)
router.get('/v-spk-assessments/product/:id', vspkproductsController.show)
router.get('/v-spk-assessments/product/:id/categories', vspkproductsController.categories)

router.get('/v-spk-assessments/about', (req, res) => {
    res.render('v-spk-assessments/about/index')
})

router.get('/v-spk-assessments/categories', (req, res) => {
    // Load categories data
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Filter to only show the specified taxonomies
        const allowedTaxonomies = ['Group', 'Phase', 'Type', 'Channels']
        const filteredCategories = categoriesData.filter(category => 
            allowedTaxonomies.includes(category.Taxonomy)
        )
        
        // Group by taxonomy
        const groupedCategories = {}
        filteredCategories.forEach(category => {
            if (!groupedCategories[category.Taxonomy]) {
                groupedCategories[category.Taxonomy] = []
            }
            groupedCategories[category.Taxonomy].push(category)
        })
        
        res.render('v-spk-assessments/categories/index', {
            categories: groupedCategories
        })
    } catch (error) {
        console.error('Error loading categories:', error)
        res.render('v-spk-assessments/categories/index', {
            categories: {}
        })
    }
})

router.get('/v-spk-assessments/categories/category/:taxonomy', (req, res) => {
    // Load categories data for specific taxonomy
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Map URL slugs to taxonomy names
        const taxonomyMap = {
            'phase': 'Phase',
            'group': 'Group',
            'type': 'Type',
            'channels': 'Channels',
            'subgroup': 'SubGroup'
        }
        
        const taxonomyName = taxonomyMap[req.params.taxonomy]
        if (!taxonomyName) {
            return res.status(404).render('error', { 
                error: 'Taxonomy not found',
                message: 'The requested taxonomy does not exist.'
            })
        }
        
        // Filter categories for this taxonomy
        const taxonomyItems = categoriesData.filter(category => 
            category.Taxonomy === taxonomyName
        )
        
        // If this is a Group taxonomy, add subgroup counts
        if (taxonomyName === 'Group') {
            const allSubgroups = categoriesData.filter(category => 
                category.Taxonomy === 'SubGroup'
            )
            
            // Add subgroup count to each group
            taxonomyItems.forEach(group => {
                group.subgroupCount = allSubgroups.filter(subgroup => 
                    subgroup.Parent === group.Item
                ).length
            })
        }
        
        res.render('v-spk-assessments/categories/category/index', {
            taxonomy: taxonomyName,
            items: taxonomyItems
        })
    } catch (error) {
        console.error('Error loading taxonomy data:', error)
        res.status(500).render('error', { 
            error: 'Unable to load taxonomy data' 
        })
    }
})

// v-spk-assessments subgroup page route
router.get('/v-spk-assessments/categories/group/:groupSlug/subgroups', (req, res) => {
    const fs = require('fs')
    const path = require('path')
    
    try {
        const categoriesPath = path.join(__dirname, 'data/categories.json')
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))
        
        // Find the group by slug
        const group = categoriesData.find(category => 
            category.Taxonomy === 'Group' && 
            (category.Slug === req.params.groupSlug || 
             category.Item.toLowerCase().replace(/\s+/g, '_') === req.params.groupSlug)
        )
        
        if (!group) {
            return res.status(404).render('error', { 
                error: 'Group not found',
                message: 'The requested group does not exist.'
            })
        }
        
        // Get subgroups for this specific group
        const subgroups = categoriesData.filter(category => 
            category.Taxonomy === 'SubGroup' && 
            category.Parent === group.Item
        )
        
        res.render('v-spk-assessments/categories/subgroups/index', {
            group: group,
            subgroups: subgroups
        })
    } catch (error) {
        console.error('Error loading subgroup data:', error)
        res.status(500).render('error', { 
            error: 'Unable to load subgroup data' 
        })
    }
})








// Feedback submission route
router.post('/submit-feedback', (req, res) => {
    const { feedback_form_input: response } = req.body;
    
    const service = "FIPS";
    const pageURL = req.headers.referer || 'Unknown';

    console.log('Feedback received:', {
        feedback: response,
        page: pageURL,
        service: service
    })

    base('Feedback').create([{
        "fields": {
            "Feedback": response,
            "Service": service,
            "URL": pageURL,
        }
    }], function(err) {
        if (err) {
            console.error('Error saving to Airtable:', err);
            return res.status(500).json({ success: false, message: 'Error saving to Airtable' });
        }
        console.log('Feedback submitted to Airtable successfully');
        res.json({ success: true, message: 'Feedback submitted successfully' });
    });
})

// Add your routes here
