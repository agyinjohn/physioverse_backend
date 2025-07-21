// ...existing imports...
const roleRoutes = require("./routes/roleRoutes");
const billConfigRoutes = require("./routes/billConfigRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");

// ...existing middleware setup...

app.use("/api/roles", roleRoutes);
app.use("/api/bill-configs", billConfigRoutes);
app.use("/api/pharmacy", pharmacyRoutes);

// ...rest of existing code...
