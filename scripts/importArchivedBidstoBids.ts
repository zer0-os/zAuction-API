import * as env from "env-var";
import * as dotenv from "dotenv";
import * as mongodb from "mongodb";
import _ from 'lodash';
import { Bid } from "../src/types";
import { MongoClientOptions, Filter, Document } from "mongodb";
dotenv.config();

const user = env.get("MONGO_USERNAME").required().asString();
const pass = env.get("MONGO_PASSWORD").required().asString();
const uri = env.get("MONGO_CLUSTER_URI").required().asString();
const dbName = env.get("MONGO_DB").required().asString();
const collectionName = env.get("MONGO_COLLECTION").required().asString();
const archiveCollectionName = collectionName + "-archive";
const fullUri = `mongodb+srv://${user}:${pass}@${uri}/`;
const options: MongoClientOptions = {
  connectTimeoutMS: 5000,
  w: "majority",
};

const main = async () => {
  const client = new mongodb.MongoClient(fullUri, options);
  await client.connect();
  const database = client.db(dbName);
  const docCollection = database.collection(collectionName);
  const docArchiveCollection = database.collection(collectionName + "-archive");

  console.log(`Starting import from ${archiveCollectionName} into ${collectionName}`)
  console.log(`${ await documentCount(docCollection, {})} documents in collection ${collectionName}`)

  //Fetch archived bids, sort them by date descending
  let bidsCancelledArchived = await getFromCollection<Bid>(
    docArchiveCollection, 
    {},
    {date: -1}
    );
  //Filter out bids with duplicate signedMessage  
  bidsCancelledArchived = _.uniqBy(bidsCancelledArchived, 'signedMessage')
  //Insert records
  const result = await insertBids(docCollection, bidsCancelledArchived);
  console.log(`${result} records inserted.`)
  console.log(`${ await documentCount(docCollection, {})} documents in collection ${collectionName}`)
  client.close();
};
main();

async function getFromCollection<T>(
    collection: mongodb.Collection,
    filter: Filter<Document>,
    sort: mongodb.Sort
): Promise<T[]> {
  var result = await collection.find<T>(filter).sort(sort).toArray();
  console.log(
    `${result.length} items retrieved from DB collection ${collectionName}`
  );
  return result;
}

async function documentCount<T>(
    collection: mongodb.Collection,
    filter: Filter<Document>
  ): Promise<number> {
    return collection.countDocuments(filter);
}

async function insertBids(
    collection: mongodb.Collection,
    bids: Bid[]
): Promise<number>{
    let count = 0;
    for (let bid of bids) {
        if ((bid.cancelDate ?? 0) <= 1)
            bid.cancelDate = 1;
        if (await collection.countDocuments({ signedMessage: bid.signedMessage }) < 1) {
            collection.insertOne(bid);
            count++;
        } else {
            console.log(`Bid for signedMessage ${bid.signedMessage} already exists.`);
        }
    };
    return count;
}

