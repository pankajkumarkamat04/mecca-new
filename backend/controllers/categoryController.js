const Category = require('../models/Category');

// GET /api/categories
// Optional query: search, isActive
exports.getCategories = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;

    const filter = {};
    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true' || isActive === true;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// POST /api/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parent, color, icon, sortOrder, isActive } = req.body;

    const category = await Category.create({
      name,
      description,
      parent: parent || null,
      color,
      icon,
      sortOrder,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parent, color, icon, sortOrder, isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(parent !== undefined && { parent: parent || null }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};


