"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Guess {
  word: string;
  result: ("correct" | "present" | "absent")[];
}

type GameStatus = "playing" | "won" | "lost" | "loading" | "error";
type KeyStatus = Record<string, "correct" | "present" | "absent">;

const COMMON_WORDS = [
  "AUDIO",
  "CANOE",
  "HOUSE",
  "LOUSY",
  "MOUSE",
  "ROAST",
  "STEAM",
  "TEARS",
  "AROSE",
  "RAISE",
  "ALONE",
  "SLATE",
  "CRATE",
  "SLANT",
  "TRACE",
  "LANCE",
  "TALES",
  "STEAL",
];

const Wordra: React.FC = () => {
  const [targetWord, setTargetWord] = useState<string>("");
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentRow, setCurrentRow] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("loading");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({});
  const [isClient, setIsClient] = useState<boolean>(false);
  const [invalidWord, setInvalidWord] = useState<boolean>(false);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [validWords, setValidWords] = useState<Set<string>>(new Set());

  const fetchWords = useCallback(async () => {
    try {
      setGameStatus("loading");

      const response = await fetch(
        "https://api.datamuse.com/words?sp=?????&max=1000"
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const words = data
          .map((item: { word: string }) => item.word.toUpperCase())
          .filter(
            (word: string) =>
              word.length === 5 &&
              /^[A-Z]+$/.test(word) && // Only letters
              !word.includes("-") && // No hyphens
              !word.includes("'") // No apostrophes
          );

        if (words.length > 50) {
          setAvailableWords(words);
          setValidWords(new Set([...words, ...COMMON_WORDS]));
          setGameStatus("playing");
          return;
        }
      }

      throw new Error("Insufficient words from API");
    } catch (error) {
      console.error("Failed to fetch words:", error);
      setGameStatus("error");
    }
  }, []);

  const initializeGame = useCallback(() => {
    if (availableWords.length > 0) {
      const randomWord =
        availableWords[Math.floor(Math.random() * availableWords.length)];
      setTargetWord(randomWord);
      setCurrentGuess("");
      setGuesses([]);
      setCurrentRow(0);
      setGameStatus("playing");
      setShowModal(false);
      setKeyStatus({});
      setInvalidWord(false);
    }
  }, [availableWords]);

  useEffect(() => {
    setIsClient(true);
    fetchWords();
  }, [fetchWords]);

  useEffect(() => {
    if (availableWords.length > 0 && !targetWord) {
      initializeGame();
    }
  }, [availableWords, targetWord, initializeGame]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== "playing") return;

      if (key === "ENTER") {
        if (currentGuess.length === 5) {
          if (validWords.has(currentGuess)) {
            setInvalidWord(false);
            submitGuess();
          } else {
            setInvalidWord(true);
            setTimeout(() => setInvalidWord(false), 1500);
          }
        }
      } else if (key === "⌫" || key === "BACKSPACE") {
        setCurrentGuess((prev: string) => prev.slice(0, -1));
        setInvalidWord(false);
      } else if (key.match(/[A-Z]/) && currentGuess.length < 5) {
        setCurrentGuess((prev: string) => prev + key);
        setInvalidWord(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentGuess, gameStatus, validWords]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === "ENTER") {
        handleKeyPress("ENTER");
      } else if (key === "BACKSPACE") {
        handleKeyPress("⌫");
      } else if (key.match(/[A-Z]/)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const submitGuess = () => {
    const newGuess: Guess = {
      word: currentGuess,
      result: checkGuess(currentGuess, targetWord),
    };

    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    const newKeyStatus = { ...keyStatus };
    for (let i = 0; i < currentGuess.length; i++) {
      const letter = currentGuess[i];
      const status = newGuess.result[i];

      if (
        !newKeyStatus[letter] ||
        (newKeyStatus[letter] === "absent" && status !== "absent") ||
        (newKeyStatus[letter] === "present" && status === "correct")
      ) {
        newKeyStatus[letter] = status;
      }
    }
    setKeyStatus(newKeyStatus);

    if (currentGuess === targetWord) {
      setGameStatus("won");
      setTimeout(() => setShowModal(true), 1000);
    } else if (currentRow === 5) {
      setGameStatus("lost");
      setTimeout(() => setShowModal(true), 1000);
    } else {
      setCurrentRow((prev: number) => prev + 1);
    }

    setCurrentGuess("");
  };

  const checkGuess = (
    guess: string,
    target: string
  ): ("correct" | "present" | "absent")[] => {
    const result: ("correct" | "present" | "absent")[] = new Array(5).fill(
      "absent"
    );
    const targetArray = target.split("");
    const guessArray = guess.split("");

    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === targetArray[i]) {
        result[i] = "correct";
        targetArray[i] = "";
        guessArray[i] = "";
      }
    }

    for (let i = 0; i < 5; i++) {
      if (guessArray[i] && targetArray.includes(guessArray[i])) {
        result[i] = "present";
        const targetIndex = targetArray.indexOf(guessArray[i]);
        if (targetIndex !== -1) {
          targetArray[targetIndex] = "";
        }
      }
    }

    return result;
  };

  const getCellStyle = (
    status: "correct" | "present" | "absent" | "" | undefined
  ): string => {
    switch (status) {
      case "correct":
        return "bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/30";
      case "present":
        return "bg-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/30";
      case "absent":
        return "bg-gray-700 border-gray-600 text-white";
      default:
        return "border-gray-600/50 bg-gray-900/50 text-white";
    }
  };

  const getKeyStyle = (letter: string): string => {
    const status = keyStatus[letter];
    const baseStyle =
      "w-12 h-12 font-semibold rounded-lg border transition-all duration-200 hover:scale-105";

    switch (status) {
      case "correct":
        return `${baseStyle} bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/30`;
      case "present":
        return `${baseStyle} bg-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/30`;
      case "absent":
        return `${baseStyle} bg-gray-800 border-gray-700 text-gray-400`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-700 to-gray-800 hover:from-purple-600 hover:to-purple-700 text-white border-gray-600/50 hover:shadow-lg hover:shadow-purple-500/30`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {isClient && (
        <div className="absolute inset-0">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-80 animate-pulse"
              style={{
                left: `${(i * 7) % 100}%`,
                top: `${(i * 13) % 100}%`,
                width: `${(i % 3) + 1}px`,
                height: `${(i % 3) + 1}px`,
                animationDelay: `${i % 3}s`,
                animationDuration: `${(i % 2) + 1}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-32 right-32 w-80 h-80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 tracking-wider">
            WORDRA
          </h1>
          <p className="text-gray-300 text-lg font-light tracking-wide">
            Guess a 5 letter word in 6 tries
          </p>
          {gameStatus === "loading" && (
            <div className="mt-4 text-cyan-400 font-semibold animate-pulse">
              Loading word dictionary...
            </div>
          )}
          {gameStatus === "error" && (
            <div className="mt-4 text-red-400 font-semibold">
              Failed to load words. Please refresh the page.
            </div>
          )}
          {invalidWord && gameStatus === "playing" && (
            <div className="mt-4 text-red-400 font-semibold animate-pulse">
              Not a valid word!
            </div>
          )}
        </div>

        {gameStatus !== "error" && (
          <div className="mb-8 p-6 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl">
            <div className="grid grid-rows-6 gap-2">
              {[...Array(6)].map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, colIndex) => {
                    let letter = "";
                    let status: "correct" | "present" | "absent" | undefined;

                    if (rowIndex < guesses.length) {
                      letter = guesses[rowIndex].word[colIndex] || "";
                      status = guesses[rowIndex].result[colIndex];
                    } else if (rowIndex === currentRow) {
                      letter = currentGuess[colIndex] || "";
                    }

                    return (
                      <div
                        key={colIndex}
                        className={`w-16 h-16 border-2 rounded-lg backdrop-blur-sm flex items-center justify-center text-2xl font-bold transition-all duration-300 ${getCellStyle(
                          status
                        )} ${
                          rowIndex === currentRow &&
                          colIndex === currentGuess.length
                            ? "border-cyan-400/70 shadow-lg shadow-cyan-400/20"
                            : ""
                        } ${
                          invalidWord && rowIndex === currentRow
                            ? "animate-bounce border-red-400"
                            : ""
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {gameStatus !== "error" && (
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl p-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-center gap-1">
                {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map(
                  (letter) => (
                    <button
                      key={letter}
                      onClick={() => handleKeyPress(letter)}
                      disabled={gameStatus === "loading"}
                      className={`cursor-pointer ${getKeyStyle(letter)} ${
                        gameStatus === "loading"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {letter}
                    </button>
                  )
                )}
              </div>

              <div className="flex justify-center gap-1">
                {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    disabled={gameStatus === "loading"}
                    className={`cursor-pointer ${getKeyStyle(letter)} ${
                      gameStatus === "loading"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-1">
                <button
                  onClick={() => handleKeyPress("ENTER")}
                  disabled={gameStatus === "loading"}
                  className={`cursor-pointer px-4 h-12 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold rounded-lg border border-green-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 ${
                    gameStatus === "loading"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  ENTER
                </button>
                {["Z", "X", "C", "V", "B", "N", "M"].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    disabled={gameStatus === "loading"}
                    className={`cursor-pointer ${getKeyStyle(letter)} ${
                      gameStatus === "loading"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={() => handleKeyPress("⌫")}
                  disabled={gameStatus === "loading"}
                  className={`cursor-pointer px-4 h-12 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-lg border border-red-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30 hover:scale-105 ${
                    gameStatus === "loading"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                {gameStatus === "won" ? (
                  <div>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                      Congratulations!
                    </h2>
                    <p className="text-gray-300 text-lg">
                      You guessed the word in {guesses.length}{" "}
                      {guesses.length === 1 ? "try" : "tries"}!
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4">😔</div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-2">
                      Game Over
                    </h2>
                    <p className="text-gray-300 text-lg mb-4">The word was:</p>
                    <div className="text-3xl font-bold text-cyan-400 tracking-wider mb-4">
                      {targetWord}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={initializeGame}
                className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wordra;
