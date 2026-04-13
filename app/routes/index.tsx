import { eq, and, gte, lte } from 'drizzle-orm'
import { useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
import { db } from '~/.server/db'
import { workoutLogs } from '~/.server/db/schema'

const JST_OFFSET = 9 * 60 * 60 * 1000

function jstDateStr(d: Date) {
  return new Date(d.getTime() + JST_OFFSET).toISOString().slice(0, 10)
}

function jstWeekRange(now: Date) {
  let jst = new Date(now.getTime() + JST_OFFSET)
  let day = jst.getUTCDay()
  let mondayJst = new Date(jst)
  mondayJst.setUTCDate(jst.getUTCDate() - ((day + 6) % 7))
  mondayJst.setUTCHours(0, 0, 0, 0)
  let sundayJst = new Date(mondayJst)
  sundayJst.setUTCDate(mondayJst.getUTCDate() + 7)
  return {
    monday: new Date(mondayJst.getTime() - JST_OFFSET),
    sunday: new Date(sundayJst.getTime() - JST_OFFSET - 1),
    mondayJst,
  }
}

export async function loader() {
  let now = new Date()
  let { monday, sunday, mondayJst } = jstWeekRange(now)

  let logs = await db
    .select()
    .from(workoutLogs)
    .where(
      and(
        gte(workoutLogs.completed_at, monday),
        lte(workoutLogs.completed_at, sunday),
      ),
    )
    .orderBy(workoutLogs.completed_at)

  let weekDays = Array.from({ length: 7 }, (_, i) => {
    let date = new Date(mondayJst)
    date.setUTCDate(mondayJst.getUTCDate() + i)
    let dateStr = date.toISOString().slice(0, 10)
    let done = logs.some((l) => jstDateStr(l.completed_at) === dateStr)
    return { date: dateStr, done }
  })

  let count = logs.length
  let todayStr = jstDateStr(now)
  let doneToday = logs.some((l) => jstDateStr(l.completed_at) === todayStr)

  return { weekDays, count, doneToday, goal: 3 }
}

export async function action() {
  let now = new Date()
  let jst = new Date(now.getTime() + JST_OFFSET)
  let todayStartJst = new Date(jst)
  todayStartJst.setUTCHours(0, 0, 0, 0)
  let todayStart = new Date(todayStartJst.getTime() - JST_OFFSET)
  let todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  let existing = await db
    .select()
    .from(workoutLogs)
    .where(
      and(
        gte(workoutLogs.completed_at, todayStart),
        lte(workoutLogs.completed_at, todayEnd),
      ),
    )

  if (existing.length > 0) {
    return { ok: true }
  }

  await db.insert(workoutLogs).values({ completed_at: now })
  return { ok: true }
}

const PRAISE = [
  '最高！💪 その調子！',
  'ナイス腹筋！🔥 えらい！',
  'がんばったね！✨ かっこいい！',
  '今日もやりきった！🎉 すごい！',
  'お腹バキバキへの道！💎',
]

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default function Page() {
  let { weekDays, count, doneToday, goal } = useLoaderData<typeof loader>()
  let fetcher = useFetcher()
  let [showPraise, setShowPraise] = useState(false)

  let justCompleted = fetcher.data?.ok
  let effectiveDoneToday = doneToday || justCompleted
  let effectiveCount = justCompleted && !doneToday ? count + 1 : count
  let reached = effectiveCount >= goal

  function handleClick() {
    fetcher.submit(null, { method: 'post' })
    setShowPraise(true)
    setTimeout(() => setShowPraise(false), 3000)
  }

  let praise = PRAISE[Math.floor(Math.random() * PRAISE.length)]

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 py-16">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🏋️ 腹筋トラッカー</h1>
        <p className="text-base-content/60">週3回やろう！</p>
      </header>

      {/* 週間カレンダー */}
      <div className="flex gap-2">
        {weekDays.map((day, i) => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="text-xs text-base-content/50">{DAY_LABELS[i]}</span>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                day.done
                  ? 'bg-success text-success-content scale-110'
                  : 'bg-base-200 text-base-content/30'
              }`}
            >
              {day.done ? '✅' : '○'}
            </div>
          </div>
        ))}
      </div>

      {/* 進捗 */}
      <div className="text-center">
        <p className="text-5xl font-bold">
          <span className={reached ? 'text-success' : ''}>{effectiveCount}</span>
          <span className="text-base-content/30 text-2xl"> / {goal}</span>
        </p>
        {reached && (
          <p className="mt-2 text-success font-semibold animate-bounce">
            🎊 今週の目標達成！！
          </p>
        )}
      </div>

      {/* ポチッとボタン */}
      {!effectiveDoneToday ? (
        <button
          className="btn btn-primary btn-lg btn-wide text-xl shadow-lg hover:scale-105 transition-transform"
          onClick={handleClick}
          disabled={fetcher.state !== 'idle'}
        >
          {fetcher.state !== 'idle' ? (
            <span className="loading loading-spinner" />
          ) : (
            '💪 やった！'
          )}
        </button>
      ) : (
        <div className="btn btn-success btn-lg btn-wide text-xl no-animation cursor-default">
          ✅ 今日はクリア！
        </div>
      )}

      {/* 褒め */}
      {showPraise && (
        <div className="animate-bounce text-2xl font-bold text-primary text-center">
          {praise}
        </div>
      )}
    </main>
  )
}
