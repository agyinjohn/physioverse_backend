const Document = require("../models/Document");
const Patient = require("../models/Patient");
const cloudinary = require("../utils/cloudinary");

exports.uploadDocument = async (req, res) => {
  try {
    // Check if patient exists
    const patient = await Patient.findById(req.body.patient);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Upload file to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `patients/${patient._id}/documents`,
      resource_type: "auto",
    });

    const document = await Document.create({
      ...req.body,
      fileUrl: result.secure_url,
      fileType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
    });

    await document.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "uploadedBy", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { patientId, type, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (patientId) {
      query.patient = patientId;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const documents = await Document.find(query)
      .populate("patient", "firstName lastName patientId")
      .populate("uploadedBy", "name email")
      .populate("assessment")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: documents,
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

exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate("patient", "firstName lastName patientId")
      .populate("uploadedBy", "name email")
      .populate("assessment");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    await document.populate([
      { path: "patient", select: "firstName lastName patientId" },
      { path: "uploadedBy", select: "name email" },
    ]);

    res.json({
      success: true,
      data: document,
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
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from cloudinary if it exists
    if (document.fileUrl) {
      const publicId = document.fileUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await document.remove();

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
