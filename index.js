import express from "express";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3080;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

console.log("Trying to connect to Mongo DB...");
const connectionString = process.env.MONGODB_URI;
const client = new MongoClient(connectionString);
await client.connect();
console.log("Successfully connect to Mongo DB!");
// Access the database
const database = client.db("yakir_li");
// Access the collections
const PersonsCollection = database.collection("persons");
const CounterCollection = database.collection("counter");

app.get("/", cors(corsOptions), (req, res) => {
  res.send("Welcome to Yakir Li Candles' Server :)");
});

app.get("/user", cors(corsOptions), (req, res) => {
  const userId = req.cookies?.userId || uuidv4();
  res.cookie("userId", userId).send({ id: userId });
});

app.get("/persons", cors(corsOptions), async (req, res) => {
  try {
    const persons = await PersonsCollection.find().sort({ _id: -1 }).toArray();
    res.status(200).json({ Persons: persons });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
  return;
});

app.get("/counterLitCandles", cors(corsOptions), async (req, res) => {
  try {
    const counterLitCandles = await CounterCollection.findOne({
      name: "counts lit candles",
    });
    res.status(200).json({ counterLitCandles: counterLitCandles.counter });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
  return;
});

app.post("/persons", async (req, res) => {
  try {
    const { name, age, city, id } = req.body;
    const result = await PersonsCollection.insertOne({
      id,
      name,
      age,
      city,
      users: [],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/persons/:personId&:userId", async (req, res) => {
  const { personId, userId } = req.params;
  // add new user to users array in person (as user that lit the candle)
  try {
    const updatedPerson = await PersonsCollection.findOneAndUpdate(
      { id: personId },
      { $push: { users: userId } },
      {
        returnDocument: "after",
      }
    );
    // increament the counter of litted candles
    const updatedCounter = await CounterCollection.findOneAndUpdate(
      { name: "counts lit candles" },
      { $inc: { counter: 1 } },
      { returnDocument: "after" }
    );
    res.json({
      updatedPerson: updatedPerson,
      updatedCounter: updatedCounter.counter,
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
