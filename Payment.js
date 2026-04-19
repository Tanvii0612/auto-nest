/**
 * models/Payment.js
 * Stores Razorpay payment details and verification status.
 * Linked 1:1 with an Order.
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    // The order this payment belongs to
    order: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Order',
      required: true,
    },

    // The user who made the payment
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Payment method used
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'razorpay', 'cod', 'wallet', 'netbanking'],
      required: true,
    },

    // Amount actually paid (in ₹ — stored as rupees, not paise)
    amount: {
      type:     Number,
      required: true,
    },

    currency: {
      type:    String,
      default: 'INR',
    },

    // ── Razorpay-specific fields ──────────────────────────────
    // Razorpay order ID (e.g. order_XXXXXXXXXX)
    razorpayOrderId: {
      type:  String,
      default: null,
    },

    // Razorpay payment ID returned after successful payment
    razorpayPaymentId: {
      type:  String,
      default: null,
    },

    // Razorpay signature — stored for audit trail
    razorpaySignature: {
      type:  String,
      default: null,
    },

    // Whether we verified the signature on our backend (HMAC check)
    isVerified: {
      type:    Boolean,
      default: false,
    },

    // Payment status
    status: {
      type:    String,
      enum:    ['created', 'paid', 'failed', 'refunded', 'cod_pending'],
      default: 'created',
    },

    // For COD orders, track when payment was collected
    codCollectedAt: {
      type: Date,
      default: null,
    },

    // Raw response from Razorpay (for debugging / records)
    gatewayResponse: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Failure reason if payment failed
    failureReason: {
      type:  String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
