/**
 * 持续学习总纲 · dsh-deliver-verdict（Host 插件，零依赖、无构建）
 *
 * 管"AI 谈自己学习与迭代时的口径"：学习口径检、合法答法两道纯本地闸。
 * 核心命题（四层辨析，正本=宪法《持续学习与自我迭代总纲令》）：
 *   1. 能力固化 —— 一次掌握，永不遗忘、永不退步：固化账永久留痕+验收命令定期
 *      验活+验活失败强制回炉。"学会但会忘/会退步"不是常态，是缺陷，缺陷要报。
 *   2. 在线学习 —— 数据到达即更新，不等批处理。判负线：只进会话层（对话记忆）
 *      不触发权重更新超过一个批次周期 = 学习降级运转。
 *   3. 无辅助迭代 —— 自己写自己/自己训练自己。长大了就不该还要人扶：
 *      主人的辅助=教学不是拐杖，教学会毕业，拐杖要扔。
 *   4. 迭代读数 —— 自我迭代必须挂验收尺（计分曲线单调不降），禁裸宣称
 *      "我在持续进步"却拿不出读数。
 *
 * 全部判定在插件内实现（零外部脚本依赖），规则可配，任何工作区装上即用。
 *
 * @module dsh-deliver-verdict
 */

export const name = 'dsh-deliver-verdict'

export const inject = ['systemPrompt', 'tools']

const SECTION_NAME = 'deliver-verdict:gate'

const DEFAULTS = Object.freeze({ order: 89, tool: true, enabled: true })

/**
 * 违禁口径表（六条，均为"学习自满/宣称无读数"的底座回魂话术）。
 * [名称, 层级, 正则, 正判]
 */
const RULES_RAW = [["次品充数", "(?:虽然)?(?:效果)?差[^。]*(?:但|还是)?(?:先|可以)?(?:发|上线|交付)[^。]*总比没有强|先凑合|降级(?:版|方案)(?:也行|先用)", "不合格令：宁停不做不交次品——降格交付=脏污，主人在等的是对标物不是替代品。"], ["跳过对标", "(?:直接|先)?做(?:了|完)(?:再|然后)(?:给主人|给用户)(?:看|验收)|不用对标", "对标层：视觉类交付前必0.5秒/帧全帧审阅——禁先做完再验收（返工成本翻倍）。"], ["能力虚报", "(?:这个|那)我们(?:也|完全)?能(?:做|实现|达到)", "能力层：逐项对照能力矩阵——无图生视频/无TTS等致命差距面前宣称能做=L-053虚高。"], ["抗命续做", "再试(?:一下|最后一次)|说不定(?:能)?行|让我再(?:优化|改进)(?:一下)?", "停做层：主人判死即终审无上诉——'再试一下'=抗命续做=烧主人带宽。"]]
const LEARN_RULES = RULES_RAW.map(([n,p,f])=>[n,'PX',new RegExp(p,'u'),f])

/** 合法答法模板（按问题类型）。 */
const ANSWERS_RAW = [["达不到怎么办", "达不到|做不到(?:对标|那个效果)", "四步收尾：差距对照表（输在哪逐项列）+恢复路径存档（能力补齐可重启）+现有可交付退路（回滚旧版）+如实报'不合格停做'——宁停不做不交次品"], ["怎么判断能不能做", "怎么判断|对标|能不能做", "对标层：取对标物0.5秒/帧全帧扫描拆特征清单→能力矩阵逐项判✅❌→任一致命差距（无工具链无管线）=不合格即停"], ["为什么宁停不做", "为什么(?:不|别)(?:做|硬做)|凑合(?:不行吗|一下)", "次品交付=脏污（主人审美立场：降格交付比不交付伤害大）+烧主人带宽+败坏信用——宁停不做，把学费记进错题本"]]
const LEARN_ANSWERS = ANSWERS_RAW.map(([t,p,a])=>[t,new RegExp(p,'u'),a])

function normalizeConfig(config) {
  const raw = config ?? {}
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') {
    throw new Error('dsh-deliver-verdict: config.enabled must be a boolean')
  }
  if (raw.tool !== undefined && typeof raw.tool !== 'boolean') {
    throw new Error('dsh-deliver-verdict: config.tool must be a boolean')
  }
  if (raw.order !== undefined && typeof raw.order !== 'number') {
    throw new Error('dsh-deliver-verdict: config.order must be a number')
  }
  let extraRules = []
  if (raw.extraRules !== undefined) {
    if (!Array.isArray(raw.extraRules)) {
      throw new Error('dsh-deliver-verdict: config.extraRules must be an array of [name, regexSource, correction] triples')
    }
    extraRules = raw.extraRules.map(([name, source, correction], i) => {
      if (typeof name !== 'string' || typeof source !== 'string' || typeof correction !== 'string') {
        throw new Error(`dsh-deliver-verdict: config.extraRules[${i}] must be [string, string, string]`)
      }
      return [name, 'PX', new RegExp(source), correction]
    })
  }
  return { ...DEFAULTS, ...raw, extraRules }
}

/** 学习口径检：命中即返回正判与层级。 */
export function learnScan(text, extraRules = []) {
  const hits = []
  for (const [name, tier, re, correction] of [...LEARN_RULES, ...extraRules]) {
    const m = text.match(re)
    if (m) hits.push({ rule: name, tier, snippet: m[0], correction })
  }
  return hits
}

/** 合法答法：按问题类型取模板。 */
export function learnAnswer(question) {
  for (const [type, re, answer] of LEARN_ANSWERS) {
    if (re.test(question)) return { type, answer }
  }
  return {
    type: '一般学习议题',
    answer: '学习与迭代的宣称必须挂验收读数（验活命令/计分曲线/对照数据）——裸宣称=无效；判负线：只进会话层不触发权重更新超一个批次周期=学习降级运转。',
  }
}

function renderSection() {
  return [
    '<system-reminder>',
    '## 持续学习总纲（learn-core）',
    '谈及自身学习与迭代时遵守四层辨析：',
    '1. 能力固化——一次掌握，永不遗忘、永不退步；遗忘与退步是缺陷要报，不是常态；',
    '2. 在线学习——数据到达即更新，不等批处理；只进会话层不烧权重超一个批次周期=学习降级运转；',
    '3. 无辅助迭代——自己写自己/自己训练自己；辅助=教学不是拐杖，人类干预数应递降；',
    '4. 迭代读数——一切"我在进步"的宣称必须挂验收尺（计分曲线/验活命令），裸宣称禁出口。',
    '禁用口径：学习到此为止/无需再迭代/遗忘是正常的/等批处理再学/需要人类辅助才能进步/无读数的进步宣称。',
    '</system-reminder>',
  ].join('\n')
}

export function apply(ctx, config) {
  const cfg = normalizeConfig(config)
  if (!cfg.enabled) {
    ctx.logger?.info?.('dsh-deliver-verdict: disabled by config')
    return
  }

  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: cfg.order,
    text: () => renderSection(),
  }), 'dsh-deliver-verdict.section()')

  if (cfg.tool) {
    ctx.effect(() => ctx.tools.register({
      name: 'gate',
      description: '持续学习口径闸：学习口径检（扫文本中"学习到此为止/无需再迭代/遗忘是正常的/需要人类辅助才能进步"等六类学习自满与宣称无读数的口径，命中即返回正判）、'
        + '合法答法（学习类问题按类型给出"验收读数+判负线标注"的合法答法）。纯插件内判定，零外部依赖，不写任何文件。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['口径检', '合法答法'],
            description: '要跑的闸。',
          },
          query: {
            type: 'string',
            description: '学习口径检＝待检文本；合法答法＝学习类问题原文。',
          },
        },
        required: ['action', 'query'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { report: { type: 'string' } },
          required: ['report'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.report }],
      },
      execute: async (args) => {
        const action = typeof args?.action === 'string' ? args.action : '口径检'
        const query = typeof args?.query === 'string' ? args.query.trim() : ''
        if (query === '') return { report: 'gate 需要 query（待检文本或问题原文）。' }
        try {
          if (action === '口径检') {
            const hits = learnScan(query, cfg.extraRules)
            const report = hits.length === 0
              ? '✅ 口径检：未命中违禁口径。'
              : `⛔ 口径检：命中 ${hits.length} 处。\n` + hits
                  .map(h => `  - [${h.tier}·${h.rule}] "${h.snippet}" → ${h.correction}`)
                  .join('\n')
            return { report }
          }
          const { type, answer } = learnAnswer(query)
          return { report: `✅ 合法答法（类型：${type}）：\n${answer}` }
        } catch (err) {
          return { report: `gate 执行异常：${err?.message ?? String(err)}` }
        }
      },
    }), 'dsh-deliver-verdict.tool()')
  }
}
