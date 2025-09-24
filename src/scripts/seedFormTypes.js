const FormType = require("../models/FormType");

const formTypes = [
  {
    id: "initial-assessment",
    name: "Initial Assessment",
    description: "Basic initial patient assessment",
    category: "evaluation",
  },
  {
    id: "pelvic-floor",
    name: "Pelvic Floor Questionnaire",
    category: "evaluation",
  },
  // ...add other form types
];

const seedFormTypes = async () => {
  try {
    await FormType.deleteMany({});
    await FormType.insertMany(formTypes);
    console.log("Form types seeded successfully");
  } catch (error) {
    console.error("Error seeding form types:", error);
  }
};

module.exports = seedFormTypes;
