/**
 * models/Service.js
 * Represents a bookable service on AutoNest.
 * Categories: car-wash | ev-charging | cng-booking | mechanics
 */

const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Service name is required'],
      trim:     true,
    },
    description: {
      type:  String,
      default: '',
    },
    // Which section does this service belong to?
    category: {
      type:     String,
      required: true,
      enum:     ['car-wash', 'ev-charging', 'cng-booking', 'mechanics'],
    },
    // e.g. "Basic Wash", "Premium Wash", "Fast Charge"
    packageType: {
      type:  String,
      default: 'Standard',
    },
    // Price in Indian Rupees (₹)
    price: {
      type:     Number,
      required: [true, 'Price is required'],
      min:      0,
    },
    duration: {
      type:  String, // e.g. "~30 min", "1 hour"
      default: 'Varies',
    },
    // Rating out of 5
    rating: {
      type:    Number,
      default: 4.5,
      min: 0, max: 5,
    },
    // Distance from city center (in km) — display only
    distance: {
      type:  String,
      default: 'Nashik',
    },
    isAvailable: {
      type:    Boolean,
      default: true,
    },
    // Additional details specific to each category
    details: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
