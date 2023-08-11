import { get, ref, set } from "firebase/database";
import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/utils/firebase";
import { QueuedMusicVideo } from "..";

const playNextSong = async () => {
  const currentQueue = (await get(ref(db, "queue")).then((snapshot) =>
    snapshot.val()
  )) as QueuedMusicVideo[];

  const nextSong = currentQueue && currentQueue[0];

  if (!nextSong) {
    await set(ref(db, "currentPlaying"), null);
    await set(ref(db, "currentPlayingStartTime"), null);
    return;
  }

  await set(ref(db, "currentPlayingStartTime"), Date.now());
  await set(ref(db, "currentPlaying"), nextSong);

  const newQueue = currentQueue.length > 1 ? currentQueue.slice(1) : null;

  await set(ref(db, "queue"), newQueue);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const forceSkip = req.query.forceSkip === "true";

  const currentPlayingSong = (await get(ref(db, "currentPlaying")).then(
    (snapshot) => snapshot.val()
  )) as QueuedMusicVideo;

  if (!currentPlayingSong) {
    await playNextSong();
    return res.status(200).json({ message: "Updated queue" });
  }

  const currentPlayingSongStartTime = (await get(
    ref(db, "currentPlayingStartTime")
  ).then((snapshot) => snapshot.val())) as number;

  const currentPlayingSongDuration =
    currentPlayingSong.song.duration?.totalSeconds || 0;

  const remainingTime =
    currentPlayingSongDuration * 1000 -
    (Date.now() - currentPlayingSongStartTime);
  console.log("Remaining time in minutes", remainingTime / 1000 / 60);

  if (remainingTime <= 0 || forceSkip) {
    playNextSong();
  }

  return res.status(200).json({ message: "Updated queue" });
}
