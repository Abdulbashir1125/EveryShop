const mongooose = require("mongoose");

const schemasaleitem = new mongooose.Schema({
  product: { type: String, required: true },
  productId: { type: String, required: true },
  saleperson: { type: String, required: true },
  quantity: { type: Number, required: true },
  salePrice: { type: Number, required: true },
});

const today = new Date().toISOString().split("T")[0];
const schema = new mongooose.Schema({
  dayDate: { type: Date, required: true, default: today },
  sales: { type: [schemasaleitem], default: [] },
});

const table = mongooose.model("Sales", schema);
module.exports = table;
