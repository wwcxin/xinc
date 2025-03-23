import { parse, stringify } from '@iarna/toml'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'
import { LogLevel } from './Logger'

// 配置文件接口定义
export interface Config {
  host: string
  port: number
  prefix: string
  root: number[]
  admins: number[]
  plugins: string[]
  logger: LogLevel
}

// 默认配置
const defaultConfig: Config = {
  host: '',
  port: 0,
  prefix: '/',
  root: [],
  admins: [],
  plugins: [],
  logger: 'info'
}

// 创建命令行交互接口
const readline = createInterface({
  input: process.stdin,
  output: process.stdout
})

// 提问函数
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(query, (answer) => {
      resolve(answer)
    })
  })
}

// 验证IP或域名
const isValidHost = (host: string): boolean => {
  // 简单验证，允许IP或域名格式
  return /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
}

// 验证端口
const isValidPort = (port: number): boolean => {
  return Number.isInteger(port) && port > 0 && port < 65536
}

// 验证数字列表
const isValidNumberArray = (arr: any): boolean => {
  if (!Array.isArray(arr)) return false
  return arr.every(item => Number.isInteger(item) && item > 0)
}

// 验证字符串列表
const isValidStringArray = (arr: any): boolean => {
  if (!Array.isArray(arr)) return false
  return arr.every(item => typeof item === 'string')
}

// 验证日志级别
const isValidLogLevel = (level: any): boolean => {
  return ['debug', 'info', 'warn', 'error', 'silent'].includes(level)
}

// 验证配置
const validateConfig = async (config: Partial<Config>): Promise<Config> => {
  const validatedConfig = { ...defaultConfig }

  // 验证并获取 host
  if (!config.host || !isValidHost(config.host)) {
    console.log('Host 不合法或为空')
    let host = await question('请输入有效的主机地址 (IP或域名): ')
    while (!isValidHost(host)) {
      host = await question('输入无效，请重新输入有效的主机地址: ')
    }
    validatedConfig.host = host
  } else {
    validatedConfig.host = config.host
  }

  // 验证并获取 port
  if (!config.port || !isValidPort(config.port)) {
    console.log('Port 不合法或为空')
    let portStr = await question('请输入有效的端口 (1-65535): ')
    let port = parseInt(portStr)
    while (!isValidPort(port)) {
      portStr = await question('输入无效，请重新输入有效的端口: ')
      port = parseInt(portStr)
    }
    validatedConfig.port = port
  } else {
    validatedConfig.port = config.port
  }

  // 验证并获取 prefix
  if (!config.prefix) {
    console.log('Prefix 为空')
    validatedConfig.prefix = await question('请输入命令前缀 (默认为 /): ') || '/'
  } else {
    validatedConfig.prefix = config.prefix
  }

  // 验证并获取 root
  if (!config.root || !isValidNumberArray(config.root) || config.root.length === 0) {
    console.log('Root 不合法或为空')
    let rootStr = await question('请输入框架主人QQ号 (多个用逗号分隔): ')
    let root = rootStr.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item))
    while (!isValidNumberArray(root) || root.length === 0) {
      rootStr = await question('输入无效，请重新输入框架主人QQ号: ')
      root = rootStr.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item))
    }
    validatedConfig.root = root
  } else {
    validatedConfig.root = config.root
  }

  // 验证并获取 admins (可选)
  if (config.admins && !isValidNumberArray(config.admins)) {
    console.log('Admins 不合法')
    let adminsStr = await question('请输入框架管理员QQ号 (多个用逗号分隔，可留空): ')
    if (adminsStr.trim()) {
      let admins = adminsStr.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item))
      while (!isValidNumberArray(admins)) {
        adminsStr = await question('输入无效，请重新输入框架管理员QQ号: ')
        admins = adminsStr.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item))
      }
      validatedConfig.admins = admins
    }
  } else {
    validatedConfig.admins = config.admins || []
  }

  // 验证并获取 plugins (可选)
  if (config.plugins && !isValidStringArray(config.plugins)) {
    console.log('Plugins 不合法')
    let pluginsStr = await question('请输入插件名称 (多个用逗号分隔，可留空): ')
    if (pluginsStr.trim()) {
      validatedConfig.plugins = pluginsStr.split(',').map(item => item.trim())
    }
  } else {
    validatedConfig.plugins = config.plugins || []
  }

  // 验证并获取 logger
  if (!config.logger || !isValidLogLevel(config.logger)) {
    console.log('Logger 不合法或为空')
    let logger = await question('请输入日志级别 (debug/info/warn/error/silent，默认为 info): ') || 'info'
    while (!isValidLogLevel(logger)) {
      logger = await question('输入无效，请重新输入日志级别: ') || 'info'
    }
    validatedConfig.logger = logger as LogLevel
  } else {
    validatedConfig.logger = config.logger
  }

  return validatedConfig
}

// 格式化配置文件
const formatConfig = (config: Config): any => {
  // 确保数字值正确格式化
  return {
    host: `"${config.host}"`,  // 字符串需要引号
    port: config.port,         // 数字不需要引号
    prefix: `"${config.prefix}"`,
    root: config.root,
    admins: config.admins,
    plugins: config.plugins.map(p => `"${p}"`), // 字符串数组中的每个元素需要引号
    logger: `"${config.logger}"`
  }
}

// 在 loadConfig 函数开始处添加
const checkAndFixConfig = (path: string): boolean => {
  if (!existsSync(path)) return false;
  
  try {
    // 尝试解析配置文件
    const content = readFileSync(path, 'utf-8');
    parse(content);
    return true;
  } catch (error) {
    console.error('配置文件格式错误，将重新创建');
    return false;
  }
};

// 加载配置
export const loadConfig = async (configPath: string = 'xinc.config.toml'): Promise<Config> => {
  const fullPath = join(process.cwd(), configPath)
  
  // 检查配置文件
  if (!checkAndFixConfig(fullPath)) {
    console.log(`配置文件 ${configPath} 不存在或格式错误，将创建默认配置`)
    const validatedConfig = await validateConfig({})
    
    // 手动创建 TOML 内容
    const tomlContent = `host = "${validatedConfig.host}"
port = ${validatedConfig.port}
prefix = "${validatedConfig.prefix}"
root = [${validatedConfig.root.join(', ')}]
admins = [${validatedConfig.admins.join(', ')}]
plugins = [${validatedConfig.plugins.map(p => `"${p}"`).join(', ')}]
logger = "${validatedConfig.logger}"
`;
    
    writeFileSync(fullPath, tomlContent);
    console.log(`已创建配置文件: ${fullPath}`)
    readline.close()
    return validatedConfig
  }

  try {
    // 读取并解析配置文件
    const configFile = readFileSync(fullPath, 'utf-8')
    const parsedConfig = parse(configFile)
    
    // 验证配置
    const validatedConfig = await validateConfig(parsedConfig as Partial<Config>)
    
    // 如果配置有更新，写回文件
    if (JSON.stringify(parsedConfig) !== JSON.stringify(validatedConfig)) {
      const tomlContent = `host = "${validatedConfig.host}"
port = ${validatedConfig.port}
prefix = "${validatedConfig.prefix}"
root = [${validatedConfig.root.join(', ')}]
admins = [${validatedConfig.admins.join(', ')}]
plugins = [${validatedConfig.plugins.map(p => `"${p}"`).join(', ')}]
logger = "${validatedConfig.logger}"
`;
      
      writeFileSync(fullPath, tomlContent);
      console.log(`配置已更新并保存至: ${fullPath}`)
    }
    
    readline.close()
    return validatedConfig
  } catch (error) {
    console.error('加载配置文件失败:', error)
    process.exit(1)
  }
} 