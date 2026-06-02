import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: "Missing 'url' query parameter." });
    return;
  }

  try {
    const response = await fetch(url as string);
    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(csvText);
  } catch (error) {
    console.error("[fetch-resource-data]", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
