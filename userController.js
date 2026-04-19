/**
 * controllers/userController.js
 * Handles user profile read/update and saved services.
 */

const User  = require('../models/User');
const Order = require('../models/Order');

/**
 * @route   GET /api/users/profile
 * @desc    Get the logged-in user's profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedServices', 'name category price');
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user's name and phone
 * @access  Private
 * @body    { name, phone }
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password (requires current password)
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save(); // pre-save hook will hash the new password

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/users/bookings
 * @desc    Get all bookings / orders for the logged-in user
 * @access  Private
 */
const getMyBookings = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('service', 'name category price')
      .populate('payment', 'status razorpayPaymentId amount')
      .sort({ createdAt: -1 }); // newest first

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
 * @route   POST /api/users/save-service/:serviceId
 * @desc    Save / unsave a service as favourite
 * @access  Private
 */
const toggleSaveService = async (req, res) => {
  try {
    const user      = await User.findById(req.user._id);
    const serviceId = req.params.serviceId;

    const index = user.savedServices.indexOf(serviceId);

    if (index === -1) {
      // Not saved yet — add it
      user.savedServices.push(serviceId);
      await user.save();
      return res.status(200).json({ success: true, message: 'Service saved', saved: true });
    } else {
      // Already saved — remove it
      user.savedServices.splice(index, 1);
      await user.save();
      return res.status(200).json({ success: true, message: 'Service removed from saved', saved: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getMyBookings,
  toggleSaveService,
};
