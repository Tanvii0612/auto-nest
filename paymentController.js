/**
 * controllers/paymentController.js
 *
 * ═══════════════════════════════════════════════════════════════
 *  RAZORPAY PAYMENT FLOW (3 steps):
 *
 *  Step 1 — Frontend calls POST /api/payments/create-razorpay-order
 *            Backend creates an order on Razorpay servers
 *            Returns razorpay_order_id + amount + key_id to frontend
 *
 *  Step 2 — Frontend opens Razorpay checkout popup with those details
 *            User pays (UPI / Card / Net Banking / Wallet)
 *            Razorpay calls the handler() callback on success with:
 *              - razorpay_order_id
 *              - razorpay_payment_id
 *              - razorpay_signature
 *
 *  Step 3 — Frontend calls POST /api/payments/verify
 *            Backend verifies the HMAC signature (THIS IS CRITICAL FOR SECURITY)
 *            If valid → mark order as paid
 *            If invalid → reject (someone tried to fake a payment)
 * ═══════════════════════════════════════════════════════════════
 */

const crypto   = require('crypto');   // built-in Node.js module for HMAC
const razorpay = require('../config/razorpay');
const Payment  = require('../models/Payment');
const Order    = require('../models/Order');

/**
 * @route   POST /api/payments/create-razorpay-order
 * @desc    Step 1 — Create a Razorpay order on their servers
 * @access  Private
 * @body    { order_id }  ← our internal MongoDB Order _id
 */
const createRazorpayOrder = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    // Fetch our internal order
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Security: ensure this user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    // ── Create Razorpay order ──────────────────────────────────
    // Amount MUST be in paise (₹1 = 100 paise)
    const amountInPaise = Math.round(order.totalAmount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  `receipt_${order._id}`,   // your internal reference
      notes: {
        order_id:     order._id.toString(),
        user_id:      req.user._id.toString(),
        service_name: order.serviceSnapshot?.name || 'AutoNest Service',
      },
    });

    // Save the Razorpay order ID to our Payment document
    const payment = await Payment.create({
      order:             order._id,
      user:              req.user._id,
      paymentMethod:     order.paymentMethod,
      amount:            order.totalAmount,
      currency:          'INR',
      razorpayOrderId:   razorpayOrder.id,
      status:            'created',
    });

    // Link payment to order
    order.payment = payment._id;
    await order.save();

    // Return details to frontend so it can open the Razorpay popup
    res.status(200).json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrder.id,   // e.g. "order_XXXXXXXXXX"
        amount:            razorpayOrder.amount, // in paise
        currency:          razorpayOrder.currency,
        key_id:            process.env.RAZORPAY_KEY_ID, // public key — safe to send
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/payments/verify
 * @desc    Step 3 — Verify Razorpay payment signature (SECURITY CRITICAL)
 * @access  Private
 * @body    { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }
 *
 * How verification works:
 *   Razorpay signs the payment using HMAC-SHA256:
 *   signature = HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret_key)
 *   We compute the same hash and compare — if they match, payment is genuine.
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,           // our internal MongoDB Order _id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
      });
    }

    // ── HMAC Signature Verification ───────────────────────────
    // Build the expected signature
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      // Someone tampered with the payment — mark as failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', failureReason: 'Signature verification failed' }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature',
      });
    }

    // ── Signature is valid — update Payment and Order ─────────
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        isVerified:        true,
        status:            'paid',
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Update the order status
    await Order.findByIdAndUpdate(order_id, {
      paymentStatus: 'paid',
      status:        'confirmed',
    });

    res.status(200).json({
      success:    true,
      message:    'Payment verified successfully ✅',
      data: {
        payment_id: razorpay_payment_id,
        order_id,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/payments/cod
 * @desc    Confirm a Cash on Delivery / Pay Later order
 * @access  Private
 * @body    { order_id }
 */
const confirmCOD = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Create a COD payment record
    const payment = await Payment.create({
      order:         order._id,
      user:          req.user._id,
      paymentMethod: 'cod',
      amount:        order.totalAmount,
      status:        'cod_pending', // payment is pending until service completion
    });

    // Update order
    order.payment       = payment._id;
    order.paymentStatus = 'pending'; // stays pending until service done
    order.status        = 'confirmed'; // order is confirmed though
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order confirmed! Pay when the service is completed.',
      data: { order_id: order._id, status: order.status },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Get payment details for a specific order
 * @access  Private
 */
const getPaymentByOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const payment = await Payment.findOne({ order: req.params.orderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    res.status(200).json({ success: true, data: { payment } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/payments/webhook
 * @desc    Razorpay webhook — auto-handles payment events server-side
 * @access  Public (verified by webhook signature)
 *
 * Set this URL in your Razorpay Dashboard → Settings → Webhooks
 * Events to subscribe: payment.captured, payment.failed, order.paid
 */
const handleWebhook = async (req, res) => {
  try {
    const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSignature = req.headers['x-razorpay-signature'];

    // Verify webhook authenticity
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body) // raw body (Buffer)
      .digest('hex');

    if (expectedSignature !== receivedSignature) {
      console.warn('⚠️ Invalid webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Parse the raw body
    const event = JSON.parse(req.body.toString());
    const { event: eventType, payload } = event;

    console.log(`📨 Razorpay Webhook received: ${eventType}`);

    if (eventType === 'payment.captured') {
      const razorpayPaymentId = payload.payment.entity.id;
      const razorpayOrderId   = payload.payment.entity.order_id;

      // Update payment and order in DB
      const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { razorpayPaymentId, status: 'paid', isVerified: true },
        { new: true }
      );

      if (payment) {
        await Order.findByIdAndUpdate(payment.order, {
          paymentStatus: 'paid',
          status:        'confirmed',
        });
        console.log(`✅ Payment captured via webhook: ${razorpayPaymentId}`);
      }
    }

    if (eventType === 'payment.failed') {
      const razorpayOrderId = payload.payment.entity.order_id;
      const reason          = payload.payment.entity.error_description;

      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: 'failed', failureReason: reason }
      );

      const payment = await Payment.findOne({ razorpayOrderId });
      if (payment) {
        await Order.findByIdAndUpdate(payment.order, { paymentStatus: 'failed' });
      }

      console.log(`❌ Payment failed via webhook: ${reason}`);
    }

    // Always respond 200 to Razorpay so they stop retrying
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  confirmCOD,
  getPaymentByOrder,
  handleWebhook,
};
