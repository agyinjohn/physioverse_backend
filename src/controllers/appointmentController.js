const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");

exports.createAppointment = async (req, res) => {
  try {
    const {
      patient,
      therapist,
      dateTime,
      type,
      notes,
      duration = 60,
    } = req.body;

    // Verify patient exists
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Create appointment with specified therapist
    const appointment = await Appointment.create({
      patient,
      therapist,
      dateTime,
      type,
      notes,
      duration,
    });

    await appointment.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "therapist", select: "name email" },
    ]);

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

// exports.getAppointments = async (req, res) => {
//   try {
//     const {
//       search,
//       status,
//       startDate,
//       endDate,
//       therapist,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const query = {};

//     if (search) {
//       const patients = await Patient.find({
//         $or: [
//           { firstName: { $regex: search, $options: "i" } },
//           { lastName: { $regex: search, $options: "i" } },
//           { patientId: { $regex: search, $options: "i" } },
//         ],
//       });

//       const patientIds = patients.map((p) => p._id);
//       query.patient = { $in: patientIds };
//     }

//     if (status) {
//       query.status = status;
//     }

//     if (therapist) {
//       query.therapist = therapist;
//     }

//     if (startDate || endDate) {
//       query.dateTime = {};
//       if (startDate) query.dateTime.$gte = new Date(startDate);
//       if (endDate) query.dateTime.$lte = new Date(endDate);
//     }

//     const appointments = await Appointment.find(query)
//       .populate("patient", "firstName lastName patientId")
//       .populate("therapist", "name email")
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .sort({ dateTime: 1 });

//     const total = await Appointment.countDocuments(query);

//     res.json({
//       success: true,
//       data: appointments,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

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
      { path: "patient", select: "firstName lastName patientId" },
      { path: "therapist", select: "name email" },
    ]);

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
