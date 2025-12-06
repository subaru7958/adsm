import express from "express";
import{config} from "dotenv";
import cors from "cors";
import {connectDB} from "./database/dbConnection.js";
import {errorMiddleware} from "./middlewares/error.js";
import path from "path";
import authRoutes from "./routes/auth.js";
import playersRoutes from "./routes/players.js";
import coachesRoutes from "./routes/coaches.js";
import groupsRoutes from "./routes/groups.js";
import sessionsRoutes from "./routes/sessions.js";
import coachRoutes from "./routes/coach.js";
import playerRoutes from "./routes/player.js";
import adminRoutes from "./routes/admin.js";
import eventsRoutes from "./routes/events.js";
import verificationRoutes from "./routes/verification.js";

export const app = express(); 
config({path:"./config.env"});
app.use(cors({
    origin:[process.env.FRONTEND_URL],
    methods:["GET","POST","PUT","PATCH","DELETE"],
    credentials:true,
}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
connectDB();
// Serve uploads statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/players", playersRoutes);
app.use("/api/coaches", coachesRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/verification", verificationRoutes);

// Error middleware should be last
app.use(errorMiddleware);
