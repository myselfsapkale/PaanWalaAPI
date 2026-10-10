// index.ts
import express from "express";
import router from "./router.ts";

const app = express();
const port = process.env.PORT ?? "9001";

app.use(router);

app.listen(port, () => {
    console.log(`PaanWala app listening on port ${port}`);
});
