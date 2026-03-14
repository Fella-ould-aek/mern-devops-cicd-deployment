const request = require("supertest");
const mongoose = require("mongoose");
const app = require("./server");
const TodoModel = require("./models/Todo");

beforeAll(async () => {
  const uri = "mongodb://mongo:27017/todo_test";
  await mongoose.connect(uri);
});

afterEach(async () => {
  await TodoModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

// ───────────────────────────────────────────────────────
describe("POST /add - Create a new todo", () => {
  it("should receive a task and return it with an id and done=false", async () => {
    const res = await request(app).post("/add").send({ task: "Buy groceries" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.task).toBe("Buy groceries");
    expect(res.body.done).toBe(false);
  });

  it("should save the received task to the database", async () => {
    await request(app).post("/add").send({ task: "Learn Docker" });

    const todos = await TodoModel.find();
    expect(todos).toHaveLength(1);
    expect(todos[0].task).toBe("Learn Docker");
  });
});

// ───────────────────────────────────────────────────────
describe("GET /get - Retrieve all todos", () => {
  it("should return an empty list when no tasks exist", async () => {
    const res = await request(app).get("/get");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return all tasks stored in the database", async () => {
    await TodoModel.create({ task: "Task 1" });
    await TodoModel.create({ task: "Task 2" });

    const res = await request(app).get("/get");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].task).toBe("Task 1");
    expect(res.body[1].task).toBe("Task 2");
  });
});

// ───────────────────────────────────────────────────────
describe("PUT /edit/:id - Mark a task as done", () => {
  it("should mark the task as done when a valid id is provided", async () => {
    const todo = await TodoModel.create({ task: "Exercise", done: false });

    const res = await request(app).put(`/edit/${todo._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it("should return null when the task id does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).put(`/edit/${fakeId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });
});

// ───────────────────────────────────────────────────────
describe("PUT /update/:id - Edit a task text", () => {
  it("should update the task text when a valid id and new text are provided", async () => {
    const todo = await TodoModel.create({ task: "Old task" });

    await request(app).put(`/update/${todo._id}`).send({ task: "New task" });

    const updated = await TodoModel.findById(todo._id);
    expect(updated.task).toBe("New task");
  });
});

// ───────────────────────────────────────────────────────
describe("DELETE /delete/:id - Remove a task", () => {
  it("should delete the task from the database when a valid id is given", async () => {
    const todo = await TodoModel.create({ task: "Delete me" });

    const res = await request(app).delete(`/delete/${todo._id}`);

    expect(res.statusCode).toBe(200);

    const found = await TodoModel.findById(todo._id);
    expect(found).toBeNull();
  });

  it("should return null when trying to delete a non-existent task", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).delete(`/delete/${fakeId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });
});
