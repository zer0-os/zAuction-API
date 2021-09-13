import * as env from "env-var";
import {
  MongoClient,
  MongoClientOptions,
  InsertOneResult,
  FindCursor,
  Filter,
  Document,
} from "mongodb";

const user = env.get("MONGO_USERNAME").required().asString();
const pass = env.get("MONGO_PASSWORD").required().asString();
const uri = env.get("MONGO_CLUSTER_URI").required().asString();
const db = env.get("MONGO_DB").required().asString();

const fullUri = `mongodb+srv://${user}:${pass}@${uri}/${db}`;

const options: MongoClientOptions = {
  connectTimeoutMS: 5000,
  retryWrites: true,
  w: "majority",
};

const client = new MongoClient(fullUri, options);

// Will create the collection if it does not already exist
export const insertOne = async <T>(
  data: T,
  db: string,
  collection: string
): Promise<InsertOneResult> => {
  try {
    await client.connect();
    const database = client.db(db);
    const usedCollection = database.collection(collection);

    const result: InsertOneResult<Document> = await usedCollection.insertOne(
      data
    );

    return result;
  } catch (err) {
    throw Error;
  } finally {
    await client.close();
  }
};

// Will be used in future logic for soft canceling a bid
// and having a bid expire with a countdown
// export const deleteOne = async (
//   data: Object,
//   db: string,
//   collection: string
// ) => {
//   console.log("TODO implement");
// };

// Note queries are case sensitive
export const find = async <T>(
  db: string,
  collection: string,
  query?: Filter<Document>
): Promise<T[]> => {
  try {
    await client.connect();

    const database = client.db(db);
    const usedCollection = database.collection(collection);

    if (query) {
      const cursor: FindCursor<Document> = await usedCollection.find<T>(query);
      const results: Document[] = await cursor.toArray();
      return results as T[];
    } else {
      const cursor: FindCursor<Document> = await usedCollection.find();
      const results: Document[] = await cursor.toArray();
      return results as T[];
    }
  } catch (err) {
    throw Error;
  } finally {
    await client.close();
  }
};
