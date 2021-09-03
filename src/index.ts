import App from "./app";

const PORT = process.env.PORT || 5000

const port = PORT as number;
App.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
