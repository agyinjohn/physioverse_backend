const Assessment = require("../models/Assessment");
const Patient = require("../models/Patient");
const FormType = require("../models/FormType");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");

// Create new assessment
exports.createAssessment = async (req, res) => {
  try {
    const { patient, formTypes = [], responses = {}, ...otherData } = req.body;

    // Check if patient already has an assessment
    const existingAssessment = await Patient.findById(patient).select(
      "assessment"
    );
    if (existingAssessment.assessment) {
      return res.status(400).json({
        success: false,
        message: "Patient already has an assessment",
      });
    }

    // Verify patient exists
    const patientDoc = await Patient.findById(patient);
    if (!patientDoc) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Directly create assessment with embedded form types
    const assessment = await Assessment.create({
      ...otherData,
      patient,
      name: otherData.name || "General Assessment", // Default name if none provided
      formTypes: formTypes.map((id) => ({
        id,
        name: getFormName(id), // You'll need to implement this helper function
      })),
      responses: new Map(Object.entries(responses)),
      therapist: req.user._id,
      patientName: `${patientDoc.firstName} ${patientDoc.lastName}`,
      patientId: patientDoc.patientId,
      subjective: otherData.subjective || "",
      objective: otherData.objective || "",
      diagnosis: otherData.diagnosis || "",
      prognosis: otherData.prognosis || "",
      treatmentPlan: otherData.treatmentPlan || "",
      treatment: otherData.treatment || "",
    });

    // Update patient with assessment reference
    await Patient.findByIdAndUpdate(patient, { assessment: assessment._id });

    res.status(201).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to get form name from ID
const getFormName = (formId) => {
  const formTypes = {
    "pelvic-floor": "Pelvic Floor Questionnaire",
    "two-minute-walk": "2 Minute Walk Test",
    oswestry: "Oswestry Low Back Pain Assessment",
    // Add other form types here
  };
  return formTypes[formId] || formId;
};

// Get all assessments with filters and pagination
exports.getAssessments = async (req, res) => {
  try {
    const { search, status, formType, page = 1, limit = 10, date } = req.query;
    let query = {};

    // Get start and end of the specified date
    const startDate = date ? new Date(date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    // Get appointments with assessments for the date range
    const appointments = await Appointment.find({
      dateTime: { $gte: startDate, $lt: endDate },
    }).populate("assessment");

    // Extract assessment IDs from appointments
    const appointmentAssessmentIds = appointments
      .filter((apt) => apt.assessment)
      .map((apt) => apt.assessment._id);

    // Query for assessments either:
    // 1. Linked to today's appointments OR
    // 2. Created today
    query.$or = [
      { _id: { $in: appointmentAssessmentIds } },
      { createdAt: { $gte: startDate, $lt: endDate } },
    ];

    // Add other filters
    if (search) {
      query.$and = [
        {
          $or: [
            { patientName: { $regex: search, $options: "i" } },
            { patientId: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    if (status) query.status = status;
    if (formType) query.formType = formType;

    const assessments = await Assessment.find(query)
      .populate({
        path: "patient",
        select: "firstName lastName patientId opdRegistration vitals",
      })
      .populate("therapist", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Assessment.countDocuments(query);

    res.json({
      success: true,
      data: assessments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Assessment fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single assessment
exports.getAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate({
        path: "patient",
        select: "firstName lastName patientId vitals vitalsHistory",
      })
      .populate("therapist", "name email")
      .populate("formTypes");

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Include patient's vitals in the assessment response
    if (assessment.patient?.vitals) {
      assessment.vitals = assessment.patient.vitals;
    }

    // Transform formTypes to include id for frontend mapping
    if (assessment.formTypes) {
      assessment.formTypes = assessment.formTypes.map((ft) => ({
        ...ft.toObject(),
        id: ft.id || ft._id,
      }));
    }

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

// Update assessment
exports.updateAssessment = async (req, res) => {
  try {
    const { formTypes = [], responses = {}, ...otherUpdates } = req.body;

    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Create update object
    const updateData = {
      ...otherUpdates,
    };

    // Handle formTypes if provided
    if (formTypes.length > 0) {
      updateData.formTypes = formTypes.map((id) => ({
        id,
        name: getFormName(id),
      }));
    }

    // Handle responses if provided
    if (Object.keys(responses).length > 0) {
      // Get existing responses
      const existingResponses = assessment.responses || {};

      // Merge responses
      updateData.responses = {
        ...existingResponses,
        ...Object.keys(responses).reduce((acc, formType) => {
          acc[formType] = responses[formType];
          return acc;
        }, {}),
      };
    }

    const updated = await Assessment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle assessment status
exports.toggleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const assessment = await Assessment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

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

// Toggle clinic presence
exports.toggleClinicPresence = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    assessment.isInClinic = !assessment.isInClinic;
    await assessment.save();

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

// Delete assessment
exports.deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    res.json({
      success: true,
      message: "Assessment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateVitals = async (req, res) => {
  try {
    const { patientId, vitals } = req.body;

    const patient = await Patient.findByIdAndUpdate(
      patientId,
      {
        $set: { vitals },
        $push: {
          vitalsHistory: {
            ...vitals,
            recordedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        vitals: patient.vitals,
        vitalsHistory: patient.vitalsHistory,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get patient assessments
exports.getPatientAssessments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const assessments = await Assessment.find({ patient: patientId })
      .populate({
        path: "patient",
        select: "firstName lastName patientId",
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
