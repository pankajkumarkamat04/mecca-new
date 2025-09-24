const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

// Public list for now (can switch to auth if needed)
router.get('/', getCategories);

// Protected create
router.post('/', auth, createCategory);

// Protected update/delete
router.put('/:id', auth, updateCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;


