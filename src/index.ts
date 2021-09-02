import App from "./app";

// was : number specifically
const PORT = process.env.PORT || 5000 //.asPortNumber();

const port = PORT as number;
App.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
