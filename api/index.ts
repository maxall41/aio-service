import { Hono } from "hono";
import { handle } from "hono/vercel";
import { Redis } from "@upstash/redis";
import { Octokit } from "@octokit/rest";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

app.get("/hello", (c) => {
  return c.json({
    message: "Hello From Hono",
  });
});

app.get("/claps/get", async (c) => {
  let redis: Redis | null = null;
  if (
    UPSTASH_REDIS_REST_URL != undefined &&
    UPSTASH_REDIS_REST_TOKEN != undefined
  ) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (redis == null) {
    return c.json({ error: "Can not connect to Redis" });
  }
  //
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Credentials", "true");

  const query = new URLSearchParams(c.req.url.split("?")[1]);

  const res = await redis.get("CLAPS_" + query.get("post_title"));
  if (res == null) {
    return c.json({ error: res });
  }

  return c.json({
    claps: res,
  });
});

const PROJECTS = [
  "maxall41/DPXRust",
  "maxall41/RustSASA",
  "Hearth-Industries/Hearth",
];
app.get("/github/update-stars", async (c) => {
  let redis: Redis | null = null;
  if (
    UPSTASH_REDIS_REST_URL != undefined &&
    UPSTASH_REDIS_REST_TOKEN != undefined
  ) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (redis == null) {
    return c.json({ error: "Can not connect to Redis" });
  }
  //
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Credentials", "true");
  //
  const GIT_TOKEN = process.env.GIT_TOKEN;
  const octokit = new Octokit({
    auth: GIT_TOKEN,
  });
  for (let project of PROJECTS) {
    let url = "GET /repos/" + project;
    const result = await octokit.request(url, {
      owner: "OWNER",
      repo: "REPO",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    //
    const res = await redis.set(
      "GITSTARS_PROJECT_" + project,
      result["data"]["stargazers_count"],
    );
  }
  return c.json({ result: "Updated star count" });
});

app.get("/github/get-star-count", async (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Credentials", "true");
  let redis: Redis | null = null;
  if (
    UPSTASH_REDIS_REST_URL != undefined &&
    UPSTASH_REDIS_REST_TOKEN != undefined
  ) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (redis == null) {
    return c.json({ error: "Can not connect to Redis" });
  }
  //
  const query = new URLSearchParams(c.req.url.split("?")[1]);
  let project_url = query.get("project_url");
  if (project_url == null) {
    return c.json({ error: "Did not specify 'project_url'" });
  }
  let project_url_split = project_url.split("/");
  let project_id =
    project_url_split[project_url_split.length - 2] +
    "/" +
    project_url_split[project_url_split.length - 1];
  const res = await redis.get("GITSTARS_PROJECT_" + project_id);
  return c.json({ result: res });
});

app.post("/claps/increment", async (c) => {
  let redis: Redis | null = null;
  if (
    UPSTASH_REDIS_REST_URL != undefined &&
    UPSTASH_REDIS_REST_TOKEN != undefined
  ) {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (redis == null) {
    return c.json({ error: "Can not connect to Redis" });
  }
  //
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Credentials", "true");

  const data = await c.req.json();

  const res = await redis.incr("CLAPS_" + data["post_title"]);

  return c.json({
    success: true,
  });
});

export default handle(app);
