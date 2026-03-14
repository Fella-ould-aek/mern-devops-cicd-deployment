const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("./server");
const TodoModel = require("./models/Todo");

let mongoServer;

//  connect to the GitLab CI MongoDB service 
beforeAll(async () => {
  const uri = 'mongodb://mongo:27017/todo_test';
  await mongoose.connect(uri);
});

// Cleanup: clear DB between tests
afterEach(async () => {
  await TodoModel.deleteMany({});
});

//  Teardown: disconnect after all tests
afterAll(async () => {
  await mongoose.disconnect();
});

// POST /add
// ───────────────────────────────────────────────────────
describe("POST /add", () => {
  it("should create a new todo and return it", async () => {
    const res = await request(app).post("/add").send({ task: "Buy groceries" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.task).toBe("Buy groceries");
    expect(res.body.done).toBe(false);
  });

  it("should store the todo in the database", async () => {
    await request(app).post("/add").send({ task: "Learn Docker" });

    const todos = await TodoModel.find();
    expect(todos).toHaveLength(1);
    expect(todos[0].task).toBe("Learn Docker");
  });
});

// ───────────────────────────────────────────────────────
// GET /get
// ───────────────────────────────────────────────────────
describe("GET /get", () => {
  it("should return empty array when no todos exist", async () => {
    const res = await request(app).get("/get");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return all todos", async () => {
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
// PUT /edit/:id  (mark as done)
// ───────────────────────────────────────────────────────
describe("PUT /edit/:id", () => {
  it("should mark a todo as done", async () => {
    const todo = await TodoModel.create({ task: "Exercise", done: false });

    const res = await request(app).put(`/edit/${todo._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it("should return null for non-existent id", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).put(`/edit/${fakeId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });
});

// ───────────────────────────────────────────────────────
// PUT /update/:id  (edit task text)
// ───────────────────────────────────────────────────────
describe("PUT /update/:id", () => {
  it("should update the task text", async () => {
    const todo = await TodoModel.create({ task: "Old task" });

    await request(app).put(`/update/${todo._id}`).send({ task: "New task" });

    // Verify directly in DB (findByIdAndUpdate without {new:true} returns old doc)
    const updated = await TodoModel.findById(todo._id);
    expect(updated.task).toBe("New task");
  });
});

// ───────────────────────────────────────────────────────
// DELETE /delete/:id
// ───────────────────────────────────────────────────────
describe("DELETE /delete/:id", () => {
  it("should delete a todo", async () => {
    const todo = await TodoModel.create({ task: "Delete me" });

    const res = await request(app).delete(`/delete/${todo._id}`);

    expect(res.statusCode).toBe(200);

    const found = await TodoModel.findById(todo._id);
    expect(found).toBeNull();
  });

  it("should return null when deleting non-existent todo", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).delete(`/delete/${fakeId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });
});
