import express from "express";
import morgan from "morgan";
import helmet from "helmet";

import cors from "cors";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

import api from "./api";
import { errorHandler } from "./middlewares";

const App = express();

// For rate limiting headers
App.set("trust proxy", 1);

App.use(
  morgan(
    ":date[web] :method :remote-addr :url :status :response-time ms - :res[content-length]"
  )
);
App.use(helmet());
App.use(cors());
App.use(express.json());

//App.get("/", (req: any, res: { json: (arg0: { message: string; }) => void; }) => {
//  res.json({
//    message: "Ok",
//  });
//});

App.use("/api", api);

//app.use(middlewares.notFound);
App.use(errorHandler);

export = App;
