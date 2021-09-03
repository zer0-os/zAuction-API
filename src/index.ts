import App from "./app";
import env from "env-var";

const PORT: number = env.get("PORT").default("5000").asPortNumber();

const port = PORT;
App.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
