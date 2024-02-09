import express from "express";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

import { baseUrl } from "../constants.js";

const app = express();
const port = process.env.PORT || 3080;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: baseUrl.client || process.env.CLIENT_URL,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

console.log("before connecting to mongodb");
const connectionString = process.env.MONGODB_URI;

const client = new MongoClient(connectionString);
await client.connect();
console.log("Connected to the MongoDB server");
// Access the database
const database = client.db("yakir_li");
// Access the collection
const PersonsCollection = database.collection("persons");
const CounterCollection = database.collection("counter");

app.get("/", cors(corsOptions), (req, res) => {
  res.send("Welcome to Yakir Li Candles Server");
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
    const { name, age, city } = req.body;
    // Insert the new person into the collection
    const result = await PersonsCollection.insertOne({
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

app.put("/persons/:personId", async (req, res) => {
  const { personId } = req.params;
  // add new users to users array in person (as user that lit the candle)
  try {
    const userId = req.cookies?.userId || uuidv4();
    const updatedPerson = await PersonsCollection.findOneAndUpdate(
      { _id: new ObjectId(personId) },
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
