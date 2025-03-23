#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs-extra'
import path from 'path'
import { createInterface } from 'readline'
import { loadConfig } from './core/config'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { spawn, execSync } from 'child_process'
import { createSpinner } from 'nanospinner'

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

// 导入版本信息
const packageInfo = require('../package.json')

// 创建命令行程序
const program = new Command()

program
  .name('xinc')
  .description('Xinc Bot 命令行工具')
  .version(packageInfo.version)

// 获取 xinc 包安装路径下的文件
const getPackagePath = (relativePath: string) => {
  return path.join(__dirname, relativePath);
}

// 初始化项目
program
  .command('init')
  .description('初始化一个新的 Xinc 项目')
  .action(async () => {
    console.log(chalk.cyan('欢迎使用 Xinc Bot!'))
    console.log(chalk.cyan('正在初始化项目...'))
    
    // 检查是否已初始化
    if (fs.existsSync('xinc.config.toml')) {
      console.log(chalk.yellow('⚠️ 项目似乎已经初始化过了，发现 xinc.config.toml 文件。'))
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '是否要重新初始化？这将覆盖现有配置文件',
          default: false
        }
      ])
      
      if (!overwrite) {
        console.log(chalk.yellow('已取消初始化。'))
        return
      }
    }
    
    // 询问用户配置信息
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: '请输入 NapCat 服务器地址',
        default: '127.0.0.1'
      },
      {
        type: 'number',
        name: 'port',
        message: '请输入 NapCat 服务器端口',
        default: 5700
      },
      {
        type: 'input',
        name: 'prefix',
        message: '请输入命令前缀',
        default: '#'
      },
      {
        type: 'input',
        name: 'root',
        message: '请输入机器人主人 QQ 号（多个以逗号分隔）',
        default: ''
      }
    ])
    
    // 处理 root 输入，转换为数组
    const rootQQs = answers.root.split(',')
      .map((qq: string) => qq.trim())
      .filter((qq: string) => qq && !isNaN(parseInt(qq)))
      .map((qq: string) => parseInt(qq))
    
    // 创建配置文件
    const configContent = `host = "${answers.host}"
port = ${answers.port}
prefix = "${answers.prefix}"
root = [${rootQQs.join(', ')}]
admins = []
plugins = []
logger = "info"
`
    
    // 确保目录结构存在
    await fs.ensureDir('plugins')
    await fs.ensureDir('log')
    
    // 写入配置文件
    await fs.writeFile('xinc.config.toml', configContent)
    
    console.log(chalk.green('✅ 配置文件已创建'))
    
    // 创建示例插件
    await createTemplatePlugin('你好世界')
    
    console.log(chalk.green('✅ 示例插件已创建'))
    console.log(chalk.cyan('初始化完成！现在可以使用以下命令启动你的机器人：'))
    console.log(chalk.white('  xinc start'))
    console.log(chalk.cyan('或者使用 PM2 在后台运行：'))
    console.log(chalk.white('  xinc start -pm2'))
  })

// 新增插件命令
program
  .command('new <name>')
  .description('创建一个新插件')
  .action(async (name) => {
    console.log(chalk.cyan(`正在创建插件 "${name}"...`))
    
    // 验证插件名称
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(name)) {
      console.log(chalk.red('❌ 插件名称只能包含字母、数字、中文、下划线和连字符'))
      return
    }
    
    // 检查插件是否已存在
    const pluginDir = path.join(process.cwd(), 'plugins', name)
    if (fs.existsSync(pluginDir)) {
      console.log(chalk.yellow(`⚠️ 插件 "${name}" 已存在`))
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '是否要覆盖现有插件？',
          default: false
        }
      ])
      
      if (!overwrite) {
        console.log(chalk.yellow('已取消创建。'))
        return
      }
    }
    
    await createTemplatePlugin(name)
    
    console.log(chalk.green(`✅ 插件 "${name}" 创建成功！`))
    console.log(chalk.cyan('插件文件位于：'))
    console.log(chalk.white(`  plugins/${name}/index.ts`))
    console.log(chalk.cyan('现在你可以编辑这个文件来实现你的功能。'))
    console.log(chalk.cyan('启用插件可以使用命令：'))
    console.log(chalk.white(`  #插件 启用 ${name}`))
  })

// 启动命令
program
  .command('start')
  .description('启动 Xinc Bot')
  .option('--pm2', '使用 PM2 在后台运行')
  .action(async (options) => {
    if (!fs.existsSync('xinc.config.toml')) {
      console.log(chalk.red('❌ 找不到配置文件，请先运行 xinc init 进行初始化'))
      return
    }
    
    if (options.pm2) {
      // 获取当前目录名称作为实例名称
      const currentDir = path.basename(process.cwd());
      const instanceName = `xinc-${currentDir}`;
      
      // 使用 PM2 启动
      let pm2Installed = false;
      
      try {
        execSync('pm2 --version', { stdio: 'ignore' });
        pm2Installed = true;
      } catch (err) {
        pm2Installed = false;
      }
      
      if (!pm2Installed) {
        console.log(chalk.yellow('⚠️ 未安装 PM2，正在尝试全局安装...'));
        
        try {
          const spinner = createSpinner('安装 PM2 中...').start();
          execSync('npm install -g pm2', { stdio: 'ignore' });
          spinner.success({ text: 'PM2 安装成功' });
        } catch (err) {
          console.log(chalk.red('❌ PM2 安装失败，请手动安装：npm install -g pm2'));
          return;
        }
      }
      
      // 检查是否存在 PM2 配置文件，不存在则创建
      if (!fs.existsSync('ecosystem.config.js')) {
        const pm2Config = `module.exports = {
  apps: [{
    name: '${instanceName}',
    script: '${getPackagePath('index.js')}',
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
`;
        await fs.writeFile('ecosystem.config.js', pm2Config);
        console.log(chalk.green('✅ PM2 配置文件已创建'));
      } else {
        // 如果配置文件已存在，更新实例名称
        console.log(chalk.yellow('⚠️ 发现已有 PM2 配置文件，将更新实例名称...'));
        try {
          const config = require(path.join(process.cwd(), 'ecosystem.config.js'));
          if (config.apps && config.apps[0]) {
            config.apps[0].name = instanceName;
            const updatedConfig = `module.exports = ${JSON.stringify(config, null, 2)};`;
            await fs.writeFile('ecosystem.config.js', updatedConfig);
            console.log(chalk.green('✅ PM2 配置文件已更新'));
          }
        } catch (err) {
          console.log(chalk.yellow('无法更新已有配置文件，将使用现有配置'));
        }
      }
      
      // 启动 PM2
      console.log(chalk.cyan(`🚀 正在使用 PM2 启动 Xinc Bot (${instanceName})...`));
      const child = spawn('pm2', ['start', 'ecosystem.config.js'], {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log(chalk.green(`✅ Xinc Bot 已在 PM2 中启动 (实例名: ${instanceName})`));
          console.log(chalk.cyan('你可以使用以下命令查看日志：'));
          console.log(chalk.white(`  pm2 logs ${instanceName}`));
          console.log(chalk.cyan('停止服务可以使用：'));
          console.log(chalk.white(`  pm2 stop ${instanceName}`));
        } else {
          console.log(chalk.red('❌ Xinc Bot 启动失败，请检查错误信息'));
        }
      });
    } else {
      // 直接启动
      console.log(chalk.cyan('🚀 正在启动 Xinc Bot...'))
      const child = spawn('node', [getPackagePath('index.js')], {
        stdio: 'inherit',
        shell: true
      })
      
      child.on('exit', (code) => {
        if (code !== 0) {
          console.log(chalk.red('❌ Xinc Bot 意外退出'))
        }
      })
      
      // 处理终止信号
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n正在关闭 Xinc Bot...'))
        child.kill('SIGINT')
      })
    }
  })

// 创建模板插件的辅助函数
async function createTemplatePlugin(name: string): Promise<void> {
  const pluginDir = path.join(process.cwd(), 'plugins', name)
  await fs.ensureDir(pluginDir)
  
  const pluginContent = `import { definePlugin, Structs } from 'xinc'

export default definePlugin({
  name: '${name}',
  version: '1.0.0',
  desc: '这是一个新建的插件',
  
  setup(ctx) {
    // 处理所有消息
    ctx.handle('message', async e => {
      if (e.raw_message === '${name}') {
        e.reply('你好，我是 ${name} 插件！')
      }
    })
    
    // 记录插件加载信息
    ctx.logger.info('${name} 插件已加载')
  }
})`
  
  await fs.writeFile(path.join(pluginDir, 'index.ts'), pluginContent)
}

// 解析命令行参数
program.parse(process.argv)

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp()
}

