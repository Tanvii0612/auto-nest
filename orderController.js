/**
 * controllers/orderController.js
 * Handles order creation and retrieval.
 * An order is created BEFORE payment — it captures what the user wants to buy.
 * Payment updates the order status after Razorpay verification.
 */

const Order   = require('../models/Order');
const Service = require('../models/Service');

// GST rate (18%)
const GST_RATE = 0.18;

/**
 * @route   POST /api/orders
 * @desc    Create a new order (before payment)
 * @access  Private
 * @body    { product_id, quantity, payment_method, scheduled_date, scheduled_slot, notes }
 *
 * This is called by the frontend's OrderAPI.create() in checkout.html
 * The frontend passes product_id, name, price, category via URL params.
 * We accept them directly in the body for flexibility.
 */
const createOrder = async (req, res) => {
  try {
    const {
      product_id,     // Service MongoDB _id (optional if using snapshot)
      name,           // Service name (from URL param)
      category,       // e.g. 'car-wash'
      price,          // base price in ₹
      duration,
      quantity        = 1,
      payment_method,
      scheduled_date,
      scheduled_slot,
      notes,
    } = req.body;

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: 'payment_method is required (upi, card, razorpay, cod)',
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required',
      });
    }

    // Calculate amounts
    const baseAmount  = parseFloat(price) * parseInt(quantity);
    const taxAmount   = parseFloat((baseAmount * GST_RATE).toFixed(2));
    const totalAmount = parseFloat((baseAmount + taxAmount).toFixed(2));

    // Try to find the service in DB if product_id provided
    let serviceRef = null;
    if (product_id && product_id.match(/^[0-9a-fA-F]{24}$/)) {
      serviceRef = product_id;
    }

    // Build the order
    const order = await Order.create({
      user:          req.user._id,
      service:       serviceRef,
      serviceSnapshot: {
        product_id,
        name:     name || 'Service Booking',
        category: category || 'general',
        duration: duration || 'Varies',
        price:    parseFloat(price),
      },
      quantity,
      baseAmount,
      taxAmount,
      totalAmount,
      paymentMethod: payment_method,
      status:        'pending',
      paymentStatus: 'pending',
      scheduledDate: scheduled_date ? new Date(scheduled_date) : null,
      scheduledSlot: scheduled_slot || null,
      notes:         notes || '',
    });

    res.status(201).json({
      success: true,
      data: {
        order_id:    order._id,   // frontend uses this as "orderId"
        totalAmount: order.totalAmount,
        status:      order.status,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/orders
 * @desc    Get all orders for the logged-in user
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/orders/:id
 * @desc    Get a single order by ID
 * @access  Private (only the owner can view their order)
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('payment');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Security: ensure the order belongs to the requesting user (unless admin)
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel an order (only if pending or confirmed)
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status: ${order.status}`,
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled', data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (admin only)
 * @access  Private / Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
};
