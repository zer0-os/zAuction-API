import * as env from "env-var";
import {
  MongoClient,
  MongoClientOptions,
} from "mongodb";
require("dotenv").config();

const user = env.get("MONGO_USERNAME").required().asString();
const pass = env.get("MONGO_PASSWORD").required().asString();
const uri = env.get("MONGO_CLUSTER_URI").required().asString();

const databaseName = "auctions";

// Update this collection to `bids` to take an actual effect,
// for now using a testing collection
const collection = "kovan-bids-archive";

const fullUri = `mongodb+srv://${user}:${pass}@${uri}/`;

const options: MongoClientOptions = {
  connectTimeoutMS: 5000,
  retryWrites: true,
  w: "majority",
};

async function main() {
  console.log(fullUri);

  try {
    const client = new MongoClient(fullUri, options);
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    // If you wish to confirm results or view domains before updating,
    // uncomment this code.
    // const domainsCursor = await usedCollection.find({});
    // const domains = await domainsCursor.toArray();

    const updateResult = await usedCollection.updateMany(
      {}, { $set: { expireBlock: "0" } }
    );
    console.log(updateResult.modifiedCount);
  } catch (e) {
    console.log(e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
