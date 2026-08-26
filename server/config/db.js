const mongoose = require('mongoose')

const connectdb  = async() =>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("db connected");
    }
    catch( err){
        console.log("cant connect to db");
        console.error(err);
        process.exit(1);
    }
};

module.exports = connectdb;