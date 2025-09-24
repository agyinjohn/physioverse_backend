const Medicine = require("../models/Medicine");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");

exports.createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMedicines = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { genericName: { $regex: search, $options: "i" } },
      ];
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: medicines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateMedicineStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    medicine.stock += parseInt(quantity);

    // Don't allow negative stock
    if (medicine.stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot reduce stock below 0",
      });
    }

    await medicine.save();

    res.json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      message: "Medicine deleted successfully",
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
    const { patient, medicines, ...rest } = req.body;

    // Calculate amounts for each medicine
    const prescriptionMedicines = await Promise.all(
      medicines.map(async (item) => ({
        ...item,
        amount: item.quantity * (await Medicine.findById(item.medicine)).price,
      }))
    );

    const prescription = await Prescription.create({
      patient,
      medicines: prescriptionMedicines,
      prescribedBy: req.user._id,
      ...rest,
    });

    // Add prescription to patient's records
    await Patient.findByIdAndUpdate(patient, {
      $push: { prescriptions: prescription._id },
    });

    // Add to patient's bill if not already added
    if (!prescription.billAdded) {
      const totalAmount = prescriptionMedicines.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      await Patient.findByIdAndUpdate(patient, {
        $push: {
          bills: {
            amount: totalAmount,
            description: `Prescription #${prescription._id}`,
            date: new Date(),
            status: "pending",
          },
        },
      });

      prescription.billAdded = true;
      await prescription.save();
    }

    await prescription.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "prescribedBy", select: "name" },
      { path: "medicines.medicine", select: "name price" },
    ]);

    res.status(201).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const { patient } = req.query;
    const query = {};

    if (patient) {
      query.patient = patient;
    }

    const prescriptions = await Prescription.find(query)
      .populate([
        { path: "patient", select: "firstName lastName patientId" },
        { path: "prescribedBy", select: "name email" }, // Update selection fields
        { path: "medicines.medicine", select: "name price" },
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

exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "prescribedBy", select: "name email" },
      { path: "medicines.medicine", select: "name price" },
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
    const { id } = req.params;
    const { status } = req.body;

    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check if payment is required for dispensing
    if (status === "dispensed" && !prescription.billAdded) {
      return res.status(400).json({
        success: false,
        message: "Cannot dispense unpaid prescription",
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

// Add other necessary controller methods...
