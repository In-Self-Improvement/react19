"use client";
import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

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

export default function ReactQueryPage() {
  const [isPolling, setIsPolling] = useState(false);

  const {
    data: pokemon,
    error,
    isLoading,
    isError,
    failureCount,
    refetch,
  } = useQuery<Pokemon, Error>({
    queryKey: ["pokemon"],
    queryFn: async () => {
      const randomId = Math.floor(Math.random() * 151) + 1;
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      return response.json();
    },
    retry: 3,
    retryDelay: 1000,
    refetchInterval: isPolling ? 5000 : false,
    placeholderData: (previousData) => previousData,
  });

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">React Query 예제</h1>
      <p className="text-gray-400 mb-4">
        이 예제는 React Query로 구현된 데이터 페칭입니다.
        <br />
        캐싱, 재시도, 폴링 등이 내장 기능으로 제공됩니다.
      </p>
      {isError && <p className="text-red-400 mb-4">Error: {error.message}</p>}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => refetch()}
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

      {failureCount > 0 && failureCount < 4 && (
        <p className="text-yellow-400 mb-4">재시도 중... ({failureCount}/3)</p>
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
