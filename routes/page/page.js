
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
    const collection = database.collection("camera");
    var pageContent = await (await fetch(`http://camera-wiki.org/api.php?action=query&prop=revisions&rvprop=timestamp%7Cuser%7Ccomment%7Ccontent&format=json&formatversion=2&pageids=${req.query.pageid}`)).json();

    let content = pageContent.query.pages[0].revisions[0].content;
    content = content.replace(/{{[\s\S]*?}}/g, match => match.replace(/\n/g, ''));

    pageContent.query.pages[0].revisions[0].content = turndownService.turndown(InstaView.convert(content));

    var {categories} = await collection.findOne({ pageid: parseInt(req.query.pageid)});

    categories.map((category, i) => {
        categories[i] = category.replace('Category:', '');
    })
        res.json({ cameras: pageContent, categories: categories });
});


module.exports = router;