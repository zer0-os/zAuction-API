const express = require("express");
const fleek = require("@fleekhq/fleek-storage-js");
const rateLimit = require("express-rate-limit");
const ethers = require("ethers");
//const abi = require("./abi.json");

const router = express.Router();

// Ethers/Infura
const infuraUrl = process.env.INFURA_URL;
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);
const signer = provider.getSigner();
const contractAddress = process.env.CONTRACT_ADDRESS;

//const contract = new ethers.Contract(contractAddress, abi, signer);

// User will receive a 429 error for being rate limited
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // limit each IP to 50 requests per windowMs
});

// Use .env.example as a basis for a .env file with the correct fleek credentials
const secrets = {
  apiKey: process.env.FLEEK_API_KEY,
  apiSecret: process.env.FLEEK_API_SECRET,
  infuraSecret: process.env.INFURA_API_SECRET,
};

// Function to check null and empty auction creation fields
function checkNullCreateFields(...args) {
  let createFields = [
    "account",
    "tokenID",
    "contractAddress",
    "startTime",
    "endTime",
    "minBid",
    "auctionType",
  ];
  for (let i = 0; i < args.length; i++) {
    if (args[i] == null || !/\S/.test(args[i])) {
      return { data: createFields[i], value: false };
    }
  }
  return { data: null, value: true };
}

// Function to check null and empty bid request fields
function checkNullBidFields(...args) {
  let bidFields = ["account", "bidAmt", "bidMsg"];
  for (let i = 0; i < args.length; i++) {
    if (args[i] == null || !/\S/.test(args[i])) {
      return { data: bidFields[i], value: false };
    }
  }
  return { data: null, value: true };
}

// Returns a list of auctions
router.get("/auctions", async (req, res, next) => {
  try {
    // pull list of files in bucket from fleek
    await fleek
      .listFiles({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        getOptions: ["key"],
      })
      .then((file) => res.send(file));
  } catch (error) {
    next(error);
  }
});

/* Creates a new auction
router.post("/auction", async (req, res, next) => {
  try {
    // check null and empty request fields
    let result = checkNullCreateFields(
      req.body.account,
      req.body.tokenID,
      req.body.contractAddress,
      req.body.startTime,
      req.body.endTime,
      req.body.minBid,
      req.body.auctionType
    );
    if (result["value"] == false) {
      return res.status(400).send({ message: result["data"] + " not found" });
    }

    // is this correct?
    //try {
    //  await storageContract.estimateGas.someFunction();
    //} catch (err) {
    //  return res.status(400).send({"message": "invalid auction"});
    //}

    // compile data from fields
    const data = {
      account: req.body.account,
      tokenID: req.body.tokenID,
      contractAddress: req.body.contractAddress,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      minBid: req.body.minBid,
      auctionType: req.body.auctionType,
      currentBidder: "",
      currentBid: 0,
    };

    // upload to fleek
    await fleek
      .upload({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: auctionId,
        data: JSON.stringify(data),
      })
      .then(() => res.status(200).send({ message: "Ok" }));
  } catch (error) {
    next(error);
  }
});*/

// Creates a new bid for an auction
router.post("/auctions/:auctionID/bid", async (req, res, next) => {
  try {
    let result = checkNullBidFields(
      req.body.account, // account of the bidder
      req.body.tokenID,
      req.body.contractAddress,
      req.body.bidAmt,
      req.body.bidMsg // signed msg
    );
    if (result["value"] == false) {
      return res.status(400).send({ message: result["data"] + " not found" });
    }
    // generate auctionId
    let idString = req.body.contractAddress + req.body.tokenID
    let idStringBytes = ethers.utils.toUtf8Bytes(idString)
    let auctionId = ethers.utils.keccak256(idStringBytes);
    //console.log("New auctionId is", auctionId);
    // pull auction from fleek
    await fleek
      .get({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: auctionId,
      })
      .then(async (auction) => {
        // then parse data & add currentBidder and currentBid
        if (auction.data) {
          let oldAuction = JSON.parse(auction.data);
          const data = {
            account: oldAuction.account,
            tokenID: oldAuction.tokenID,
            contractAddress: oldAuction.contractAddress,
            currentBidder: req.body.account,
            currentBid: req.body.bidAmt,
            bidMsg: req.body.bidMsg,
          };
          // delete the old auction
          await fleek
            .deleteFile({
              apiKey: secrets.apiKey,
              apiSecret: secrets.apiSecret,
              key: auctionID,
            })
            .then(async () => {
              // and upload new auction under the same name (key)
              await fleek
                .upload({
                  apiKey: secrets.apiKey,
                  apiSecret: secrets.apiSecret,
                  key: auctionID,
                  data: JSON.stringify(data),
                })
                .then(() => res.status(200).send({ message: "Ok" }));
            });
        } else {
          const data = {
            account: req.body.account,
            tokenID: req.body.tokenID,
            contractAddress: req.body.contractAddress,
            currentBidder: req.body.account,
            currentBid: req.body.bidMsg,
          };
          await fleek
                .upload({
                  apiKey: secrets.apiKey,
                  apiSecret: secrets.apiSecret,
                  key: auctionID,
                  data: JSON.stringify(data),
                })
                .then(() => res.status(200).send({ message: "Ok" }));
        }
      });
  } catch (error) {
    next(error);
  }
});

// Endpoint returns a specific auction, given an auction id
router.get("/auctions/:auctionID", limiter, async (req, res, next) => {
  try {
    if (req.params.auctionID == null || !/\S/.test(req.params.auctionID)) {
      return res.send({
        status: "false",
        message: "Please provide an auction id",
      });
    }
    // get file with key from fleek
    await fleek
      .get({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: req.params.auctionID,
      })
      .then((file) => {
        //console.log(JSON.parse(file.data))
        res.send(JSON.parse(file.data));
      });
  } catch (error) {
    next(error);
  }
});

// Endpoint to return bids, given an auction id
router.get("/auctions/:auctionID/bids", limiter, async (req, res, next) => {
  try {
    if (req.params.auctionID == null || !/\S/.test(req.params.auctionID)) {
      return res.send({
        status: "false",
        message: "Please provide an auction id",
      });
    }
    // get file with key from fleek
    await fleek
      .get({
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        key: req.params.auctionID,
      })
      .then((file) => {
        // parse file and return only bids
        auction = JSON.parse(file.data);
        console.log(auction);
        bids = {
          currentBidder: auction.currentBidder,
          currentBid: auction.currentBid,
          currentBidder: auction.currentBidder,
        };
        res.json(bids);
      });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
