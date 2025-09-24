const Device = require("../models/Device");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const Bill = require("../models/Bill");

exports.createDevice = async (req, res) => {
  try {
    const device = await Device.create(req.body);
    res.status(201).json({
      success: true,
      data: device,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const devices = await Device.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createPrescription = async (req, res) => {
  try {
    const { patient, devices, diagnosis } = req.body;

    // Calculate amounts for each device and get device details
    const prescriptionDevices = await Promise.all(
      devices.map(async (item) => {
        const device = await Device.findById(item.device);
        if (!device) {
          throw new Error(`Device not found with id: ${item.device}`);
        }
        return {
          ...item,
          device: device._id, // Ensure we have the device ID
          amount: item.quantity * device.price,
          deviceDetails: device, // Store full device details for bill creation
        };
      })
    );

    const prescription = await Prescription.create({
      patient,
      devices: prescriptionDevices.map(({ deviceDetails, ...item }) => item), // Remove temporary deviceDetails
      prescribedBy: req.user._id,
      diagnosis,
      status: "pending",
    });

    // Create bill items with proper price information
    const billItems = prescriptionDevices.map((item) => ({
      service: `Device Rental: ${item.deviceDetails.name}`,
      quantity: item.quantity,
      price: item.deviceDetails.price, // Use the actual device price
      total: item.amount,
      tax: 0,
      discount: 0,
    }));

    // Create the bill
    const bill = await Bill.create({
      billNumber: await generateBillNumber(), // You can keep your existing bill number generation
      patient,
      items: billItems,
      discount: 0,
      notes: `Automatic bill for device prescription #${prescription._id}`,
      createdBy: req.user._id,
    });

    // Update prescription with bill reference
    prescription.billAdded = true;
    await prescription.save();

    // Populate necessary fields
    await prescription.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "prescribedBy", select: "name" },
      { path: "devices.device", select: "name price category" },
    ]);

    res.status(201).json({
      success: true,
      data: prescription,
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        total: bill.total,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to generate bill number
async function generateBillNumber() {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const lastBill = await Bill.findOne(
    {
      billNumber: new RegExp(`^BILL-${currentYear}${currentMonth}-`),
    },
    {},
    { sort: { billNumber: -1 } }
  );

  const sequence = lastBill
    ? parseInt(lastBill.billNumber.split("-")[2]) + 1
    : 1;

  return `BILL-${currentYear}${currentMonth}-${sequence
    .toString()
    .padStart(4, "0")}`;
}

exports.getDevicePrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate([
        { path: "patient", select: "firstName lastName patientId" },
        { path: "prescribedBy", select: "name email" },
        { path: "devices.device", select: "name price" },
      ])
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDevicePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "prescribedBy", select: "name email" },
      { path: "devices.device", select: "name price category" },
    ]);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePrescriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    prescription.status = status;
    await prescription.save();

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ...other necessary controller methods with updated device logic
