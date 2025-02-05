# React 19와 이전 버전의 데이터 페칭 비교

![Image](https://github.com/user-attachments/assets/37f3e456-f2ee-4d9b-a276-cf7cd31e415d)

## 1. 데이터 페칭의 기본 요구사항

웹 애플리케이션에서 데이터 페칭 시 필요한 핵심 기능들:

1. **자동 재시도**

   - 네트워크 오류 발생 시 자동으로 재시도
   - 최대 재시도 횟수 제한
   - 재시도 중인 상태 표시

2. **주기적인 데이터 갱신**

   - 일정 간격으로 데이터 자동 갱신
   - 갱신 시작/중지 기능
   - 백그라운드 갱신 중 UI 응답성 유지

3. **로딩 상태 관리**
   - 초기 로딩 상태
   - 데이터 갱신 중 상태
   - 에러 상태

## 2. React 19 이전 버전 구현

### 2.1 상태 관리 방식

```typescript
const [pokemon, setPokemon] = useState<Pokemon | null>(null);
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [retryCount, setRetryCount] = useState(0);
```

- 각 상태를 개별적인 `useState`로 관리
- 상태 업데이트가 동기화되지 않을 수 있는 위험
- 여러 상태를 수동으로 관리해야 하는 복잡성

### 2.2 데이터 페칭 함수

```typescript
const fetchData = useCallback(async () => {
  setIsLoading(true);
  setRetryCount(0);

  try {
    const response = await fetch(`/api/data`);
    const result = await response.json();
    setPokemon(result);
    setError(null);
  } catch (err) {
    handleError(err);
  } finally {
    setIsLoading(false);
  }
}, [retryCount]);
```

- `try-catch-finally` 패턴으로 에러 처리
- 로딩 상태를 수동으로 관리
- `useCallback`으로 함수 메모이제이션 필요

### 2.3 자동 재시도 구현

```typescript
const handleError = (err: unknown) => {
  if (retryCount < 3) {
    setRetryCount((prev) => prev + 1);
    setTimeout(() => fetchData(), 1000);
    return;
  }
  setError(err instanceof Error ? err.message : "알 수 없는 에러");
};
```

- 재시도 로직을 수동으로 구현
- 타이머 관리 필요
- 의존성 관리가 복잡

### 2.4 메모리 누수 방지

```typescript
useEffect(() => {
  return () => {
    // cleanup 로직
    clearTimeout(retryTimeout);
    clearInterval(pollingInterval);
  };
}, []);
```

- 클린업 함수로 타이머 정리
- 비동기 작업 취소 처리 필요

---

## 3. React 19 버전 구현

### 3.1 useTransition을 활용한 상태 관리

```typescript
const [isPending, startTransition] = useTransition();
```

- 트랜지션 API로 상태 업데이트 최적화
- 자동으로 pending 상태 관리
- 우선순위 기반 렌더링

### 3.2 데이터 페칭 함수

```typescript
const fetchData = () => {
  startTransition(async () => {
    try {
      const response = await fetch(`/api/data`);
      const result = await response.json();
      setPokemon(result);
      setError(null);
    } catch (err) {
      handleError(err);
    }
  });
};
```

- 트랜지션으로 상태 업데이트 래핑
- 자동 로딩 상태 관리
- 더 간단한 에러 처리

### 3.3 성능 최적화

- `useTransition`이 자동으로 처리하는 것들:
  - 불필요한 리렌더링 방지
  - 우선순위 기반 업데이트
  - 렌더링 일괄 처리

---

## 4. React 19 이전 방식의 한계점

React 19 이전 방식의 주요 한계:

- **상태 동기화 문제**  
  여러 상태(`isLoading`, `retryCount`, `error`)를 개별적으로 관리하면서 동기화가 필요하고, 관리 포인트가 증가.

```typescript
useEffect(() => {
  if (isLoading && retryCount > 3) {
    setError("최대 재시도 횟수를 초과했습니다.");
    setIsLoading(false);
  }
}, [isLoading, retryCount]);
```

- **복잡한 재시도 로직**  
  타이머와 상태를 수동으로 관리해야 하므로 유지보수 부담 증가.

---

## 5. React 19 방식의 한계점

React 19의 주요 한계:

- **자동 재시도 및 타이머 관리 부족**  
  `useTransition`은 렌더링 최적화에 초점을 맞추며, 네트워크 관련 고급 기능은 포함되지 않음.

```typescript
const handleError = (err: unknown) => {
  if (retryCount < 3) {
    setTimeout(() => fetchData(), 1000);
  } else {
    setError(err instanceof Error ? err.message : "Unknown error");
  }
};
```

- **추가 로직 구현 필요**  
  자동화된 네트워크 상태 관리(예: 캐싱, 동기화)를 위해 추가적인 구현이 필요.

---

## 6. React 19와 이전 버전 비교

| 카테고리          | React 19 이전                                                                              | React 19                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **코드 구조**     | • 더 많은 보일러플레이트 코드<br>• 복잡한 상태 관리<br>• 수동적인 최적화 필요              | • 간결한 코드 구조<br>• 통합된 상태 관리<br>• 자동 최적화                               |
| **상태 관리**     | • 수동 메모이제이션 필요<br>• 상태 간 동기화 문제 발생 가능<br>• 여러 번의 리렌더링 가능성 | • 자동 최적화된 리렌더링<br>• 우선순위 기반 업데이트<br>• 트랜지션으로 상태 관리 단순화 |
| **개발자 경험**   | • 코드 작성량이 많아지고, 유지보수가 어려움<br>• 비동기 로직 간 불일치 발생 가능           | • 선언적인 코드 작성 가능<br>• 유지보수와 디버깅 용이                                   |
| **유지보수성**    | • 타이머 및 상태 간 의존성 관리로 복잡도 증가                                              | • 간결한 상태 관리로 유지보수 용이                                                      |
| **데이터 동기화** | • 상태 업데이트 간 동기화 관리 필요                                                        | • 트랜지션 기반으로 데이터 동기화 관리 간소화                                           |

## 7. React Query와의 비교

### 7.1 React Query 소개

React Query는 서버 상태 관리를 위한 강력한 라이브러리로, 데이터 페칭, 캐싱, 동기화, 업데이트를 효율적으로 처리합니다.

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["pokemon"],
  queryFn: async () => {
    const response = await fetch(`/api/pokemon/${id}`);
    return response.json();
  },
  retry: 3,
  retryDelay: 1000,
});
```

### 7.2 React Query vs useTransition 기능 비교

| 항목                   | **React Query**                                                      | **useTransition**                                                     |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **데이터 캐싱**        | ✅ 자동 캐싱 (`staleTime`, `cacheTime` 설정 가능)                    | ❌ 없음 (매번 새로운 요청 필요)                                       |
| **자동 재시도**        | ✅ 실패 시 자동 재시도 (`retry` 옵션 지원)                           | ❌ 직접 재시도 로직 구현 필요                                         |
| **에러 핸들링**        | ✅ `isError`, `error` 제공                                           | ❌ `try-catch` 사용해 직접 처리해야 함                                |
| **백그라운드 리페칭**  | ✅ 데이터가 오래되면 자동 리페칭                                     | ❌ 직접 `setInterval` 등을 사용해 구현해야 함                         |
| **데이터 일관성 유지** | ✅ 여러 컴포넌트에서 동일한 `queryKey`를 공유하여 일관된 데이터 유지 | ❌ 상태가 개별 컴포넌트에 국한됨                                      |
| **UI 업데이트 방식**   | ✅ Suspense 지원으로 동시성 처리 가능 (`suspense: true`)             | ✅ UI 업데이트를 낮은 우선순위로 실행 가능                            |
| **인터랙션 반응성**    | ✅ 백그라운드 갱신으로 UI 반응성 유지 (`keepPreviousData` 활용 가능) | ✅ 사용자 입력을 방해하지 않음                                        |
| **코드 복잡도**        | ✅ `useQuery` 하나로 데이터 페칭 및 상태 관리 가능                   | ❌ `useState`, `useEffect`, `useTransition`을 조합해 직접 구현해야 함 |

### 7.3 각 접근 방식의 장단점

#### React Query

👍 **장점**:

- 선언적이고 간결한 API
- 자동화된 캐싱과 상태 관리
- 풍부한 내장 기능 (재시도, 폴링, 캐싱 등)
- React 18+ Suspense 지원

👎 **단점**:

- 추가 번들 사이즈
- 새로운 API 학습 필요
- 작은 프로젝트에는 과도할 수 있음

#### useTransition

👍 **장점**:

- React 기본 기능으로 추가 의존성 없음
- 렌더링 최적화에 특화
- 세밀한 제어 가능

👎 **단점**:

- 많은 보일러플레이트 코드
- 수동 상태 관리 필요
- 고급 기능 직접 구현 필요

### 7.4 사용 추천 시나리오

#### React Query 사용이 좋은 경우:

- 서버 상태 관리가 중요한 애플리케이션
- 복잡한 데이터 요구사항이 있는 경우
- 빠른 개발이 필요한 프로젝트
- 자동화된 캐싱과 데이터 동기화가 필요한 경우

#### useTransition 사용이 좋은 경우:

- UI 반응성이 매우 중요한 경우
- 간단한 데이터 페칭만 필요한 경우
- 최소한의 의존성으로 프로젝트 구성 필요
- 렌더링 성능 최적화가 주요 관심사인 경우

## 8. 결론

- React 19의 `useTransition`은 UI 업데이트의 우선순위를 관리하는 강력한 도구입니다.
- React Query는 서버 상태 관리를 위한 완벽한 솔루션을 제공합니다.
- 두 도구는 서로 상호 보완적이며, 함께 사용하면 더 나은 사용자 경험을 제공할 수 있습니다.
- 프로젝트의 요구사항과 규모에 따라 적절한 도구를 선택하거나 조합하여 사용하는 것이 중요합니다.
