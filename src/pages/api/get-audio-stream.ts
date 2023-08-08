import { NextApiRequest, NextApiResponse } from "next";
import ytdl from "ytdl-core";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const stream = ytdl(
    `https://www.youtube.com/watch?v=${req.query.id as string}`,
    {
      filter: "audioonly",
      quality: "highestaudio",
    }
  );

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");

  stream.on("data", (chunk) => {
    res.write(chunk);
  });

  stream.on("end", () => {
    res.end();
  });

  stream.on("error", (err) => {
    console.error(err);
    res.status(500).end();
  });

  res.on("close", () => {
    stream.destroy();
  });

  res.status(200);
}
