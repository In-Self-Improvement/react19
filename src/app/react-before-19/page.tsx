"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Pokemon {
  name: string;
  sprites: {
    front_default: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
}

export default function ReactBefore19Page() {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const getRandomPokemonId = () => Math.floor(Math.random() * 151) + 1;

  const fetchData = useCallback(async () => {
    const randomId = getRandomPokemonId();
    setIsLoading(true);
    setRetryCount(0);

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setPokemon(result);
      setError(null);
    } catch (err) {
      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        setTimeout(() => fetchData(), 1000);
        return;
      }
      setError(
        err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  // 폴링 설정
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPolling) {
      fetchData(); // 초기 데이터 로드
      interval = setInterval(fetchData, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, fetchData]);

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">React 19 이전 버전 예제</h1>
      <p className="text-gray-400 mb-4">
        이 예제는 React 19 이전의 기본 기능으로 구현된 데이터 페칭입니다.
        <br />
        useState와 useEffect를 조합하여 구현해야 합니다.
      </p>
      {error && <p className="text-red-400 mb-4">Error: {error}</p>}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => fetchData()}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-600"
        >
          {isLoading ? "로딩중..." : "랜덤 포켓몬 가져오기"}
        </button>
        <button
          onClick={() => setIsPolling(!isPolling)}
          className={`${
            isPolling
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white px-4 py-2 rounded`}
        >
          {isPolling ? "자동 갱신 중지" : "5초마다 자동 갱신 시작"}
        </button>
      </div>

      {retryCount > 0 && (
        <p className="text-yellow-400 mb-4">재시도 중... ({retryCount}/3)</p>
      )}

      {pokemon && (
        <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
          <h2 className="text-xl capitalize mb-2">{pokemon.name}</h2>
          <Image
            src={pokemon.sprites.front_default}
            alt={pokemon.name}
            width={150}
            height={150}
            className="bg-gray-700 rounded-lg"
          />
          <div className="flex gap-2 mt-4">
            {pokemon.types.map(({ type }) => (
              <span
                key={type.name}
                className="px-2 py-1 bg-gray-700 text-gray-100 rounded-full text-sm"
              >
                {type.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
