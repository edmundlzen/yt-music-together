import { get, onValue, ref } from "firebase/database";
import Head from "next/head";
import { MusicVideo } from "node-youtube-music";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";
import useAudioTime from "~/hooks/useAudioTime";
import { db } from "~/utils/firebase";

export interface QueuedMusicVideo {
  song: MusicVideo;
  userId: string;
}

const searchMusics = async (query: string) => {
  const result = await fetch(`/api/search-musics?query=${query}`);
  return await result.json();
};

export default function Home() {
  const [firstInteractionDone, setFirstInteractionDone] =
    useState<boolean>(false);
  const [currentPlayingSong, setCurrentPlayingSong] =
    useState<QueuedMusicVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MusicVideo[]>([]);
  const [queue, setQueue] = useState<QueuedMusicVideo[] | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [currentPlayingStartTime, setCurrentPlayingStartTime] =
    useState<number>(0);
  const [timePlayed, setTimePlayed] = useState<number>(0);
  const startAtTime = useMemo(
    () => Math.round((Date.now() - currentPlayingStartTime) / 1000),
    [currentPlayingStartTime]
  );
  const youtubePlayerRef = useRef<YouTubePlayer>(null);

  // const { load, play, isLoading, duration, stop } = useGlobalAudioPlayer();
  // const pos = useAudioTime();

  // useEffect(() => {
  //   if (!currentPlayingSong) return;
  //   const asyncLoadAndPlaySong = async () => {
  //     // const currentPlayingStartTime = (
  //     //   await get(ref(db, "currentPlayingStartTime"))
  //     // ).val();
  //     // const start = (Date.now() - currentPlayingStartTime) / 1000;
  //     load(`/api/get-audio-stream?id=${currentPlayingSong?.song.youtubeId}`, {
  //       html5: true,
  //       format: "mp3",
  //       onend: () => {
  //         void fetch("/api/update-queue");
  //       },
  //     });
  //   };
  //   asyncLoadAndPlaySong();
  // }, [currentPlayingSong]);

  // useEffect(() => {
  //   if (!firstInteractionDone) return;
  //   play();
  // }, [firstInteractionDone]);

  useEffect(() => {
    if (searchQuery === "") return;
    const asyncSearchAndSetMusics = async () => {
      const currentSearchQuery = searchQuery;
      const result = await searchMusics(searchQuery);
      if (currentSearchQuery !== searchQuery) return;
      setSearchResults(result);
    };
    asyncSearchAndSetMusics();
  }, [searchQuery]);

  useEffect(() => {
    const queueRef = ref(db, "queue");
    onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      console.log(data);
      setQueue(data);
    });
  }, []);

  useEffect(() => {
    const existingUserId = localStorage.getItem("userId");
    if (existingUserId && existingUserId !== "") {
      setUserId(existingUserId);
      return;
    }

    const newUserId = Math.random().toString(36).substring(7);
    localStorage.setItem("userId", newUserId);
    setUserId(newUserId);
  }, []);

  useEffect(() => {
    void fetch("/api/update-queue");
    const currentPlayingSongRef = ref(db, "currentPlaying");
    onValue(currentPlayingSongRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCurrentPlayingSong(null);
        return;
      }
      setCurrentPlayingSong(data);
    });
  }, []);

  useEffect(() => {
    const currentPlayingStartTimeRef = ref(db, "currentPlayingStartTime");
    onValue(currentPlayingStartTimeRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setCurrentPlayingStartTime(data);
    });
  }, []);

  useEffect(() => {
    const updatePlayTimeInterval = setInterval(() => {
      setTimePlayed(youtubePlayerRef.current?.getCurrentTime() ?? 0);
    }, 1000);

    return () => clearInterval(updatePlayTimeInterval);
  }, []);

  useEffect(() => {
    fetch("/api/update-queue");
  }, []);

  const queueSong = async (song: MusicVideo) => {
    await fetch("/api/queue-song", {
      method: "POST",
      body: JSON.stringify({
        song,
        userId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await fetch("/api/update-queue");
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    youtubePlayerRef.current = event.target;
    event.target.seekTo(
      Math.round((Date.now() - currentPlayingStartTime) / 1000)
    );
  };

  return (
    <>
      <Head>
        <title>Youtube Music Together</title>
        <meta name="description" content="Listening to tunes with your frens" />
        <link rel="icon" href="/favicon.ico" />
        <style>
          @import
          url('https://fonts.googleapis.com/css2?family=Encode+Sans+Expanded:wght@100;200;300;400;500;600;700;800;900&display=swap');
        </style>
      </Head>
      <main
        className="flex h-screen flex-col items-center justify-center bg-black text-white md:p-24"
        onClick={() => setFirstInteractionDone(true)}
      >
        {firstInteractionDone && (
          <YouTube
            key={currentPlayingSong?.song.youtubeId}
            videoId={currentPlayingSong?.song.youtubeId}
            opts={{
              playerVars: {
                autoplay: 1,
                start: startAtTime,
              },
            }}
            onReady={onPlayerReady}
            onEnd={() => {
              void fetch("/api/update-queue");
            }}
            className="invisible h-0 w-0"
          />
        )}
        {!firstInteractionDone ? (
          <div className="text-center text-3xl font-semibold">
            Click anywhere to start
          </div>
        ) : (
          <div className="flex h-full w-full justify-center gap-x-4">
            <div className="flex w-11/12 flex-col rounded-md bg-white bg-opacity-10">
              <div className="flex gap-x-3 p-2">
                <img
                  src={
                    currentPlayingSong?.song.thumbnailUrl ||
                    "https://media.discordapp.net/attachments/1092478783359045824/1137421971223760937/image.png?width=361&height=617"
                  }
                  alt=""
                  className="h-24 w-24 rounded-sm"
                />
                <div className="flex flex-col items-start">
                  <p className="max-w-72 text-sm md:text-base">
                    {currentPlayingSong?.song.title || "No song playing"}
                  </p>
                  <p className="max-w-72 text-xs opacity-80 md:text-sm">
                    {currentPlayingSong?.song.album || "-"}
                  </p>
                  <p className="max-w-72 text-xs opacity-80 md:text-sm">
                    {currentPlayingSong?.song.artists
                      ?.map((artist) => artist.name)
                      .join(", ") || "-"}
                  </p>
                  <p className="max-w-72 text-xs opacity-80 md:text-sm">
                    {youtubePlayerRef.current?.getCurrentTime()
                      ? new Date(
                          youtubePlayerRef.current?.getCurrentTime() * 1000
                        )
                          .toISOString()
                          .slice(14, 19)
                      : "00:00"}
                    /
                    {currentPlayingSong
                      ? new Date(
                          (currentPlayingSong?.song.duration
                            ?.totalSeconds as number) * 1000
                        )
                          .toISOString()
                          .slice(14, 19)
                      : "00:00"}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-16 bg-black bg-opacity-50 p-4 text-white"
                placeholder="Search for a song"
              />
              <div className="h-full max-h-96 overflow-y-auto">
                {searchQuery ? (
                  searchResults.map((result) => (
                    <div
                      key={result.youtubeId}
                      className="flex h-24 cursor-pointer bg-cover bg-center transition-all hover:scale-95"
                      style={{ backgroundImage: `url(${result.thumbnailUrl})` }}
                      onClick={() => queueSong(result)}
                    >
                      <div className="flex w-full items-center justify-center bg-opacity-50 bg-gradient-to-t from-gray-900 to-transparent backdrop-blur-sm">
                        {result.title}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-semibold">
                    <p className="cursor-default select-none opacity-10">
                      Start searching to see results
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex w-2/6 flex-col rounded-md bg-white bg-opacity-10">
              <p className="border-b-2 border-white border-opacity-20 p-2 font-bold tracking-wide text-gray-200">
                Queue
              </p>
              <div className="h-full overflow-y-auto">
                {queue?.map((song) => (
                  <SongCard key={song.song.youtubeId} songInfo={song} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

const SongCard = ({ songInfo }: { songInfo: QueuedMusicVideo }) => {
  return (
    <div className="flex gap-x-3 p-2">
      <img src={songInfo?.song.thumbnailUrl} alt="" className="h-24 w-24" />
      <div className="flex flex-col items-start">
        <p className="max-w-72 text-xs md:text-sm">{songInfo?.song.title}</p>
        <p className="max-w-72 text-xs opacity-80 md:text-xs">
          {songInfo?.song.album}
        </p>
        <p className="max-w-72 text-xs opacity-80 md:text-xs">
          {songInfo?.song.artists?.map((artist) => artist.name).join(", ")}
        </p>
        <p className="max-w-72 mt-auto text-xs opacity-80 md:text-xs">
          Queued by {songInfo?.userId}
        </p>
      </div>
    </div>
  );
};
