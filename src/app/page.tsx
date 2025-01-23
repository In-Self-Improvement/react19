import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">React 19 vs React Query 데모</h1>
      <div className="flex flex-col gap-4">
        <Link href="/react19" className="text-blue-500 hover:underline">
          React 19 use 예제
        </Link>
        <Link href="/react-before-19" className="text-blue-500 hover:underline">
          기존 React 방식
        </Link>
      </div>
    </main>
  );
}
