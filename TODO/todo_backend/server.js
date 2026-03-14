const express = require("express");
const cors = require("cors");
const TodoModel = require("./models/Todo");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/add", (req, res) => {
  const { task } = req.body;
  TodoModel.create({ task })
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get("/get", (req, res) => {
  TodoModel.find()
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.put("/edit/:id", (req, res) => {
  const { id } = req.params;
  TodoModel.findByIdAndUpdate(id, { done: true }, { new: true })
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.put("/update/:id", (req, res) => {
  const { id } = req.params;
  const { task } = req.body;
  TodoModel.findByIdAndUpdate(id, { task: task })
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.delete("/delete/:id", (req, res) => {
  const { id } = req.params;
  TodoModel.findByIdAndDelete({ _id: id })
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err.message }));
});

module.exports = app;