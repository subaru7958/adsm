import mongoose from "mongoose";

export const connectDB = async () => {
    mongoose
    .connect(process.env.MONGO_URI, {
        dbName: "sports"
    })
    .then(() =>{ console.log("MongoDB connected");
})
.catch ((err) =>{ console.log(`error occured: ${err}`);
});

};