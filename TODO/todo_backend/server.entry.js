const mongoose = require("mongoose");
const app = require("./server");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(5000, () => console.log("Server listening on port: 5000"));
