
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const express = require('express')
const app = express()
const uri = process.env.MONGODB_PW;
var router = express.Router();
const eBayApi = require('ebay-api')

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const eBay = new eBayApi({
  appId: 'ArthurMa-multicam-PRD-849ffde72-c981acce',
  certId: 'PRD-49ffde721d14-d7d6-4674-a6cf-39d7',
  sandbox: false
});

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

router.get('/', async function (req, res, next) {
  await client.connect();
  const database = client.db("multicam");
  const collection = database.collection("camera");
  var cameras = await collection.aggregate([{ $sample: { size: 10 } }]).toArray();

  await Promise.all(cameras.map(async (camera) => {
    try {
      if(req.query.userId){
        const like = await database.collection("likes").findOne({ cameraId: camera.pageid, userId: req.query.userId });
        if(like) {
          camera.isLiked = true;
        }
      }
      const { itemSummaries } = await eBay.buy.browse.search({ q: slugify(camera.title), limit: 1 });
      camera.priceProvider = "ebay"
      camera.currency = itemSummaries[0].price.currency
      camera.price = itemSummaries[0].price.value
      camera.image = itemSummaries[0].image.imageUrl
    } catch (e) {
      if(req.query.userId){
        const like = await database.collection("likes").findOne({ cameraId: camera.pageid, userId: req.query.userId });
        if(like) {
          camera.isLiked = true;
        }
      }
      camera.priceProvider = "none"
      camera.price = "--"
      camera.image = "https://via.placeholder.com/150"
      camera.currency = ""
      camera.error = e
    }
  }));

  res.json({ cameras: cameras });
});


module.exports = router;