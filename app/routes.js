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
const productsController = require('./controllers/products')

// Products routes
router.get('/products', productsController.index)
router.get('/product/:id', productsController.show)
router.get('/product/:id/categories', productsController.categories)

// About page route
router.get('/about', (req, res) => {
    res.render('about/index')
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
