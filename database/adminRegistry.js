const mongooose = require("mongoose");

const schema = new mongooose.Schema({
  fullname: { type: String, required: true },
  shopId: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  DateofCreation: { type: Date, default: Date.now },
});

const table = mongooose.model("adminRegister", schema);
module.exports = table;
