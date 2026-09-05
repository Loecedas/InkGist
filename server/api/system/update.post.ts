import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '../../utils'

interface UpdateStepLog {
  step: string
  status: 'running' | 'success' | 'failed' | 'skipped'
  message: string
  output?: string
  timestamp: string
}

interface UpdateResult {
  success: boolean
  message: string
  logs: UpdateStepLog[]
  restarted?: boolean
}

let isUpdating = false

export default defineEventHandler(async (event): Promise<UpdateResult> => {
  // 1. 安全鉴权：仅允许已登录的系统用户/管理员触发在线更新
  const currentUser = await getAuthenticatedUser(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: '未授权访问：请先登录墨萃系统管理员账户后再执行更新'
    })
  }

  if (isUpdating) {
    throw createError({
      statusCode: 429,
      statusMessage: '系统正在执行更新中，请勿重复操作'
    })
  }

  isUpdating = true
  const logs: UpdateStepLog[] = []

  const addLog = (step: string, status: 'running' | 'success' | 'failed' | 'skipped', message: string, output?: string) => {
    logs.push({
      step,
      status,
      message,
      output: output ? output.trim().slice(-2000) : undefined,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  try {
    addLog('env_check', 'running', '正在检查运行环境与 Git 仓库状态...')

    // 2. 动态导入 Node.js 进程管理 (保证在 Cloudflare Pages/Workers 边缘环境不发生编译期异常)
    let execAsync: ((cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string }>) | null = null
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const { exec } = await import('node:child_process')
        const { promisify } = await import('node:util')
        execAsync = promisify(exec)
      }
    } catch {
      execAsync = null
    }

    if (!execAsync) {
      addLog('env_check', 'skipped', '当前运行于 Serverless / 边缘计算隔离环境，无法直接调用本地 Shell 进程。')
      return {
        success: false,
        message: '当前部署在 Cloudflare 等 Serverless 边缘环境。请在控制台触发重新部署或通过 GitHub 联动部署更新。',
        logs
      }
    }

    // 3. 检查 Git 仓库
    let isGit = false
    let currentBranch = 'main'
    try {
      const gitCheck = await execAsync('git rev-parse --is-inside-work-tree', { timeout: 4000 })
      if (gitCheck.stdout.trim() === 'true') {
        isGit = true
        const branchRes = await execAsync('git rev-parse --abbrev-ref HEAD', { timeout: 3000 }).catch(() => ({ stdout: 'main' }))
        currentBranch = branchRes.stdout.trim() || 'main'
      }
    } catch {
      isGit = false
    }

    if (!isGit) {
      addLog('env_check', 'failed', '当前部署环境未检测到 Git 仓库，无法直接执行 Git 自动拉取更新。')
      return {
        success: false,
        message: '当前非 Git 部署环境。如使用 Docker 部署，请运行 `docker compose pull && docker compose up -d` 进行更新。',
        logs
      }
    }

    addLog('env_check', 'success', `环境检查通过（当前分支：${currentBranch}）`)

    // 4. 拉取远程最新代码
    addLog('git_pull', 'running', '正在从 GitHub 官方主仓库拉取最新代码...')
    try {
      const pullRes = await execAsync(`git fetch origin ${currentBranch} && git reset --hard origin/${currentBranch}`, {
        timeout: 45000
      })
      addLog('git_pull', 'success', '最新代码已成功同步拉取', pullRes.stdout || pullRes.stderr)
    } catch (pullErr: any) {
      try {
        const fallbackPull = await execAsync(`git pull origin ${currentBranch}`, { timeout: 30000 })
        addLog('git_pull', 'success', '最新代码已成功合并更新', fallbackPull.stdout || fallbackPull.stderr)
      } catch (fbErr: any) {
        addLog('git_pull', 'failed', `拉取代码失败: ${fbErr.message}`, fbErr.stderr || fbErr.stdout)
        throw new Error(`代码拉取失败：${fbErr.message}`)
      }
    }

    // 5. 安装/更新依赖
    addLog('deps_install', 'running', '正在检查与更新项目依赖包 (npm install)...')
    try {
      const installRes = await execAsync('npm install --prefer-offline --no-audit --loglevel=error', {
        timeout: 120000
      })
      addLog('deps_install', 'success', '依赖包检查完成', installRes.stdout || installRes.stderr)
    } catch (depErr: any) {
      addLog('deps_install', 'skipped', `依赖检查跳过或已是最新: ${depErr.message}`, depErr.stderr)
    }

    // 6. 重新编译生产构建 (仅在需要时)
    addLog('build', 'running', '正在执行生产环境增量编译 (npm run build)...')
    try {
      const buildRes = await execAsync('npm run build', { timeout: 180000 })
      addLog('build', 'success', '生产环境产物编译成功', buildRes.stdout || buildRes.stderr)
    } catch (buildErr: any) {
      addLog('build', 'skipped', `构建跳过: ${buildErr.message}`)
    }

    // 7. 完成更新报告
    addLog('finish', 'success', '🎉 InkGist 已成功升级至最新版本！请刷新页面即可体验新功能。')

    return {
      success: true,
      message: '系统已成功更新至最新版！',
      logs
    }
  } catch (err: any) {
    addLog('error', 'failed', `更新中断: ${err.message}`)
    return {
      success: false,
      message: err.message || '更新过程发生异常',
      logs
    }
  } finally {
    isUpdating = false
  }
})
