const express = require("express");
const customError = require("./Customerror/error");
const routes = express.Router();
const bcrypt = require("bcrypt");
const adminRegister = require("./database/adminRegistry");
const jwt = require("jsonwebtoken");
const productsTable = require("./database/products");
const sales = require("./database/salePerday");
const today = new Date().toISOString().split("T")[0];
const pdf = require("pdfkit");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const flash = require("express-flash");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "aubashir1125@gmail.com", pass: "gwvivpzdigadkrnn" },
});

const sendEmailWithAttachment = async (to, subject, text, html, filePath) => {
  try {
    const mailOptions = {
      from: '"Usman" <aubashir1125@gmail.com>',
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (err) {
    console.log("Error sending email:", err);
  }
};

const generateAndSendPDF = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    const day = await sales.findOne({ dayDate: today });

    if (!day) {
      console.log("No sales data found for today.");
      return;
    }

    const list = day.sales;
    const idd = Date.now();

    const filePath = path.join(
      __dirname,
      `./reports/Transaction_Report_${idd}.pdf`
    );
    const doc = new pdf();
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    const tableTop = 100;
    const col1 = 50,
      col2 = 150,
      col3 = 300,
      col4 = 450,
      col5 = 500;

    doc.fontSize(9).text("Daily Receipt Every-Shop: ", col1, 50);
    doc.fontSize(9).text(`Date: ${today}`, col4, 50);

    doc.fontSize(10).text("ID", col1, tableTop);
    doc.text("Sale Person", col2, tableTop);
    doc.text("Product ID", col3, tableTop);
    doc.text("Quantity", col4, tableTop);
    doc.text("Sale Price", col5, tableTop);

    doc
      .moveTo(50, tableTop + 20)
      .lineTo(550, tableTop + 20)
      .stroke();

    let rowY = tableTop + 30;
    list.forEach((product, index) => {
      doc.fontSize(8).text(index + 1, col1, rowY);
      doc.text(product.saleperson, col2, rowY);
      doc.text(product.productId, col3, rowY);
      doc.text(product.quantity, col4, rowY, { align: "left" });
      doc.text(`#${product.salePrice}`, col5, rowY);
      rowY += 20;
    });

    doc.end();

    writeStream.on("finish", async () => {
      await sendEmailWithAttachment(
        "abdurrahmanbash@gmail.com",
        "Daily Transaction Report",
        "This is the total report of everything sold today.",
        "<h2>Transaction Summary</h2><p>Please find the attached transaction report.</p>",
        filePath
      );
    });
  } catch (err) {
    console.error("Error generating or sending email:", err);
  }
};

const sendEmail = async (to, subject, text, html, filePath) => {
  try {
    const mailOptions = {
      from: '"Usman" <aubashir1125@gmail.com>',
      to: to,
      subject: subject,
      text: text,
      html: html,
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (err) {
    console.log("Error sending email:", err);
  }
};

require("dotenv").config();
async function findPurchasePrice(idt) {
  const findTheProduct = await productsTable.findById(idt);
  return findTheProduct.purchasePrice;
}

async function auth(req, res, next) {
  const findToken = req.cookies.token;

  if (!findToken) {
    const err = new customError(
      "No token",
      404,
      "Authentication Issue with token"
    );
    return next(err);
  }
  const decode = jwt.verify(findToken, process.env.SECRET);

  if (!decode) {
    const err = new customError("Invalid or expired token", 404, "Not found");

    return next(err);
  }

  const id = decode.id;
  req.user = req.user || {};
  req.user.id = id;
  const findRole = await adminRegister.findById(id);
  const role = findRole.role;
  if (role !== "cashier") {
    const err = new customError(
      "You are not a cashier",
      404,
      "Authentication Issue with token"
    );
    return next(err);
  }
  next();
}
async function authAdmin(req, res, next) {
  const findToken = req.cookies.token;

  if (!findToken) {
    const err = new customError(
      "No token",
      404,
      "Authentication Issue with token"
    );
    return next(err);
  }
  const decode = jwt.verify(findToken, process.env.SECRET);

  if (!decode) {
    const err = new customError("Invalid or expired token", 404, "Not found");

    return next(err);
  }

  const id = decode.id;
  req.user = req.user || {};
  req.user.id = id;
  const findRole = await adminRegister.findById(id);
  const role = findRole.role;
  if (role !== "admin") {
    const err = new customError(
      "You are not an Admin",
      404,
      "Authentication Issue with token"
    );
    return next(err);
  }
  next();
}

routes.get("/", (req, res) => {
  res.render("index.ejs", {
    title: "",
    layout: "./layout/loginLayout",
    msg: req.flash("msg"),
  });
});
routes.get("/totalProducts", async (req, res) => {
  const products = await productsTable.find();
  let total = 0;
  for (const a of products) {
    total += a.quantity;
  }
  res.json({ total });
});
routes.get("/totalDailyTransactions", async (req, res) => {
  const products = await sales.findOne({ dayDate: today });
  let total = 0;
  if (!products) {
    return res.json({ total: "0" });
  }
  const productsList = products.sales;
  for (const a of productsList) {
    total += 1;
  }

  res.json({ total });
});
routes.get("/numbers", authAdmin, async (req, res) => {
  const AllSales = await sales.findOne({ dayDate: today });
  console.log(AllSales);
  if (AllSales == null) {
    return res.render("transactionsAdmin", { all: [] });
  }
  if (!AllSales) {
    return res.render("transactionsAdmin", { all: [] });
  }
  let originalItemTotal = 0;
  let sumTotal = 0;
  const ArrayListOfSales = AllSales.sales;
  for (const each of ArrayListOfSales) {
    sumTotal += Number(each.salePrice);
    const idt = each.productId;
    const quantity = each.quantity;
    const findd = await productsTable.findById(idt);
    const temptotal = findd.purchasePrice * quantity;

    originalItemTotal += Number(temptotal);
  }
  const profit = sumTotal - originalItemTotal;
  console.log(originalItemTotal, profit);
  res.render("transactionsAdmin", {
    all: AllSales.sales,
    sumTotal,
    originalItemTotal,
    profit,
    today,
  });
});

routes.get("/register", (req, res) => {
  res.render("registerAdmin.ejs");
});
routes.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});
routes.get("/download/:id/:date", auth, async (req, res) => {
  const id = req.params.id;
  const date = req.params.date;
  console.log(date);
  const day = await sales.findOne({ dayDate: date });
  const array = day.sales;
  const found = array.find((each) => each._id == id);
  res.setHeader("Content-Disposition", 'attachment; filename="products.pdf"');
  res.setHeader("Content-Type", "application/pdf");

  const doc = new pdf();
  doc.pipe(res);
  const tableTop = 100;
  const col1 = 50, // ID
    col2 = 150, // Sale Person
    col3 = 300, // Product ID
    col4 = 450, // Quantity
    col5 = 500; // Sale Price

  // **📌 Table Headers**
  doc.fontSize(9).text("Daily Receipt Every-Shop: ", col1, 50);
  doc.fontSize(11).text("Date: ", col4, 50);

  doc.text(`${date}`, 490, 50);

  doc.fontSize(11).text("ID", col1, tableTop);
  doc.text("Sale Person", col2, tableTop);
  doc.text("Product ID", col3, tableTop);
  doc.text("Quantity", col4, tableTop);
  doc.text("Sale Price", col5, tableTop);

  // **📌 Draw Header Line**
  doc
    .moveTo(50, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();

  let rowY = tableTop + 30; // Start row below the line

  // **📌 Populate Table from Databas
  doc.fontSize(8).text(1, col1, rowY);
  doc.text(found.saleperson, col2, rowY);
  doc.text(found.productId, col3, rowY);
  doc.text(found.quantity, col4, rowY, { align: "left" });
  doc.text(`#${found.salePrice}`, col5, rowY);

  rowY += 20; // Move to next row

  doc.end();
});

routes.get("/totaldownload/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const day = await sales.findOne({ dayDate: id });
  const list = day.sales;
  const doc = new pdf();
  const idd = Date.now();

  const filePath = path.join(
    __dirname,
    `./reports/Transaction_Report_${idd}.pdf`
  );
  const writeStream = fs.createWriteStream(filePath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="products${idd}.pdf"`
  );

  doc.pipe(writeStream);
  doc.pipe(res);
  const tableTop = 100;
  const col1 = 50, // ID
    col2 = 150, // Sale Person
    col3 = 300, // Product ID
    col4 = 450, // Quantity
    col5 = 500; // Sale Price

  // **📌 Table Headers**
  doc.fontSize(9).text("Daily Receipt Every-Shop: ", col1, 50);
  doc.text(`${id}`, 170, 50);

  doc.fontSize(10).text("ID", col1, tableTop);
  doc.text("Sale Person", col2, tableTop);
  doc.text("Product ID", col3, tableTop);
  doc.text("Quantity", col4, tableTop);
  doc.fontSize(8).text("Sale Price", col5, tableTop);

  // **📌 Draw Header Line**
  doc
    .moveTo(50, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();

  let rowY = tableTop + 30; // Start row below the line

  // **📌 Populate Table from Database**
  list.forEach((product, index) => {
    doc.fontSize(8).text(index + 1, col1, rowY);
    doc.text(product.saleperson, col2, rowY);
    doc.text(product.productId, col3, rowY);
    doc.text(product.quantity, col4, rowY, { align: "left" });
    doc.text(`#${product.salePrice}`, col5, rowY);

    rowY += 20; // Move to next row
  });

  doc.end();

  writeStream.on("finish", async () => {
    await sendEmail(
      "abdurrahmanbash@gmail.com",
      "Daily Transaction Report",
      "This is the total report of everything sold today.",
      "<h2>Daily Transaction Summary</h2><p>Please find the attached transaction report.</p>",
      filePath
    );
  });
});

cron.schedule(
  "32 20 * * *",
  async () => {
    console.log("Running scheduled task: Sending daily transaction report...");
    await generateAndSendPDF();
  },
  {
    timezone: "Africa/Lagos", // Adjust for your timezone
  }
);

routes.get("/addProducts", authAdmin, (req, res, next) => {
  res.render("addproducts", { title: "add products" });
});
routes.get("/getproducts", auth, async (req, res) => {
  try {
    const getproducts = await productsTable.find();

    res.json(getproducts);
  } catch (e) {
    next(e);
  }
});
routes.get("/addAccount", authAdmin, (req, res) => {
  res.render("addAccount");
});

routes.post("/searchProduct", auth, async (req, res, next) => {
  const searched = req.body.search;
  if (!searched) {
    return res.redirect("/dashboardCash");
  }

  const find = await productsTable
    .find({
      productName: { $regex: searched, $options: "i" },
    })
    .sort({ dateofCreation: -1 });
  if (!find) {
    const err = new customError("not found", 401, "Mssing fields");
    return next(err);
  }

  res.render("dashboardCash", {
    name: "user",
    products: find,
  });
});
routes.post("/filterBydate", auth, async (req, res, next) => {
  const searched = req.body.date;
  console.log(searched);
  if (!searched) {
    return res.redirect("/transactions");
  }

  const find = await sales.find({ dayDate: searched }).sort({ dayDate: -1 });

  if (!find) {
    const err = new customError("no transactionS found", 401, "Mssing fields");
    return next(err);
  }
  if (find.length === 0) {
    return res.render("transactions", { all: [] });
  }

  const result = find[0].sales;
  if (!result) {
    const err = new customError("not found", 401, "Mssing fields");
    return next(err);
  }
  res.render("transactions", { all: result, sumTotal: "", today: searched });
});
routes.post("/filterBydateAdmin", authAdmin, async (req, res, next) => {
  const searched = req.body.date;

  console.log(searched);
  if (!searched) {
    return res.redirect("/transactionsAdmin");
  }

  const find = await sales.find({ dayDate: searched }).sort({ dayDate: -1 });

  if (!find) {
    const err = new customError("not found", 401, "Mssing fields");
    return next(err);
  }

  if (find.length === 0) {
    return res.render("transactionsAdmin", { all: [] });
  }

  const result = find[0].sales;
  console.log(result);
  if (!result) {
    const err = new customError("not found", 401, "Mssing fields");
    return next(err);
  }

  let sumTotal = 0;
  let originalItemTotal = 0;
  for (const each of result) {
    sumTotal += Number(each.salePrice);
    const idt = each.productId;

    const quantity = each.quantity;
    if (!idt) {
      res.render("transactionsAdmin", {
        all: result,
        sumTotal: "non",
        originalItemTotal: "non",
        profit: "non",
        today: searched,
      });
      return;
    }
    const findd = await productsTable.findById(idt);
    console.log(findd);
    if (!("purchasePrice" in findd)) {
      findd.purchasePrice = Number(findPurchasePrice(idt));
    }
    const temptotal = findd.purchasePrice * quantity;

    originalItemTotal += Number(temptotal);
  }
  const profit = sumTotal - originalItemTotal;
  console.log(originalItemTotal, profit);
  res.render("transactionsAdmin", {
    all: result,
    sumTotal,
    originalItemTotal,
    profit,
    today: searched,
  });
});

routes.get("/addAccount", authAdmin, (req, res) => {
  res.render("addAccount");
});
routes.get("/transactions", auth, async (req, res) => {
  const AllSales = await sales.findOne({ dayDate: today });
  console.log(AllSales);
  if (!AllSales) {
    return res.render("transactions", { all: [] });
  }
  let sumTotal = 0;
  const ArrayListOfSales = AllSales.sales;
  ArrayListOfSales.forEach((each) => {
    sumTotal += Number(each.salePrice);
  });
  console.log(sumTotal);
  res.render("transactions", { all: AllSales.sales, sumTotal, today });
});
routes.get("/viewProducts", authAdmin, async (req, res) => {
  const getall = await productsTable.find().sort({ dateofCreation: -1 });

  res.render("viewProducts", { products: getall });
});
routes.get("/edit/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  const findP = await productsTable.findById(id);
  console.log(findP);
  res.render("oneproduct", {
    id: findP._id,
    productName: findP.productName,
    quantity: findP.quantity,
    purchasePrice: findP.purchasePrice,
    salePrice: findP.salePrice,
  });
});

routes.post("/cashout", auth, (req, res) => {
  const user = req.user.id;
  const cashout = req.body;
  cashout.forEach(async (each) => {
    const id = each.productid;

    const quantity = each.quantity;
    const totalPrice = each.salePrice;
    const update = await productsTable.findById(id);
    const newquantity = update.quantity - quantity;

    const updatedata = await productsTable.findByIdAndUpdate(
      id,
      { quantity: newquantity },
      { new: true }
    );

    const totalSalePrice = quantity * totalPrice;
    const datatoAdd = {
      product: each.productName,
      productId: id,
      saleperson: user,
      quantity,
      salePrice: totalSalePrice,
    };

    const addToSales = await sales.findOneAndUpdate(
      { dayDate: today },
      { $push: { sales: datatoAdd } },
      { upsert: true, new: true }
    );

    console.log(addToSales);
    res.json({ msg: "successfullly" });
  });
});
routes.post("/addAccount", authAdmin, async (req, res, next) => {
  try {
    const { fullname, username, password, confirmpassword, role } = req.body;
    if (!fullname || !username || !password || !confirmpassword || !role) {
      const err = new customError(
        "All fields need to be field",
        401,
        "Mssing fields"
      );
      return next(err);
    }

    if (password !== confirmpassword) {
      const err = new customError("password mismatch", 401, "nope found");
      return next(err);
    }

    const hashedpassword = bcrypt.hashSync(password, 10);

    const createAccount = await adminRegister.create({
      fullname,
      username,
      password: hashedpassword,
      role,
    });
    res.json(createAccount);
  } catch (e) {
    // const err = new customError(
    //   "having trouble finding product to delete",
    //   401,
    //   "nope found"
    // );
    return next(e);
  }
});

routes.post("/update/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  const { productName, quantity, purchasePrice, salePrice } = req.body;
  const update = await productsTable.findByIdAndUpdate(
    id,
    { productName, quantity, purchasePrice, salePrice },
    { new: true }
  );
  res.redirect("/viewProducts");
});

routes.post("/delete/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  const deleted = await productsTable.findByIdAndDelete(id);
  console.log(deleted);
  if (!deleted) {
    const err = new customError(
      "having trouble finding product to delete",
      401,
      "nope found"
    );
    return next(err);
  }
  res.json({ msg: "Deleted Successfully" });
});

routes.get("/dashboard", authAdmin, async (req, res) => {
  try {
    const id = req.user.id;
    const findall = await adminRegister.findById(id);
    if (!findall) {
      const err = new customError(
        "not email like this is found",
        401,
        "nope found"
      );
      return next(err);
    }

    res.render("dashboard", { name: findall.username });
  } catch (err) {
    console.log(err);
  }
});
routes.get("/dashboardCash", auth, async (req, res) => {
  try {
    const id = req.user.id;
    const findall = await adminRegister.findById(id);
    const findallProducts = await productsTable
      .find()
      .sort({ dateofCreation: -1 });
    if (!findall) {
      const err = new customError(
        "not email like this is found",
        401,
        "nope found"
      );
      return next(err);
    }

    res.render("dashboardCash", {
      name: findall.username,
      products: findallProducts,
    });
  } catch (err) {
    console.log(err);
  }
});
routes.post("/loginR", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      req.flash("msg", "you need to fill al required fields");
      return res.redirect("/");
      // const err = new customError(
      //   "All fields need to be field",
      //   401,
      //   "mssing Fields"
      // );
      // return next(err
    }

    //check if the email is available i the admin registry
    const findEmail = await adminRegister.findOne({ username });
    if (!findEmail) {
      req.flash("msg", "Email not found");
      return res.redirect("/");
    }

    //comparing our just password with the encrypted which is in the database
    if (!bcrypt.compareSync(password, findEmail.password)) {
      req.flash("msg", "Password Incorrect");
      return res.redirect("/");
    }

    //login logic with json web token
    const sign = jwt.sign({ id: findEmail._id }, process.env.SECRET, {
      expiresIn: "1h",
    });

    //storing the cookie in my browser but not accessible to javascript
    res.cookie("token", sign, { httpOnly: true });
    if (findEmail.role === "admin") {
      return res.redirect("/dashboard");
    } else if (findEmail.role === "cashier") {
      return res.redirect("dashboardCash");
    } else {
      console.log("we dont know your roles");
      return res.send(
        "<div>we dont know you <a href= '/'>back to login</a></div>"
      );
    }
  } catch (err) {
    next(err);
  }
});

//register admin
routes.post("/RegisterAdmin", authAdmin, async (req, res, next) => {
  try {
    const { fullname, username, password, confirmpassword, confirmrole } =
      req.body;

    //checking if there is an empty field
    if (
      !fullname ||
      !username ||
      !password ||
      !confirmpassword ||
      !confirmrole
    ) {
      const err = new customError(
        "All Fields needs to be Filled",
        400,
        "Incomplete Data"
      );
      return next(err);
    }

    //cheching if the passwords are correct
    if (password !== confirmpassword) {
      const err = new customError(
        "password mismatch",
        400,
        "mismatch password"
      );
      return next(err);
    }

    //encrypted password
    const encPassword = bcrypt.hashSync(password, 10);

    const newAdmin = await adminRegister.create({
      fullname,
      username,
      password: encPassword,
      role: "admin",
    });

    res.json({ newAdmin });
  } catch (err) {
    next(err);
  }
});

routes.post("/addproducts", authAdmin, async (req, res) => {
  const { productName, quantity, purchasePrice, salePrice } = req.body;
  const save = await productsTable.create({
    productName,
    quantity,
    purchasePrice,
    salePrice,
  });
  if (!save) {
    const err = new customError(
      "Problem while adding product",
      401,
      "nope found"
    );
    return next(err);
  }
  res.redirect("viewProducts");
});
module.exports = routes;
