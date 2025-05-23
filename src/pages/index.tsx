import { get, onValue, ref } from "firebase/database";
import Head from "next/head";
import { MusicVideo } from "node-youtube-music";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
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

const facts = [
  "Benjamin's true name is actually 伟哥",
  "Choon Hong's favorite food is unsurprisingly sushi",
  "Yi Fan is not actually gay",
  "Zen An may actually be not gay",
  "The song 'STK Glorious' was actually originally written as the theme song for 'Ultraman'",
];

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
  const [loading, setLoading] = useState<boolean>(false);
  const startAtTime = useMemo(
    () => Math.round((Date.now() - currentPlayingStartTime) / 1000),
    [currentPlayingStartTime]
  );
  const youtubePlayerRef = useRef<YouTubePlayer>(null);
  const factOfTheDay = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * facts.length);
    return facts[randomIndex];
  }, []);

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
    updateQueue();
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
    updateQueue();
  }, []);

  const queueSong = async (song: MusicVideo) => {
    if (
      currentPlayingSong &&
      currentPlayingSong?.song.youtubeId === song.youtubeId
    ) {
      toast.error("This song is already playing, bodoh");
      return;
    } else if (
      queue?.some((queuedSong) => queuedSong.song.youtubeId === song.youtubeId)
    ) {
      toast.error("Dey this one alrd queued la");
      return;
    }
    setLoading(true);
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
    await updateQueue();
    setLoading(false);
  };

  const updateQueue = async (forceSkip = false) => {
    setLoading(true);
    await fetch("/api/update-queue" + (forceSkip ? "?forceSkip=true" : ""));
    setLoading(false);
  };

  const changeName = () => {
    const newName = prompt("Set a new name");
    if (newName && newName.trim().length > 0) {
      localStorage.setItem("userId", newName);
      setUserId(newName);
    }
  };

  const triviaTime = () => {
    alert(
      "You have stumbled upon a secret area! Answer correctly to get some interesting facts! (Come back occasionally for new questions)"
    );
    const triviaQuestions = [
      {
        q: "Who does choon hong like? (as a friend) (hint: type of food) (hint 2: starts with s)",
        a: "sushi",
        trivia: "Fun fact: choon hong is a sushi lover and pro sushi king",
      },
      {
        q: "Who is yifan best female friend? (hint: 2 same word repeated with space in between) (hint 2: total 6 letters, excluding space)",
        a: "hui hui",
        trivia:
          "Fun fact: Yi fan actually set xxx name as h_i h_i in his phone",
      },
    ] as { q: string; a: string; trivia: string }[];
    const triviaQuestion = triviaQuestions[
      Math.floor(Math.random() * triviaQuestions.length)
    ] as { q: string; a: string; trivia: string };
    const password = prompt(triviaQuestion.q);

    if (password?.toLowerCase() === triviaQuestion.a.toLowerCase()) {
      toast.success("Correct!");
      toast.info(triviaQuestion.trivia);
    } else {
      toast.error("Wrong!");
    }
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
        <div className="absolute top-2 cursor-crosshair select-none text-xs font-semibold opacity-20 transition-all hover:scale-105 hover:opacity-100">
          Did you know? {factOfTheDay}
        </div>
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
              updateQueue();
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
              <div className="relative h-full max-h-96 overflow-y-auto">
                <div
                  className={
                    "absolute z-10 flex h-full w-full items-center justify-center bg-black bg-opacity-80 transition-all" +
                    (loading ? " scale-100" : " scale-0")
                  }
                >
                  <div className="lds-grid">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} />
                    ))}
                  </div>
                </div>
                {searchQuery ? (
                  searchResults.map((result) => (
                    // <div
                    //   key={result.youtubeId}
                    //   className="flex h-24 cursor-pointer bg-cover bg-center transition-all hover:scale-95"
                    //   style={{ backgroundImage: `url(${result.thumbnailUrl})` }}
                    //   onClick={() => queueSong(result)}
                    // >
                    //   <div className="flex w-full items-center justify-center bg-opacity-50 bg-gradient-to-t from-gray-900 to-transparent backdrop-blur-sm">
                    //     {result.title}
                    //   </div>
                    // </div>
                    <SongCard
                      key={result.youtubeId}
                      songInfo={result}
                      onClick={() => queueSong(result)}
                    />
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
                  <SongCard
                    key={song.song.youtubeId}
                    songInfo={song.song}
                    queuedBy={song.userId}
                  />
                ))}
              </div>
              <button
                className={
                  "border border-white border-opacity-20 p-2 transition-all hover:scale-95" +
                  (loading ? " cursor-not-allowed opacity-50" : "")
                }
                onClick={() => {
                  setLoading(true);
                  updateQueue(true);
                }}
                disabled={loading}
              >
                Skip
              </button>
              <button
                className={
                  "border border-white border-opacity-20 p-2 transition-all hover:scale-95" +
                  (loading ? " cursor-not-allowed opacity-50" : "")
                }
                onClick={() => {
                  updateQueue();
                }}
                disabled={loading}
              >
                Manual update queue
              </button>
            </div>
          </div>
        )}
        <div
          onClick={() => changeName()}
          className="absolute bottom-2 left-2 cursor-pointer select-none text-xs opacity-30 transition-all hover:opacity-100"
        >
          ID: <b>{userId}</b>
        </div>
        <button
          className="absolute bottom-2 right-2 select-none text-xs opacity-30 transition-all hover:animate-spin hover:opacity-80"
          onClick={() => triviaTime()}
        >
          ?
        </button>
      </main>
    </>
  );
}

const SongCard = ({
  songInfo,
  onClick,
  queuedBy,
}: {
  songInfo: MusicVideo;
  onClick?: () => void;
  queuedBy?: string;
  onClickRemove?: () => void;
}) => {
  return (
    <div
      className={
        "flex gap-x-3 p-2" +
        (onClick ? " cursor-pointer transition-all hover:scale-95" : "")
      }
      onClick={onClick}
    >
      <img src={songInfo?.thumbnailUrl} alt="" className="h-24 w-24" />
      <div className="flex flex-col items-start">
        <p className="max-w-72 text-xs md:text-sm">{songInfo?.title}</p>
        <p className="max-w-72 text-xs opacity-80 md:text-xs">
          {songInfo?.album}
        </p>
        <p className="max-w-72 text-xs opacity-80 md:text-xs">
          {songInfo?.artists?.map((artist) => artist.name).join(", ")}
        </p>
        {queuedBy && (
          <p className="max-w-72 mt-auto text-xs opacity-80 md:text-xs">
            Queued by {queuedBy}
          </p>
        )}
      </div>
    </div>
  );
};
