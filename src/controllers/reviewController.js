const Review = require("../models/Review");
const Patient = require("../models/Patient");
const Assessment = require("../models/Assessment");

exports.createReview = async (req, res) => {
  try {
    const { patient: patientId, ...reviewData } = req.body;

    // Find the patient's pending assessment
    const assessment = await Assessment.findOne({
      patientId: patientId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (!assessment) {
      return res.status(400).json({
        success: false,
        message: "No pending assessment found for this patient",
      });
    }

    const review = await Review.create({
      ...reviewData,
      assessment: assessment._id,
      patient: assessment.patient,
      therapist: req.user._id,
    });

    await review.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "therapist", select: "name email" },
      { path: "assessment", select: "createdAt status" },
    ]);

    // Update assessment status and reviewScheduled flag
    await Assessment.findByIdAndUpdate(assessment._id, {
      status: "review_scheduled",
      reviewScheduled: true,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { search, status, date, page = 1, limit = 10 } = req.query;
    const query = {};

    // If date is provided, filter for that specific date
    // Otherwise, filter for today's reviews
    if (date) {
      const requestedDate = new Date(date);
      requestedDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(requestedDate);
      nextDate.setDate(requestedDate.getDate() + 1);

      query.date = {
        $gte: requestedDate,
        $lt: nextDate,
      };
    } else {
      // Default to today's reviews
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      query.date = {
        $gte: today,
        $lt: tomorrow,
      };
    }

    // Add other existing filters
    if (search) {
      const patientIds = await Patient.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { patientId: { $regex: search, $options: "i" } },
        ],
      }).distinct("_id");

      query.$or = [
        { patient: { $in: patientIds } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const reviews = await Review.find(query)
      .populate("patient", "firstName lastName patientId")
      .populate("therapist", "name email")
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ date: -1 });

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("patient", "firstName lastName patientId")
      .populate("therapist", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await review.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "therapist", select: "name email" },
    ]);

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAssessmentsPendingReview = async (req, res) => {
  try {
    const pendingAssessments = await Assessment.find({
      status: "pending",
    })
      .populate("patient", "firstName lastName patientId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingAssessments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.activateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate("patient");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Update review status
    review.status = "isInOPD";
    await review.save();

    // Update patient OPD registration status
    await Patient.findByIdAndUpdate(review.patient._id, {
      "opdRegistration.status": "pending",
    });

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add helper to check if assessment can be activated
exports.canActivateAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    const canActivate = assessment.reviewScheduled;
    res.json({
      success: true,
      canActivate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
