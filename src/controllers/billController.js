const Bill = require("../models/Bill");

exports.createBill = async (req, res) => {
  try {
    const { patient, items, discount, notes } = req.body;

    // Check for existing pending bill from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingBill = await Bill.findOne({
      patient,
      status: "unpaid",
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    let bill;
    if (existingBill) {
      // Update existing bill
      existingBill.items = [...existingBill.items, ...items];
      existingBill.discount = discount;
      existingBill.notes = notes;

      // Recalculate totals
      existingBill.subtotal = existingBill.items.reduce(
        (sum, item) => sum + item.total,
        0
      );
      existingBill.total = existingBill.subtotal - existingBill.discount;

      bill = await existingBill.save();
    } else {
      // Generate bill number
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1)
        .toString()
        .padStart(2, "0");

      // Find the last bill number for the current year and month
      const lastBill = await Bill.findOne(
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

      const billNumber = `BILL-${currentYear}${currentMonth}-${sequence
        .toString()
        .padStart(4, "0")}`;

      // Create new bill with generated bill number
      bill = await Bill.create({
        patient,
        items,
        discount,
        notes,
        billNumber,
        createdBy: req.user._id,
      });
    }

    await bill.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "createdBy", select: "name" },
    ]);

    res.status(201).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBills = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = {};

    // Update status check to use exact value
    if (status) {
      query.status = status === "unpaid" ? "unpaid" : status;
    }

    // Update date filtering
    if (startDate && endDate) {
      // Set time to start of day for startDate and end of day for endDate
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    console.log("Query:", query); // Add logging for debugging

    const bills = await Bill.find(query)
      .populate([
        { path: "patient", select: "firstName lastName patientId" },
        { path: "createdBy", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: bills,
      meta: {
        total,
        page: parseInt(page),
        lastPage: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "createdBy", select: "name" },
    ]);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    res.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.cancelBill = async (req, res) => {
  try {
    const { reason } = req.body;
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    if (bill.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Bill is already cancelled",
      });
    }

    if (bill.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a paid bill",
      });
    }

    bill.status = "cancelled";
    bill.cancellation = {
      date: new Date(),
      reason,
      cancelledBy: req.user._id,
    };

    await bill.save();
    await bill.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "cancellation.cancelledBy", select: "name" },
    ]);

    res.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body;

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Initialize payments array if it doesn't exist
    if (!bill.payments) {
      bill.payments = [];
    }

    // Add the payment
    bill.payments.push(payment);

    // Calculate total payments
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);

    // Update bill status based on payment
    if (totalPaid >= bill.total) {
      bill.status = "paid";
    } else if (totalPaid > 0) {
      bill.status = "partially_paid";
    }

    await bill.save();

    // Populate required fields and return
    await bill.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "createdBy", select: "name" },
    ]);

    res.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
