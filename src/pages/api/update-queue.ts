import { get, ref, set } from "firebase/database";
import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/utils/firebase";
import { QueuedMusicVideo } from "..";

const playNextSong = async () => {
  const nextSong = (await get(ref(db, "queue/0")).then((snapshot) =>
    snapshot.val()
  )) as string;

  await set(ref(db, "currentPlayingStartTime"), nextSong ? Date.now() : null);

  if (!nextSong) {
    await set(ref(db, "currentPlaying"), null);
    return;
  }

  await set(ref(db, "currentPlaying"), nextSong);

  await set(ref(db, "queue/0"), null);

  const currentQueue = (await get(ref(db, "queue")).then((snapshot) =>
    snapshot.val()
  )) as QueuedMusicVideo[];

  if (!currentQueue) {
    return;
  }

  if (currentQueue.length === 0) {
    return;
  }

  const newQueue = [...currentQueue];
  newQueue.shift();

  await set(ref(db, "queue"), newQueue);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  if (remainingTime <= 0) {
    playNextSong();
  }

  return res.status(200).json({ message: "Updated queue" });
}
