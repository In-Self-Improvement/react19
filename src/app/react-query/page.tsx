"use client";
import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  isFavorite: boolean;
  nickname?: string;
  id: number;
}

// context 타입 정의
type MutationContext = {
  previousPokemon: Pokemon | undefined;
};

export default function ReactQueryPage() {
  const [isPolling, setIsPolling] = useState(false);
  const [shouldFail, setShouldFail] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: pokemon,
    error,
    isLoading,
    isError,
    failureCount,
    refetch,
    isFetching,
  } = useQuery<Pokemon, Error>({
    queryKey: ["pokemon"],
    queryFn: async () => {
      const randomId = Math.floor(Math.random() * 151) + 1;
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${randomId}`,
        { cache: "no-store" }
      );
      if (shouldFail) throw new Error("Failed to fetch data");
      if (!response.ok) throw new Error("Failed to fetch data");
      return response.json();
    },
    retry: 3,
    retryDelay: 1000,
    refetchInterval: isPolling ? 5000 : false,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ isFavorite }: { isFavorite: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (shouldFail) {
        throw new Error("서버 에러가 발생했습니다!");
      }

      return { isFavorite };
    },
    onMutate: async ({ isFavorite }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["pokemon"] });
      const previousPokemon = queryClient.getQueryData<Pokemon>(["pokemon"]);

      queryClient.setQueryData<Pokemon>(["pokemon"], (old) => ({
        ...old!,
        isFavorite,
      }));

      return { previousPokemon };
    },
    onError: (
      err: Error,
      variables: { id: number; isFavorite: boolean },
      context?: MutationContext
    ) => {
      if (context?.previousPokemon) {
        queryClient.setQueryData(["pokemon"], context.previousPokemon);
      }
      alert("즐겨찾기 처리에 실패했습니다!");
    },
  });

  const nicknameMutation = useMutation({
    mutationFn: async (nickname: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (shouldFail) {
        throw new Error("서버 에러가 발생했습니다!");
      }

      return { nickname };
    },
    onMutate: async (nickname) => {
      await queryClient.cancelQueries({ queryKey: ["pokemon"] });
      const previousPokemon = queryClient.getQueryData<Pokemon>(["pokemon"]);

      queryClient.setQueryData<Pokemon>(["pokemon"], (old) => ({
        ...old!,
        nickname,
      }));

      return { previousPokemon };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["pokemon"], context?.previousPokemon);
      alert("닉네임 설정에 실패했습니다!");
    },
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
          {isFetching ? "로딩중..." : "랜덤 포켓몬 가져오기"}
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
        <button
          onClick={() => setShouldFail(!shouldFail)}
          className={`${
            shouldFail
              ? "bg-red-500 hover:bg-red-600"
              : "bg-yellow-500 hover:bg-yellow-600"
          } text-white px-4 py-2 rounded`}
        >
          {shouldFail ? "에러 모드 ON" : "에러 모드 OFF"}
        </button>
        {pokemon && (
          <>
            <button
              onClick={() =>
                favoriteMutation.mutate({
                  id: pokemon.id,
                  isFavorite: !pokemon.isFavorite,
                })
              }
              className={`p-2 rounded ${
                pokemon.isFavorite
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              disabled={favoriteMutation.isPending}
            >
              ⭐
            </button>
            <button
              onClick={() => {
                const nickname = prompt("새로운 닉네임을 입력하세요:");
                if (nickname) nicknameMutation.mutate(nickname);
              }}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
              disabled={nicknameMutation.isPending}
            >
              닉네임 설정
            </button>
          </>
        )}
      </div>

      {failureCount > 0 && failureCount < 4 && (
        <p className="text-yellow-400 mb-4">재시도 중... ({failureCount}/3)</p>
      )}

      {pokemon && (
        <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl capitalize">
              {pokemon.nickname || pokemon.name}
              {(nicknameMutation.isPending || favoriteMutation.isPending) && (
                <span className="text-yellow-400 text-sm ml-2">
                  (처리 중...)
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  favoriteMutation.mutate({
                    id: pokemon.id,
                    isFavorite: !pokemon.isFavorite,
                  })
                }
                className={`p-2 rounded ${
                  pokemon.isFavorite
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
                disabled={favoriteMutation.isPending}
              >
                ⭐
              </button>
              <button
                onClick={() => {
                  const nickname = prompt("새로운 닉네임을 입력하세요:");
                  if (nickname) nicknameMutation.mutate(nickname);
                }}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
                disabled={nicknameMutation.isPending}
              >
                닉네임 설정
              </button>
            </div>
          </div>
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
