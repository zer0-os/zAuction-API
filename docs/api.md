# API Request Structure

## `/bid`

Returns encoded data to be signed, a generated uniqueBidId,
and a generated nftId determined by the NFT contract address and tokenId

```
POST <base-uri>/api/bid

Headers:
  Content-Type: application/json

Body:
{
  "bidAmount": <string>,
  "contractAddress": <string>,
  "tokenId": <string>,
  "minimumBid": <string>,
  "startBlock": <string>,
  "expireBlock": <string>
}

Response:
{
  "payload": <string>,
  "uniqueBidId": <number>,
  "nftId": <string>
}
```

## `/bids/list`

Endpoint to return auctions associated with each given nftId

```
POST <base-uri>/api/bids/list

Headers:
  Content-Type: application/json

Body:
{
  "nftIds": [
     <string>,
     <string>,
     ...
   ]
}

Response:
{
  "0x123...": [
     "account": <string>,
     "signedMessage": <string>,
     "uniqueBidId": <string>,
     "bidAmount": <string>,
     "minimumBid": <string>,
     "startBlock": <string>,
     "expireblock": <string>,
     "date": <number>,
     "tokenId": <string>,
     "contractAddress": <string>
   ],
   ...
}
```

## `/bids/accounts/:account`

Endpoint to return all bids by a single given account

```
GET <base-uri>/api/bids/accounts/:account

Headers:
  Content-Type: application/json

Body: N/A

Response:
[
  {
    "account": <string>,
    "signedMessage": <string>,
    "uniqueBidId": <string>,
    "bidAmount": <string>,
    "minimumBid": <string>,
    "startBlock": <string>,
    "expireblock": <string>,
    "date": <number>,
    "tokenId": <string>,
    "contractAddress": <string>
  },
  ...
]
```

## `/bids`

Creates a new bid for an auction once signed by user

```
POST <base-uri>/api/bids

Headers:
  Content-Type: application/json

Body: 
{
  "account": <string>,
  "uniqueBidId": <string>,
  "bidAmount": <string>,
  "contractAddress": <string>
  "expireblock": <string>,
  "minimumBid": <string>,
  "signedMessage": <string>,
  "startBlock": <string>,
  "tokenId": <string>,
}
Response:
OK
```

## `/bids/:nftId`

Endpoint to return current highest bid given nftId

```
POST <base-uri>/api/bids

Headers:
  Content-Type: application/json

Body: 
{
  "account": <string>,
  "uniqueBidId": <string>,
  "bidAmount": <string>,
  "contractAddress": <string>
  "expireblock": <string>,
  "minimumBid": <string>,
  "signedMessage": <string>,
  "startBlock": <string>,
  "tokenId": <string>,
}
Response:
[
  {
    "account": <string>,
    "signedMessage": <string>,
    "uniqueBidId": <string>,
    "bidAmount": <string>,
    "minimumBid": <string>,
    "startBlock": <string>,
    "expireBlock": <string>,
    "date": <number>,
    "tokenId": <string>,
    "contractAddress": <string>
  },
  ...
]
```