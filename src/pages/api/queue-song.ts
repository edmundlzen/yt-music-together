import { get, ref, set } from "firebase/database";
import { NextApiRequest, NextApiResponse } from "next";
import { MusicVideo } from "node-youtube-music";
import { db } from "~/utils/firebase";
import { QueuedMusicVideo } from "..";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const userId = req.body.userId as string;
  const song = req.body.song as MusicVideo;

  if (!song) {
    return res.status(400).json({ error: "No song provided" });
  }

  if (!userId) {
    return res.status(400).json({ error: "No user id provided" });
  }

  const currentQueue = (await get(ref(db, "queue")).then((snapshot) =>
    snapshot.val()
  )) as QueuedMusicVideo[];

  const currentPlaying = (await get(ref(db, "currentPlaying")).then(
    (snapshot) => snapshot.val()
  )) as QueuedMusicVideo | null;

  if (
    (currentQueue &&
      currentQueue.some((q) => q.song.youtubeId === song.youtubeId)) ||
    (currentPlaying && currentPlaying.song.youtubeId === song.youtubeId)
  ) {
    return res.status(400).json({ error: "Song already in queue" });
  }

  if (!currentQueue || currentQueue.length === 0) {
    await set(ref(db, "queue"), [
      {
        song,
        userId,
      },
    ]);
  } else {
    // Check the current queue and insert it so that it is in a round robin fashion
    // e.g it will be inserted after other users songs in a round robin fashion

    const currentQueueLength = currentQueue.length;
    const currentQueueUsers = [...new Set(currentQueue.map((q) => q.userId))];

    const currentUserLastSongIndex = currentQueue.findLastIndex(
      (q) => q.userId === userId
    );

    const newQueue = [...currentQueue];

    if (currentUserLastSongIndex === -1) {
      // User is not in the queue
      // Add them to the position after the last user's first song
      const lastUserFirstSongIndex = currentQueue.findIndex(
        (q) => q.userId === currentQueueUsers[currentQueueUsers.length - 1]
      );

      newQueue.splice(lastUserFirstSongIndex + 1, 0, {
        song,
        userId,
      });
    } else {
      // User is in the queue
      // Add them to the last user's first song after their own last song
      const queueAfterUsersLastSong = currentQueue.slice(
        currentUserLastSongIndex + 1
      );
      const queueAfterUsersLastSongUsers = [
        ...new Set(queueAfterUsersLastSong.map((q) => q.userId)),
      ];
      const lastUserFirstSongIndex = queueAfterUsersLastSong.findIndex(
        (q) =>
          q.userId ===
          queueAfterUsersLastSongUsers[queueAfterUsersLastSongUsers.length - 1]
      );

      newQueue.splice(
        currentUserLastSongIndex + lastUserFirstSongIndex + 2,
        0,
        {
          song,
          userId,
        }
      );
    }

    await set(ref(db, "queue"), newQueue);
  }

  return res.status(200).json({ message: "Song added to queue" });
}
