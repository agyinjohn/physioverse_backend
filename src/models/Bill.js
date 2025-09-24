const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    items: [
      {
        service: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        tax: {
          type: Number,
          default: 0,
        },
        discount: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: Number,
    discount: {
      type: Number,
      default: 0,
    },
    total: Number,
    status: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid", "cancelled"],
      default: "unpaid",
    },
    notes: String,
    cancellation: {
      date: Date,
      reason: String,
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        method: {
          type: String,
          enum: ["cash", "mobile_money", "card", "insurance"],
          required: true,
        },
        date: {
          type: Date,
          required: true,
        },
        insuranceDetails: {
          provider: String,
          policyNumber: String,
          coverage: Number,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate bill number
billSchema.pre("save", async function (next) {
  if (this.isNew) {
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0");

    // Find the last bill number for the current year and month
    const lastBill = await this.constructor.findOne(
      {
        billNumber: new RegExp(`^BILL-${currentYear}${currentMonth}-`),
      },
      {},
      { sort: { billNumber: -1 } }
    );

    let sequence = 1;
    if (lastBill) {
      const lastSequence = parseInt(lastBill.billNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    this.billNumber = `BILL-${currentYear}${currentMonth}-${sequence
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});

// Calculate totals before saving
billSchema.pre("save", function (next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.total = this.subtotal - (this.discount || 0);
  next();
});

module.exports = mongoose.model("Bill", billSchema);
