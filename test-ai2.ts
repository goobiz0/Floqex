import { streamText } from "ai";
import { google } from "@ai-sdk/google";
async function test() {
  const result = streamText({
    model: google("gemini-1.5-flash"),
    prompt: "Hello",
  });
  
  const proto = Object.getPrototypeOf(result);
  console.log(Object.getOwnPropertyNames(proto));
}
test();
