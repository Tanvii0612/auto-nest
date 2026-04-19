/**
 * models/Order.js
 * Represents a service booking / order placed by a user.
 * Links a User to a Service, stores payment method and status.
 */

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    // Reference to the user who placed this order
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Reference to the booked service
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Service',
      // Optional — we also store a snapshot below for flexibility
    },

    // Snapshot of service details at time of booking
    // (so if service is deleted/edited later, order history is intact)
    serviceSnapshot: {
      product_id:   String,
      name:         String,
      category:     String,
      packageType:  String,
      duration:     String,
      price:        Number, // base price (₹)
    },

    quantity: {
      type:    Number,
      default: 1,
      min:     1,
    },

    // Pricing breakdown
    baseAmount: { type: Number, required: true },  // price × quantity
    taxAmount:  { type: Number, required: true },  // GST 18%
    totalAmount:{ type: Number, required: true },  // baseAmount + taxAmount

    // Payment method chosen by user
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'razorpay', 'cod', 'wallet', 'netbanking'],
      required: true,
    },

    // Overall order status
    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Payment status (separate from order status)
    paymentStatus: {
      type:    String,
      enum:    ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // Scheduling
    scheduledDate: { type: Date },
    scheduledSlot: { type: String }, // e.g. "10:00 AM - 11:00 AM"

    // Notes from user
    notes: { type: String, default: '' },

    // Reference to Payment document (populated after payment)
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Payment',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
