const mongooose = require("mongoose");
const connectionstring = `mongodb+srv://root:root@cluster0.atp49.mongodb.net/everyshop?retryWrites=true&w=majority&appName=Cluster0`;

const connect = async () => {
  try {
    await mongooose.connect(connectionstring);
    console.log("database connected");
  } catch (e) {
    console.log(e);
  }
};

module.exports = connect;
