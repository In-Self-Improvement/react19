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

## 7. 결론

- React 19 이전 방식은 복잡한 상태 동기화와 타이머 관리로 인해 코드의 유지보수가 어렵고, 반복 코드가 많습니다.
- React 19는 `useTransition`을 활용해 렌더링과 상태 관리를 최적화하지만, 데이터 페칭과 관련된 고급 기능(재시도, 캐싱 등)은 포함하지 않아 추가 구현이 필요합니다.
- 적절한 방식 선택은 프로젝트의 복잡성과 요구 사항에 따라 달라집니다.
