const Document = require("../models/Document");
const Patient = require("../models/Patient");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");
const path = require("path");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const patientId = req.params.patientId;

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Upload each file to cloudinary
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `patients/${patientId}/documents`,
          resource_type: "auto",
        });

        // Clean up local file
        if (fs.existsSync(file.path)) {
          await unlinkFile(file.path);
        }

        return {
          url: result.secure_url,
          filename: file.originalname,
        };
      })
    );

    const document = await Document.create({
      patient: patientId,
      name: req.body.name,
      files: uploadedFiles,
      type: req.body.type,
      notes: req.body.notes,
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
    console.error("Upload error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error uploading document",
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

exports.getPatientDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ patient: req.params.patientId })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
