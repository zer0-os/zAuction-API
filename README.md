# About

REST proxy for zAuction

# Includes

- [AJV](https://www.npmjs.com/package/ajv)
  - The fastest JSON validator for Node.js and browser.
- [dotenv](https://www.npmjs.com/package/dotenv)
  - Dotenv is a zero-dependency module that loads environment variables from a `.env` file into `process.env`
- [eslint](https://www.npmjs.com/package/eslint)
  - ESLint is a tool for identifying and reporting on patterns found in ECMAScript/JavaScript code.
- [helmet](https://www.npmjs.com/package/helmet)
  - Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
- [mocha](https://www.npmjs.com/package/mocha)
  - ☕️ Simple, flexible, fun JavaScript test framework for Node.js & The Browser ☕️
- [morgan](https://www.npmjs.com/package/morgan)
  - HTTP request logger middleware for node.js
- [nodemon](https://www.npmjs.com/package/nodemon)
  - nodemon is a tool that helps develop node.js based applications by automatically restarting the node application when file changes in the directory are detected.
- [prettier](https://www.npmjs.com/package/prettier)
  - Prettier is an opinionated code formatter.
- [supertest](https://www.npmjs.com/package/supertest)
  - HTTP assertions made easy via superagent.

## Setup

```
npm install
```

## Development

```
npm run start
```

## Build

```
npm run build
```

## Test

```
npm run test
```

## Cleanup

```
npx prettier --write .
```

# API Documentation

## **Create a new auction**

Creates a new auction.

- **URL**

  /api/auction

- **Method:**

  `POST`

- **URL Params**

  None

- **Data Params**

  **Required:**

  `account=[string]`  
   `tokenID=[string]`  
   `contractAddress=[string]`  
   `startTime=[number]`  
   `endTime=[number]`  
   `minBid=[number]`  
   `auctionType=[number]`

- **Success Response:**

  - **Code:** 200 Ok<br />
    **Content:**  
    `{ "message", "Ok"}`

- **Error Response:**

  - **Code:** 400 Bad Request<br />
    **Content:**  
    `{ "message", "{param} not found"}`

- **Sample Call:**

  ```javascript
  $.ajax({
    url: "/api/auction",
    dataType: "json",
    type: "POST",
    data: {
      account: "0xC83507FB1cc907d67BbA67D620c591275af18A62",
      tokenID: "55525",
      contractAddress: "0x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d",
      startTime: 0,
      endTime: 0,
      minBid: 0.1,
    },
    success: function (r) {
      console.log(r);
    },
  });
  ```

---

## **Get details on an auction**

Returns details about an auction.

- **URL**

  /api/auctions/{auctionID}

- **Method:**

  `GET`

- **URL Params**

  **Required:**

  `auctionID=[string]`

- **Data Params**

  None

- **Success Response:**

  - **Code:** 200 Ok<br />
    **Content:**  
    `{ "account": "0x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d", "auctionType": "0", "bidMsg": "0x4f03254c5da5b3acdc970cfd6f68e8d054beee4bcc291fd005061914bf14335c6ba72c9a5ab80d8ce27092edf6a9d911046dfdb4f24697447e62a524f962873c1c", "contractAddress": "0x6EbeAf8e8E946F0716E6533A6f2cefc83f60e8Ab", "currentBid": 0.1, "currentBidder": "0xC83507FB1cc907d67BbA67D620c591275af18A62", "endTime": "0", "minBid": "0.1", "startTime": "0", "tokenID": "376718" }`

- **Error Response:**

  - **Code:** 500 Internal Server Error <br />
    **Content:**  
    `{ "message": "The specified key does not exist." }`

- **Sample Call:**

  ```javascript
  $.ajax({
    url: "/api/auctions/16197345900x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d",
    dataType: "json",
    type: "GET",
    success: function (r) {
      console.log(r);
    },
  });
  ```

---

## **Bid on an auction**

Creates a bid for a given auction.

- **URL**

  /api/auctions/{auctionID}/bid

- **Method:**

  `POST`

- **URL Params**

  **Required:**

  `auctionID=[string]`

- **Data Params**

  **Required:**

  `account=[string]`  
   `bidAmt=[number]`  
   `bidMsg=[string]`

- **Success Response:**

  - **Code:** 200 Ok<br />
    **Content:**  
    `{ "message", "Ok"}`

- **Error Response:**

  - **Code:** 400 Bad Request<br />
    **Content:**  
    `{ "message", "{param} not found"}`

- **Sample Call:**

  ```javascript
  $.ajax({
    url: "/api/auctions/16209571250x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d/bid",
    dataType: "json",
    type: "POST",
    data: {
      account: "0x722e8bC37781B758E215c2F1180d9f437Fe91736",
      bidAmt: 0.3,
      bidMsg: "Signed Message",
    },
    success: function (r) {
      console.log(r);
    },
  });
  ```

---

## **Get the current bids for an auction**

Returns the current bids for a given auction.

- **URL**

  /api/auctions/{auctionID}/bids

- **Method:**

  `GET`

- **URL Params**

  **Required:**

  `auctionID=[string]`

- **Data Params**

  None

- **Success Response:**

  - **Code:** 200 Ok<br />
    **Content:**  
    `{ "currentBid": 0.1, "currentBidder": "0xC83507FB1cc907d67BbA67D620c591275af18A62" }`

- **Error Response:**

  - **Code:** 500 Internal Server Error <br />
    **Content:**  
    `{ "message": "The specified key does not exist." }`

- **Sample Call:**

  ```javascript
  $.ajax({
    url: "/api/auctions/16197345900x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d/bids",
    dataType: "json",
    type: "GET",
    success: function (r) {
      console.log(r);
    },
  });
  ```

  ***

  **Get a list of all auctions**

---

Returns a list of all auction IDs (referred to as keys).

- **URL**

  /api/auctions

- **Method:**

  `GET`

- **URL Params**

  None

- **Data Params**

  None

- **Success Response:**

  - **Code:** 200 Ok<br />
    **Content:**  
    ` [ { "key": "16197345900x7A41Ff1b4013D8A0c04863020Ee6F068A6C3b22d" }, { "key": "16210130910xC83507FB1cc907d67BbA67D620c591275af18A62" }, { "key": "16210194470x9C7879689054685E31ee4097f74ac5091AD09De0" } ]`

- **Error Response:**

  None

- **Sample Call:**

  ```javascript
  $.ajax({
    url: "/api/auctions",
    dataType: "json",
    type: "GET",
    success: function (r) {
      console.log(r);
    },
  });
  ```

---
