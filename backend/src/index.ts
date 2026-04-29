import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`AI Timetable Advisory backend running on http://localhost:${port}`);
});
