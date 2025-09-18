const Patient = require("../models/Patient");
const Assessment = require("../models/Assessment");
const FormType = require("../models/FormType");
const mongoose = require("mongoose");

// Generate patient ID
const generatePatientId = async () => {
  const prefix = "LPW";
  const latestPatient = await Patient.findOne().sort({ createdAt: -1 });
  const lastNumber = latestPatient
    ? parseInt(latestPatient.patientId.slice(3))
    : 0;
  const newNumber = (lastNumber + 1).toString().padStart(3, "0");
  return `${prefix}${newNumber}`;
};

exports.createPatient = async (req, res) => {
  try {
    const patientId = await generatePatientId();

    // Validate emergency contact
    if (req.body.emergencyContact) {
      const { relationship } = req.body.emergencyContact;
      if (
        relationship &&
        !["parent", "spouse", "child", "sibling", "friend", "other"].includes(
          relationship
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid emergency contact relationship",
        });
      }
    }

    // Validate admission status
    if (
      req.body.admissionStatus &&
      !["discharged", "detained", "active"].includes(req.body.admissionStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission status",
      });
    }

    // Validate bills if provided
    if (req.body.bills) {
      const invalidBills = req.body.bills.some(
        (bill) => !["paid", "pending", "overdue"].includes(bill.status)
      );
      if (invalidBills) {
        return res.status(400).json({
          success: false,
          message: "Invalid bill status",
        });
      }
    }

    // Create patient with OPD registration initialized
    const patient = await Patient.create({
      ...req.body,
      patientId,
      assignedTherapist: req.user._id,
      admissionStatus: req.body.admissionStatus || "active",
      profileImage: req.body.profileImage || "/default-avatar.png",
      opdRegistration: {
        date: new Date(),
        status: "pending",
      },
    });

    // Create initial assessment if immediateAssessment is required
    if (req.body.immediateAssessment?.required) {
      await Assessment.create({
        patient: patient._id,
        patientId: patient.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        name: req.body.immediateAssessment.issue,
        status: "pending",
        responses: {},
      });
    }

    res.status(201).json({
      success: true,
      data: patient,
      message: "Patient created successfully and registered for OPD",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Error creating patient",
    });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      // Update search query to include phone number
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const patients = await Patient.find(query)
      .populate("assignedTherapist", "name email")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate(
      "assignedTherapist",
      "name email"
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatientDetails = async (req, res) => {
  console.log("heeeyyy");
  try {
    const patient = await Patient.findById(req.params.id)
      .populate("assignedTherapist", "name email")
      .populate({
        path: "appointments",
        select: "dateTime type status",
        options: { sort: { dateTime: -1 }, limit: 5 },
      })
      .populate({
        path: "assessments",
        select: "formType status createdAt",
        options: { sort: { createdAt: -1 }, limit: 5 },
      })
      .select("+bills"); // Explicitly include bills in the response

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatientByPatientId = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const updates = { ...req.body };
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Handle vitals history and OPD status update
      if (updates.vitals) {
        updates.$push = {
          vitalsHistory: {
            ...updates.vitals,
            recordedAt: new Date(),
          },
        };

        // Update OPD registration status
        updates["opdRegistration.status"] = "vitals_recorded";

        // Create initial assessment
        const patient = await Patient.findById(req.params.id);

        await Assessment.create({
          patient: req.params.id,
          patientId: patient.patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          status: "pending",
          responses: new Map(),
          createdAt: new Date(),
        });
      }

      const patient = await Patient.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
        session,
      });

      if (!patient) {
        throw new Error("Patient not found");
      }

      res.json({
        success: true,
        data: patient,
      });
    });

    await session.endSession();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getActivePatients = async (req, res) => {
  console.log("Heeeeeerrrrrr");
  try {
    const patients = await Patient.find({ status: "active" })
      .select("_id patientId firstName lastName status")
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateBillStatus = async (req, res) => {
  try {
    const { patientId, billId, status } = req.body;

    if (!["paid", "pending", "overdue"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill status",
      });
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, "bills._id": billId },
      { $set: { "bills.$.status": status } },
      { new: true }
    ).select("bills");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient or bill not found",
      });
    }

    res.json({
      success: true,
      data: patient.bills,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { patient, items, date } = req.body;

    const newBills = items.map((item) => ({
      amount: item.amount,
      description: item.description,
      date: new Date(date),
      status: "pending",
    }));

    const updatedPatient = await Patient.findByIdAndUpdate(
      patient,
      {
        $push: { bills: { $each: newBills } },
      },
      { new: true }
    ).select("bills");

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: updatedPatient.bills,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.registerForOPD = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // if (patient.vitals) {
    //   // console.log(patient.vitals);
    //   // console.log(patient);
    //   return res.status(400).json({
    //     success: false,
    //     message: "Patient already has vitals recorded",
    //   });
    // }

    // Add OPD registration date
    patient.opdRegistration = {
      date: new Date(),
      status: "pending",
    };

    await patient.save();

    res.json({
      success: true,
      message: "Patient registered for OPD successfully",
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error registering patient for OPD",
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `patients/${req.params.patientId}/documents`,
    });

    const document = {
      name: req.body.title,
      url: result.secure_url,
      type: req.body.type,
      notes: req.body.notes,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    const patient = await Patient.findByIdAndUpdate(
      req.params.patientId,
      { $push: { documents: document } },
      { new: true }
    ).populate({
      path: "documents.uploadedBy",
      select: "name",
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient.documents[patient.documents.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error uploading document",
    });
  }
};

exports.getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId)
      .select("documents")
      .populate({
        path: "documents.uploadedBy",
        select: "name",
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient.documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { patientId, documentId } = req.params;

    // Find document to get cloudinary public ID
    const patient = await Patient.findById(patientId);
    const document = patient.documents.id(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete from cloudinary
    const publicId = document.url.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(publicId);

    // Remove document from patient
    await Patient.findByIdAndUpdate(patientId, {
      $pull: { documents: { _id: documentId } },
    });

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatientAssessments = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).populate("assessment");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const assessment = patient.assessment ? [patient.assessment] : [];

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
