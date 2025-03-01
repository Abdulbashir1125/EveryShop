const express = require("express");
const app = express();
const routes = require("./routes");
const connnectionDb = require("./database/connectdb");
const port = process.env.PORT || 3000;
require("dotenv").config();
const expressLayouts = require("express-ejs-layouts");
const CustomError = require("./Customerror/error");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("express-flash");
//connect to database
connnectionDb();

//middlewares, settings
app.set("layout", "layout/mainLayout");
app.set("view engine", "ejs");
app.use(
  session({
    secret: "your-secret-key", // Change this to a strong, unique secret
    resave: false, // Avoid saving session if unmodified
    saveUninitialized: true, // Save new sessions
    cookie: { secure: false }, // Set true if using HTTPS
  })
);
app.use(flash());
app.use(cookieParser());
app.use(express.static("public"));
app.use(expressLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//routes
app.use("/", routes);

app.all("*", (req, res, next) => {
  const err = new CustomError("Not Found", 404, "Not Found");
  next(err);
});

app.use((error, req, res, next) => {
  error.statusCode = error.statusCode || 500; // Default status code
  error.status = error.status || "error"; // Default status message

  res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
  });
});
//starting routes
app.listen(port, () => {
  console.log("server is running");
});
