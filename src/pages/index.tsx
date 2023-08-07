import Head from "next/head";
import { MusicVideo } from "node-youtube-music";
import { useEffect, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import useAudioTime from "~/hooks/useAudioTime";

const searchMusics = async (query: string) => {
  const result = await fetch(`/api/search-musics?query=${query}`);
  return await result.json();
};

export default function Home() {
  const [firstInteractionDone, setFirstInteractionDone] =
    useState<boolean>(false);
  const [currentPlayingSong, setCurrentPlayingSong] =
    useState<MusicVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MusicVideo[]>([]);
  const { load, play, isReady, duration } = useGlobalAudioPlayer();
  const pos = useAudioTime();

  useEffect(() => {
    if (!currentPlayingSong) return;
    console.log(currentPlayingSong);
    load(`/api/get-audio-stream?id=${currentPlayingSong?.youtubeId}`, {
      html5: true,
      autoplay: true,
      format: "mp3",
    });
  }, [currentPlayingSong]);

  useEffect(() => {
    if (!firstInteractionDone) return;

    play();
  }, [firstInteractionDone]);

  useEffect(() => {
    if (searchQuery === "") return;

    searchMusics(searchQuery).then((result) => setSearchResults(result));
  }, [searchQuery]);

  useEffect(() => {
    searchMusics(
      'Nocturne in B Flat Minor, Op. 9 No. 1: "A Madame Camille Pleyel"'
    ).then((result) => {
      setCurrentPlayingSong(result[0]);
    });
  }, []);

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
        className="flex h-screen flex-col items-center justify-center bg-black p-24 text-white"
        onClick={() => setFirstInteractionDone(true)}
      >
        {!firstInteractionDone ? (
          <div className="text-3xl font-semibold">Click anywhere to start</div>
        ) : (
          <div className="flex w-4/5 flex-col rounded-md bg-white bg-opacity-10 text-center">
            <div className="flex gap-x-3 p-2">
              <img
                src={currentPlayingSong?.thumbnailUrl}
                alt=""
                className="h-24 w-24"
              />
              <div className="flex flex-col items-start">
                <p className="max-w-72">{currentPlayingSong?.title}</p>
                <p className="max-w-72 text-sm opacity-80">
                  {currentPlayingSong?.album}
                </p>
                <p className="max-w-72 text-sm opacity-80">
                  {currentPlayingSong?.artists
                    ?.map((artist) => artist.name)
                    .join(", ")}
                </p>
                <p className="max-w-72 text-sm opacity-80">
                  {new Date(pos * 1000).toISOString().slice(14, 19)}/
                  {new Date(duration * 1000).toISOString().slice(14, 19)}
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
            <div className="max-h-96 overflow-y-scroll">
              {searchQuery &&
                searchResults.map((result) => (
                  <div
                    key={result.youtubeId}
                    className="flex h-24 cursor-pointer bg-cover bg-center transition-all hover:scale-95"
                    style={{ backgroundImage: `url(${result.thumbnailUrl})` }}
                    onClick={() => setCurrentPlayingSong(result)}
                  >
                    <div className="flex w-full items-center justify-center bg-opacity-50 bg-gradient-to-t from-gray-900 to-transparent backdrop-blur-sm">
                      {result.title}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
