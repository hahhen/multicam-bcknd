
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
var TurndownService = require('../../tomarkdown')
const InstaView = require('../../parser');
const express = require('express')
var turndownService = new TurndownService()
const uri = process.env.MONGODB_PW;
var router = express.Router();
const eBayApi = require('ebay-api')

const eBay = new eBayApi({
  appId: 'ArthurMa-multicam-PRD-849ffde72-c981acce',
  certId: 'PRD-49ffde721d14-d7d6-4674-a6cf-39d7',
  sandbox: false
});

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
    const collection = database.collection("bookmarks");
    var bookmarks = await collection.find({ userId: req.query.userId }).sort({updatedAt: -1}).toArray();
    const totalbookmarks = bookmarks.length;

    await Promise.all(bookmarks.map(async (like) => {
        try {
            var camera = await database.collection("camera").findOne({ pageid: like.cameraId });
            try {
                const bookmarked = await database.collection("bookmarks").findOne({ cameraId: camera.pageid, userId: req.query.userId });
                const liked = await database.collection("likes").findOne({ cameraId: camera.pageid, userId: req.query.userId });
                if (liked) {
                    camera.isLiked = true;
                }
                if (bookmarked) {
                    camera.isLiked = true;
                }
                const { itemSummaries } = await eBay.buy.browse.search({ q: slugify(camera.title), limit: 1 });
                camera.priceProvider = "ebay"
                camera.currency = itemSummaries[0].price.currency
                camera.price = itemSummaries[0].price.value
                camera.image = itemSummaries[0].image.imageUrl
            } catch (e) {
                console.log(e)
                const liked = await database.collection("likes").findOne({ cameraId: camera.pageid, userId: req.query.userId });
                if (liked) {
                    camera.isLiked = true;
                }
                const bookmarked = await database.collection("bookmarks").findOne({ cameraId: camera.pageid, userId: req.query.userId });
                if (bookmarked) {
                    camera.isBookmarked = true;
                }

                camera.priceProvider = "none"
                camera.price = "--"
                camera.image = "https://via.placeholder.com/150"
                camera.currency = ""
                camera.error = e
                like.camera = camera;
            }
            like.camera = camera
        } catch (e) {
            console.log(e)
        }
    }))

    res.json({ bookmarks: bookmarks, totalbookmarks: totalbookmarks });
});

router.post('/', async function (req, res, next) {
    await client.connect();
    const database = client.db("multicam");
    const collection = database.collection("bookmarks");
    var bookmarks
    if (req.query.operation == "delete") {
        bookmarks = (await collection.deleteOne({ userId: req.query.userId, cameraId: parseInt(req.query.cameraId) }))
    } else {
        bookmarks = (await collection.updateOne({ userId: req.query.userId, cameraId: parseInt(req.query.cameraId)}, {"$set": {"updatedAt": new Date}}, {upsert: true}))
    }
    res.json({ bookmarks: bookmarks });
})

module.exports = router;