const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Assessment = require("../models/Assessment");
const {
  sendAppointmentConfirmation,
  sendAppointmentUpdate,
} = require("../utils/emailService");

exports.createAppointment = async (req, res) => {
  try {
    const {
      patient,
      therapist,
      dateTime,
      type,
      notes,
      duration = 60,
      guestInfo,
      isNewPatient,
      assessmentId,
      medicalIssue,
    } = req.body;

    let appointmentData = {
      therapist,
      dateTime,
      type,
      notes,
      duration,
      isNewPatient,
    };

    // Handle registered vs unregistered patients
    if (patient) {
      appointmentData.patient = patient;

      // If assessment ID provided, verify and link it
      if (assessmentId) {
        const existingAssessment = await Assessment.findById(assessmentId);
        if (existingAssessment) {
          appointmentData.assessment = assessmentId;
        }
      }
      // Create new assessment if medical issue provided
      else if (medicalIssue) {
        const patientDoc = await Patient.findById(patient);
        const assessment = await Assessment.create({
          patient,
          name: medicalIssue,
          patientId: patientDoc.patientId,
          patientName: `${patientDoc.firstName} ${patientDoc.lastName}`,
          status: "pending",
          responses: {},
        });
        appointmentData.assessment = assessment._id;
      }
    } else {
      // Handle unregistered patient
      appointmentData.guestInfo = {
        ...guestInfo,
        issue: medicalIssue,
      };
    }

    const appointment = await Appointment.create(appointmentData);

    await appointment.populate([
      { path: "patient", select: "firstName lastName patientId email" },
      { path: "therapist", select: "name email" },
      { path: "assessment", select: "name status" },
    ]);

    // Send confirmation emails
    try {
      // Send to patient if email exists
      if (appointment.patient && appointment.patient.email) {
        await sendAppointmentConfirmation(
          appointment.patient.email,
          `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointment
        );
      }

      // Send to therapist
      await sendAppointmentConfirmation(
        appointment.therapist.email,
        appointment.therapist.name,
        appointment
      );
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const {
      search,
      status,
      therapist,
      date, // New query param: format should be YYYY-MM-DD
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Handle search for patients
    if (search) {
      const patients = await Patient.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { patientId: { $regex: search, $options: "i" } },
        ],
      });

      const patientIds = patients.map((p) => p._id);
      query.patient = { $in: patientIds };
    }

    // Filter by appointment status
    if (status) {
      query.status = status;
    }

    // Filter by therapist
    if (therapist) {
      query.therapist = therapist;
    }

    // Default to today's date if no `date` is provided
    const targetDate = date ? new Date(date) : new Date();

    // Start and end of the day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    query.dateTime = { $gte: startOfDay, $lte: endOfDay };

    const appointments = await Appointment.find(query)
      .populate("patient", "firstName lastName patientId")
      .populate("therapist", "name email")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ dateTime: 1 });

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: appointments,
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

exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "firstName lastName patientId")
      .populate("therapist", "name email");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    await appointment.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "therapist", select: "name email" },
    ]);

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const appointments = await Appointment.find({ patient: patientId })
      .populate("therapist", "name email")
      .sort({ dateTime: -1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["scheduled", "completed", "cancelled", "no-show"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate([
      { path: "patient", select: "firstName lastName patientId email" },
      { path: "therapist", select: "name email" },
    ]);

    // Send update emails
    try {
      // Send to patient if email exists
      if (appointment.patient.email) {
        await sendAppointmentUpdate(
          appointment.patient.email,
          `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointment,
          status.charAt(0).toUpperCase() + status.slice(1)
        );
      }

      // Send to therapist
      await sendAppointmentUpdate(
        appointment.therapist.email,
        appointment.therapist.name,
        appointment,
        status.charAt(0).toUpperCase() + status.slice(1)
      );
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
      // Continue with the response even if email fails
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
