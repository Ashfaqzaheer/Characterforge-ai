import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <main className="flex flex-col items-center gap-8 text-center max-w-2xl py-24">
        <h1 className="text-5xl font-bold tracking-tight">
          CharacterForge AI
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg">
          Create consistent AI-generated characters. Upload reference images,
          describe a scene, and get stunning visuals that keep your character
          looking the same every time.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-6 text-background font-medium transition-colors hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 text-left">
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold mb-2">Upload References</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Add 1-3 reference images to define your character&apos;s appearance.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold mb-2">Describe Scenes</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Write a prompt describing where and how you want your character depicted.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold mb-2">Generate Images</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              AI creates consistent images keeping your character&apos;s look intact.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
