const mongooose = require("mongoose");

const schema = new mongooose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  dateofCreation: { type: Date, default: Date.now },
});

const table = mongooose.model("Products", schema);
module.exports = table;
