const BillConfig = require("../models/BillConfig");

exports.createBillConfig = async (req, res) => {
  try {
    const billConfig = await BillConfig.create(req.body);
    res.status(201).json({
      success: true,
      data: billConfig,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getActiveBillConfigs = async (req, res) => {
  try {
    const configs = await BillConfig.find({ isActive: true }).sort({
      category: 1,
      name: 1,
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateBillConfig = async (req, res) => {
  try {
    const billConfig = await BillConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      data: billConfig,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
