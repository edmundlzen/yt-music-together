import { NextApiRequest, NextApiResponse } from "next";
import { searchMusics } from "node-youtube-music";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await searchMusics(req.query.query as string);
  return res.status(200).json(result);
}
