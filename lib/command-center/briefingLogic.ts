import type { CommandCenterState } from './types'
import { isDueToday, isOverdue, todayISO } from './utils'

export function generateDailyBriefing(state: CommandCenterState): string {
  const today = todayISO()
  const parts: string[] = []

  const mission = state.missionDate === today ? state.mission.trim() : ''
  const activeProjects = state.projects.filter(p => p.status === 'active')
  const openTasks = state.tasks.filter(t => t.status !== 'done')
  const todayTasks = openTasks.filter(t => isDueToday(t.dueDate, today) || t.priority === 'high')
  const overdueTasks = openTasks.filter(t => isOverdue(t.dueDate, today))
  const todayLog = state.dailyLogs.find(l => l.date === today)

  if (!mission) {
    parts.push('Set today\'s mission to give your day a clear anchor.')
  } else {
    parts.push(`Your mission today: "${mission}".`)
  }

  if (activeProjects.length === 0) {
    parts.push('Create an active project to give your work a home.')
  } else if (todayTasks.length > 0) {
    const top = todayTasks[0]
    parts.push(`Your main focus is "${top.title}"${top.priority === 'high' ? ' (high priority)' : ''}.`)
  } else if (openTasks.length > 0) {
    parts.push(`You have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} — pick one and move it forward.`)
  } else {
    parts.push('All tasks are complete. Consider setting new priorities or capturing what\'s next.')
  }

  if (overdueTasks.length > 0) {
    parts.push(`${overdueTasks.length} task${overdueTasks.length === 1 ? ' is' : 's are'} overdue — address ${overdueTasks.length === 1 ? 'it' : 'them'} soon.`)
  }

  if (activeProjects.length > 0) {
    const names = activeProjects.slice(0, 2).map(p => p.name).join(' and ')
    parts.push(`Move ${names} forward with one concrete action each.`)
  }

  if (todayLog) {
    if (todayLog.workoutCompleted) {
      parts.push('Workout is done — strong start on health.')
    } else {
      parts.push('Don\'t forget your health basics: log sleep, nutrition and movement.')
    }
  } else {
    parts.push('Fill in today\'s health snapshot to track the fundamentals.')
  }

  const inbox = state.captureItems.filter(c => c.status === 'inbox').length
  if (inbox > 0) {
    parts.push(`${inbox} captured item${inbox === 1 ? '' : 's'} waiting in your inbox.`)
  }

  return parts.join(' ')
}
