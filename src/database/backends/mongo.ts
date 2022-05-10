import * as env from "env-var";
import {
  MongoClient,
  MongoClientOptions,
  InsertOneResult,
  FindCursor,
  Filter,
  Document,
  InsertManyResult,
  DeleteResult,
  UpdateResult,
} from "mongodb";

const user = env.get("MONGO_USERNAME").required().asString();
const pass = env.get("MONGO_PASSWORD").required().asString();
const uri = env.get("MONGO_CLUSTER_URI").required().asString();

const fullUri = `mongodb+srv://${user}:${pass}@${uri}/`;

const options: MongoClientOptions = {
  connectTimeoutMS: 5000,
  retryWrites: true,
  w: "majority",
};

// Will create the collection if it does not already exist
export const insertOne = async <T>(
  data: T,
  databaseName: string,
  collection: string
): Promise<InsertOneResult> => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    const result: InsertOneResult<Document> = await usedCollection.insertOne(
      data
    );

    return result;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};

export const insertMany = async <T>(
  data: Array<T>,
  databaseName: string,
  collection: string
): Promise<InsertManyResult> => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    const result: InsertManyResult<Document> = await usedCollection.insertMany(
      data
    );
    return result;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};

// Will be used in future logic for soft canceling a bid
// and having a bid expire with a countdown
export const deleteOne = async (
  databaseName: string,
  collection: string,
  query: Filter<Document>
) => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    const result: DeleteResult = await usedCollection.deleteOne(query);
    return result.acknowledged;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};

// Will update a document with the given set of data, using the given query filter
export const updateOne = async <T>(
  data: T,
  databaseName: string,
  collection: string,
  query: Filter<Document>
): Promise<UpdateResult> => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    const result: UpdateResult = await usedCollection.updateOne(
      query,
      data
    );
    console.log(
      `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
    );
    
    return result;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};

// Note queries are case sensitive
export const find = async <T>(
  databaseName: string,
  collection: string,
  query?: Filter<Document>
): Promise<T[]> => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
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
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};

export const findOne = async <T>(
  databaseName: string,
  collection: string,
  query: Filter<Document>
): Promise<T | null> => {
  const client = new MongoClient(fullUri, options);

  try {
    await client.connect();
    const database = client.db(databaseName);
    const usedCollection = database.collection(collection);

    const result: T | null = await usedCollection.findOne<T>(query);
    return result;
  } catch (error) {
    throw error;
  } finally {
    await client.close();
  }
};
