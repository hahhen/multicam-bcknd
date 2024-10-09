
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
var TurndownService = require('../../tomarkdown')
const InstaView = require('../../parser');
const express = require('express')
var turndownService = new TurndownService()
const uri = process.env.MONGODB_PW;
var router = express.Router();

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
    const likes = await collection.find({ userId: req.query.userId }).toArray();
    const totalLikes = likes.length;

    res.json({ likes: likes, totalLikes: totalLikes });
});

router.post('/', async function (req, res, next) {
    await client.connect();
    const database = client.db("multicam");
    const collection = database.collection("likes");
    var likes
    if (req.query.operation == "delete") {
        likes = (await collection.deleteOne({ userId: req.query.userId, cameraId: req.query.cameraId}))
    } else {
        likes = (await collection.insertOne({ userId: req.query.userId, cameraId: req.query.cameraId, updatedAt: new Date })).insertedId;
    }
    res.json({ likes: likes });
})

module.exports = router;