//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

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

// Add your routes here
