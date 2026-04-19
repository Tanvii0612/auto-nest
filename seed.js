/**
 * seed.js
 * Populates the database with sample AutoNest services.
 * Run once: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Service  = require('./models/Service');
const User     = require('./models/User');

const SAMPLE_SERVICES = [
  // ── Car Wash ────────────────────────────────────────────────
  {
    name:        'Basic Wash',
    description: 'Exterior rinse and wipe-down. Quick and affordable.',
    category:    'car-wash',
    packageType: 'Basic',
    price:       149,
    duration:    '~20 min',
    rating:      4.2,
    distance:    '1.2 km',
  },
  {
    name:        'Premium Wash',
    description: 'Full exterior + interior vacuum + dashboard wipe.',
    category:    'car-wash',
    packageType: 'Premium',
    price:       399,
    duration:    '~50 min',
    rating:      4.8,
    distance:    '1.5 km',
  },
  {
    name:        'Deluxe Detailing',
    description: 'Complete detailing: clay bar, polish, wax, full interior.',
    category:    'car-wash',
    packageType: 'Deluxe',
    price:       799,
    duration:    '~2 hours',
    rating:      4.9,
    distance:    '2.0 km',
  },
  {
    name:        'Headlight Restoration',
    description: 'Restore foggy headlights to crystal clarity.',
    category:    'car-wash',
    packageType: 'Add-on',
    price:       199,
    duration:    '~30 min',
    rating:      4.5,
    distance:    '1.5 km',
  },
  {
    name:        'Ceramic Coating',
    description: 'Long-lasting nano-ceramic paint protection.',
    category:    'car-wash',
    packageType: 'Premium Add-on',
    price:       4999,
    duration:    '~4 hours',
    rating:      5.0,
    distance:    '2.0 km',
  },

  // ── EV Charging ─────────────────────────────────────────────
  {
    name:        'PowerGrid Fast Charge',
    description: 'DC fast charger — 50kW. Charges to 80% in ~40 min.',
    category:    'ev-charging',
    packageType: 'Fast Charge',
    price:       120,
    duration:    '~40 min',
    rating:      4.9,
    distance:    '1.2 km',
    details:     { chargerType: 'DC', power: '50kW', connectors: ['CCS2', 'CHAdeMO'] },
  },
  {
    name:        'EcoCharge Solar Station',
    description: 'AC slow charger powered by solar panels. Eco-friendly.',
    category:    'ev-charging',
    packageType: 'Slow Charge',
    price:       60,
    duration:    '~3 hours',
    rating:      4.6,
    distance:    '3.0 km',
    details:     { chargerType: 'AC', power: '7.2kW', connectors: ['Type 2'] },
  },

  // ── CNG Booking ─────────────────────────────────────────────
  {
    name:        'Morning CNG Slot',
    description: 'Book your CNG fill-up slot — no waiting in queue.',
    category:    'cng-booking',
    packageType: 'Morning (6 AM - 10 AM)',
    price:       50,   // slot booking fee
    duration:    '~15 min',
    rating:      4.4,
    distance:    '2.1 km',
    details:     { availableSlots: 5, station: 'City CNG Hub' },
  },
  {
    name:        'Evening CNG Slot',
    description: 'Evening slot — 4 PM to 8 PM.',
    category:    'cng-booking',
    packageType: 'Evening (4 PM - 8 PM)',
    price:       50,
    duration:    '~15 min',
    rating:      4.3,
    distance:    '2.1 km',
    details:     { availableSlots: 3, station: 'City CNG Hub' },
  },

  // ── Mechanics ───────────────────────────────────────────────
  {
    name:        'General Inspection',
    description: 'Full vehicle health check by a certified mechanic.',
    category:    'mechanics',
    packageType: 'Inspection',
    price:       299,
    duration:    '~1 hour',
    rating:      4.8,
    distance:    '0.8 km',
    details:     { mechanic: 'Ramesh Auto Workshop', experience: '10+ years' },
  },
  {
    name:        'Oil Change Service',
    description: 'Engine oil + filter replacement. Keeps your engine healthy.',
    category:    'mechanics',
    packageType: 'Maintenance',
    price:       499,
    duration:    '~45 min',
    rating:      4.7,
    distance:    '1.1 km',
    details:     { mechanic: 'Patel Motors', oilType: 'Synthetic / Semi-synthetic' },
  },
  {
    name:        'Tyre Rotation & Balancing',
    description: 'Rotate and balance all 4 tyres for even wear.',
    category:    'mechanics',
    packageType: 'Tyre Service',
    price:       349,
    duration:    '~45 min',
    rating:      4.6,
    distance:    '0.8 km',
  },
  {
    name:        'AC Service & Regas',
    description: 'Full AC check, cleaning, and refrigerant top-up.',
    category:    'mechanics',
    packageType: 'AC Service',
    price:       799,
    duration:    '~1.5 hours',
    rating:      4.5,
    distance:    '1.5 km',
  },
];

// ── Admin user to seed ────────────────────────────────────────
const ADMIN_USER = {
  name:     'AutoNest Admin',
  email:    'admin@autonest.in',
  phone:    '9000000000',
  password: 'Admin@123456',   // Change this immediately after seeding!
  role:     'admin',
};

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Service.deleteMany({});
    console.log('🗑️  Cleared existing services');

    // Insert services
    const created = await Service.insertMany(SAMPLE_SERVICES);
    console.log(`✅ Seeded ${created.length} services`);

    // Create admin user if not exists
    const existingAdmin = await User.findOne({ email: ADMIN_USER.email });
    if (!existingAdmin) {
      await User.create(ADMIN_USER);
      console.log(`✅ Admin user created: ${ADMIN_USER.email}`);
      console.log(`   Password: ${ADMIN_USER.password}  ← CHANGE THIS!`);
    } else {
      console.log('ℹ️  Admin user already exists — skipping');
    }

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seedDB();
