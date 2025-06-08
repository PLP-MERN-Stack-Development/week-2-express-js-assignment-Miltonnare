require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { products } = require('./Products');
const { NotFoundError, ValidationError, AppError } = require('./error');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  const token = req.headers['authorization'];
  const expectedToken = `Bearer ${process.env.AUTH_TOKEN}`;
  
  if (!token || token !== expectedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API!');
});

// GET all products
app.get('/api/products', async (req, res, next) => {
  try {
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET a product by ID
app.get('/api/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST a new product
app.post('/api/products', async (req, res, next) => {
  try {
    const { name, description, price, category, inStock } = req.body;

    if (!name || !description || !price || !category || typeof inStock !== 'boolean') {
      throw new ValidationError('All fields are required and inStock must be boolean');
    }

    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

    const newProduct = {
      id: newId,
      name,
      description,
      price,
      category,
      inStock
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
});

// PUT update a product
app.put('/api/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const { name, description, price, category, inStock } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (inStock !== undefined) product.inStock = inStock;

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE a product
app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      throw new NotFoundError('Product not found');
    }

    const deleted = products.splice(index, 1);
    res.json({ message: 'Product deleted', product: deleted[0] });
  } catch (err) {
    next(err);
  }
});
// GET all products with  category filtering
app.get('/api/products', async (req, res, next) => {
  try {
    const { category } = req.query;

    let result = products;

    if (category) {
      result = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});
// GET all products with pagination only
app.get('/api/products', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ message: 'Invalid pagination parameters' });
    }

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedProducts = products.slice(startIndex, endIndex);

    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / limitNum);

    res.json({
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      data: paginatedProducts
    });
  } catch (err) {
    next(err);
  }
});
// Search products by name (case-insensitive)
app.get('/api/products/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    const searchTerm = q.toLowerCase();

    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm)
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
});
// Get product count by category
app.get('/api/products/stats', (req, res, next) => {
  try {
    const stats = products.reduce((acc, product) => {
      const category = product.category.toLowerCase();
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    res.json(stats);
  } catch (err) {
    next(err);
  }
});





// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
