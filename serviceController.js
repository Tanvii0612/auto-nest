/**
 * controllers/serviceController.js
 * CRUD operations for AutoNest services (car wash, EV, CNG, mechanics).
 * Public: GET routes (anyone can browse services)
 * Private/Admin: POST, PUT, DELETE (only admins can manage services)
 */

const Service = require('../models/Service');

/**
 * @route   GET /api/services
 * @desc    Get all services (with optional category filter)
 * @access  Public
 * @query   ?category=car-wash  (optional)
 */
const getAllServices = async (req, res) => {
  try {
    const filter = { isAvailable: true };

    // Filter by category if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const services = await Service.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/services/:id
 * @desc    Get a single service by ID
 * @access  Public
 */
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({ success: true, data: { service } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/services/category/:category
 * @desc    Get all services in a specific category
 * @access  Public
 */
const getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['car-wash', 'ev-charging', 'cng-booking', 'mechanics'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const services = await Service.find({ category, isAvailable: true });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/services
 * @desc    Create a new service
 * @access  Private / Admin only
 * @body    { name, description, category, packageType, price, duration }
 */
const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: { service } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/services/:id
 * @desc    Update a service
 * @access  Private / Admin only
 */
const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({ success: true, data: { service } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete a service (soft delete — marks unavailable)
 * @access  Private / Admin only
 */
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isAvailable: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.status(200).json({ success: true, message: 'Service removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  getServicesByCategory,
  createService,
  updateService,
  deleteService,
};
