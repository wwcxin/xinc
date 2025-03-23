import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export class Logger {
  private level: LogLevel
  private logFile: string
  private logStream: fs.WriteStream

  constructor(level: LogLevel = 'info') {
    this.level = level
    
    // 创建日志目录
    const logDir = path.join(process.cwd(), 'log')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    
    // 创建日志文件名 (格式: YYYY-MM-DD-HH-mm-ss.log)
    const now = new Date()
    const timestamp = [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ].map(n => String(n).padStart(2, '0')).join('-')
    
    this.logFile = path.join(logDir, `${timestamp}.log`)
    
    // 创建日志写入流
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' })
    
    // 记录启动信息
    this.info(`日志系统初始化，日志级别: ${level}，日志文件: ${this.logFile}`)
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      silent: 4
    }
    return priorities[level]
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    return this.getLevelPriority(messageLevel) >= this.getLevelPriority(this.level)
  }

  private getTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  private formatLogMessage(level: string, args: any[]): string {
    // 将参数转换为字符串
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch (e) {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')
    
    return `[${this.getTimestamp()}] ${level}: ${formattedArgs}\n`
  }

  private writeToFile(level: string, args: any[]): void {
    const logMessage = this.formatLogMessage(level, args)
    this.logStream.write(logMessage)
  }

  debug(...args: any[]): void {
    if (!this.shouldLog('debug')) return
    console.log(chalk.gray(`[${this.getTimestamp()}] DEBUG:`), ...args)
    this.writeToFile('DEBUG', args)
  }

  info(...args: any[]): void {
    if (!this.shouldLog('info')) return
    console.log(chalk.green(`[${this.getTimestamp()}] INFO:`), ...args)
    this.writeToFile('INFO', args)
  }

  warn(...args: any[]): void {
    if (!this.shouldLog('warn')) return
    console.log(chalk.yellow(`[${this.getTimestamp()}] WARN:`), ...args)
    this.writeToFile('WARN', args)
  }

  error(...args: any[]): void {
    if (!this.shouldLog('error')) return
    console.log(chalk.red(`[${this.getTimestamp()}] ERROR:`), ...args)
    this.writeToFile('ERROR', args)
  }

  // 关闭日志流
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.logStream.end(() => {
        resolve()
      })
    })
  }
} 