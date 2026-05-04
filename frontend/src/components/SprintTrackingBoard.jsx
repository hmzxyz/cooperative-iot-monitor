import { useMemo, useState } from 'react'
import { sprintTasks as defaultTasks } from '../data/sprintTasks.js'

/**
 * Sprint Tracking Board Component
 * Shows the current AI sprint workstream without depending on a runtime fetch.
 */
export default function SprintTrackingBoard() {
  const [tasks, setTasks] = useState(defaultTasks)

  const { totalTasks, completedTasks, progress } = useMemo(() => {
    const completed = tasks.filter((task) => task.done).length
    const total = tasks.length
    return {
      totalTasks: total,
      completedTasks: completed,
      progress: total > 0 ? (completed / total) * 100 : 0,
    }
  }, [tasks])

  return (
    <div className="sprint-tracking-board">
      <div className="sprint-header">
        <div>
          <p className="section-kicker">Current sprint</p>
          <h3>Technician Auth + AI Cleanup</h3>
        </div>
        <div className="sprint-stats">
          <span>{completedTasks}/{totalTasks} done</span>
          <span className="sprint-progress">{progress.toFixed(0)}%</span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task.id} className={`task-item ${task.done ? 'completed' : ''}`}>
            <div className="task-header">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => {
                  setTasks((prev) => prev.map((current) => (
                    current.id === task.id
                      ? { ...current, done: !current.done }
                      : current
                  )))
                }}
              />
              <span className="task-title">{task.title}</span>
            </div>
            <div className="task-meta">
              <span className="task-owner">{task.owner}</span>
              {task.dueDate && <span className="task-due">Due: {task.dueDate}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
