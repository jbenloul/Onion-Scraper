// *****************************************************************************
// Server.js - This file is the initial starting point for the Node/Express server.
//
// ******************************************************************************
// *** Dependencies
// =============================================================
var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


// Initialize Express
var app = express();
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/theOnion");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});


// Routes =============================================================
app.get("/scrape", function(req, res) {

    //Need to drop DB before scrape

    request("http://www.theonion.com/", function(error, response, html) {
        // Load the HTML into cheerio and save it to a variable
        // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
        var $ = cheerio.load(html);
        // An empty object to save the data that we'll scrape
        var result = {};
        // With cheerio, find each article-tag with the "title" class
        // (i: iterator. element: the current element)
        $("article.summary").each(function(i, element) {
            result.link = $(this).find("a.handler").attr("href");
            result.image = $(this).find("div > figure > a > div > noscript > img").attr("src");
            result.title = $(this).find("div > div > header > h2 > a").text().trim();

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
            });
            console.log(result);
        });
        res.send("data");
    });
});


app.get("/", function(req, res) {
    Article.find({}, function(error, doc) {
        // Send any errors to the browser
        if (error) {
            res.send(error);
        }
        // Or send the doc to the browser
        else {
            res.render("index", {
                article: doc
            })
        }
    });
});


app.get("/article/:id", function(req, res) {
    Article.findById(req.params.id, function(err, data) {
        if (err) {
            return err
        } else {
            res.render("getOne", {
                article: data
            })
        }
    });
});


app.post("/article/:id", function(req, res) {
    Article.findById(req.params.id).populate("comment").exec(function(err, data) {
        if (err) {
            return err
        } else {
            res.render("getOne", {
                article: data
            })
        }
    });
});


// Syncing our sequelize models and then starting our express app
app.listen(3000, function() {
    console.log("App running on port 3000!");
});
