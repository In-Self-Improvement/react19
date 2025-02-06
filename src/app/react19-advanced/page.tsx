"use client";
import { useState, useEffect, useTransition, useOptimistic } from "react";
import Image from "next/image";

interface Pokemon {
  id: number;
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
}

// 2. ✅ 데이터 캐싱 (staleTime, cacheTime)
const cache = new Map<string, { data: Pokemon; timestamp: number }>();
const STALE_TIME = 10000; // 10초
const GC_TIME = 5 * 60 * 1000; // 5분

async function fetchWithCache(key: string, fetcher: () => Promise<Pokemon>) {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < STALE_TIME) {
    return cached.data;
  }

  try {
    const data = await fetcher();
    cache.set(key, { data, timestamp: now });

    // GC_TIME 후에 캐시 삭제
    setTimeout(() => {
      cache.delete(key);
    }, GC_TIME);

    return data;
  } catch (error) {
    throw error;
  }
}

// 데이터 페칭 훅
function usePokemonQuery(shouldFail: boolean, retryCount = 3) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [_, startTransition] = useTransition();

  // 3. ✅ 자동 재시도 (retry 옵션)
  const fetchPokemon = async (retry = 0) => {
    setIsFetching(true);
    if (!pokemon) setIsLoading(true);

    try {
      const randomId = Math.floor(Math.random() * 151) + 1;
      if (shouldFail) throw new Error("Failed to fetch data");

      const data = await fetchWithCache(`pokemon-${randomId}`, async () => {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${randomId}`,
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error("Failed to fetch data");
        const json = await response.json();
        return {
          ...json,
          isFavorite: false,
          nickname: undefined,
        };
      });

      startTransition(() => {
        setPokemon(data);
        setError(null);
        setFailureCount(0);
      });
    } catch (err) {
      if (retry < retryCount) {
        setTimeout(() => {
          fetchPokemon(retry + 1);
        }, 1000);
        setFailureCount(retry + 1);
      } else {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  return {
    pokemon,
    error,
    isLoading,
    isFetching,
    failureCount,
    refetch: () => fetchPokemon(),
    setPokemon,
  };
}

// 1. ✅ 자동 데이터 페칭 (useQuery) - 낙관적 업데이트를 위한 커스텀 훅
function usePokemonMutation<T>(
  mutationFn: (args: T) => Promise<Pokemon>,
  onSuccess?: (data: Pokemon) => void
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (args: T) => {
    try {
      const result = await mutationFn(args);
      onSuccess?.(result);
    } catch (err) {
      setError(err as Error);
    }
  };

  return {
    mutate: (args: T) => startTransition(() => mutate(args)),
    isPending,
    error,
  };
}

export default function React19Page() {
  const [isPolling, setIsPolling] = useState(false);
  const [shouldFail, setShouldFail] = useState(false);
  const {
    pokemon,
    error,
    isLoading,
    isFetching,
    failureCount,
    refetch,
    setPokemon,
  } = usePokemonQuery(shouldFail);

  // 4. ✅ 백그라운드 데이터 갱신 (refetchInterval)
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPolling, refetch]);

  // 즐겨찾기 mutation
  const [_, startTransition] = useTransition();
  // 7. ✅ 낙관적 UI 업데이트
  const [optimisticPokemon, setOptimisticPokemon] = useOptimistic(
    pokemon,
    (state, isFavorite: boolean) => ({
      ...state!,
      isFavorite,
    })
  );

  const favoriteMutation = usePokemonMutation(
    async ({ isFavorite }: { isFavorite: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (shouldFail) throw new Error("Failed to update favorite");
      return { isFavorite };
    },
    (result) => {
      setPokemon((prev) => (prev ? { ...prev, ...result } : prev));
    }
  );

  // 닉네임 mutation
  const nicknameMutation = usePokemonMutation(
    async (nickname: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (shouldFail) throw new Error("Failed to update nickname");
      return { nickname };
    },
    (result) => {
      setPokemon((prev) => (prev ? { ...prev, ...result } : prev));
    }
  );

  const handleFavoriteClick = () => {
    startTransition(() => {
      setOptimisticPokemon(!optimisticPokemon.isFavorite);
      favoriteMutation.mutate({
        isFavorite: !optimisticPokemon.isFavorite,
      });
    });
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">React 19 예제</h1>
      <p className="text-gray-400 mb-4">
        이 예제는 React 19 기능만으로 구현된 데이터 페칭입니다.
      </p>
      {error && <p className="text-red-400 mb-4">Error: {error.message}</p>}
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
      </div>

      {failureCount > 0 && failureCount < 4 && (
        <p className="text-yellow-400 mb-4">재시도 중... ({failureCount}/3)</p>
      )}

      {optimisticPokemon && (
        <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl capitalize">
              {optimisticPokemon.nickname || optimisticPokemon.name}
              {(nicknameMutation.isPending || favoriteMutation.isPending) && (
                <span className="text-yellow-400 text-sm ml-2">
                  (처리 중...)
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleFavoriteClick}
                className={`p-2 rounded ${
                  optimisticPokemon.isFavorite
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
                  if (nickname) {
                    nicknameMutation.mutate(nickname);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
                disabled={nicknameMutation.isPending}
              >
                닉네임 설정
              </button>
            </div>
          </div>
          <Image
            src={optimisticPokemon.sprites.front_default}
            alt={optimisticPokemon.name}
            width={150}
            height={150}
            className="bg-gray-700 rounded-lg"
          />
          <div className="flex gap-2 mt-4">
            {optimisticPokemon.types.map(({ type }) => (
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
