const mongoose = require("mongoose");

const formTypeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("FormType", formTypeSchema);
