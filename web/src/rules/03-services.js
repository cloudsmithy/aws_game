import { LANG, __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
// ================= 服务数据 =================
export let GROUPS = __rv(() => ({
  // 11-08：按亚马逊云科技官方的服务分类分组（控制台「所有服务」里的分类）。Serverless 不是分类，是服务的类型（见 TYPE_N），一块服务只属于一个色组
  storage: { name: _t(0, "存储"), color: '#7aa116' },
  iaas: { name: _t(1, "计算"), color: '#ed7100' },
  net: { name: _t(2, "网络"), color: '#8c4fff' },
  ctr: { name: _t(3, "容器"), color: '#eab308', lab: '#a16207' },
  integ: { name: _t(4, "应用集成"), color: '#e7157b' },
  db: { name: _t(5, "数据库"), color: '#c925d1' },
  ana: { name: _t(6, "分析"), color: '#3b82f6' },
  sec: { name: _t(7, "安全"), color: '#dd344c' },
  ai: { name: 'AI', color: '#01a88d' },
  util: { name: _t(8, "监控"), color: '#545b64' },   // 11-09 监控组：CloudWatch、CloudTrail、Config，就是万能服务（官方分类叫「管理与治理」）
}), v => { GROUPS = v; }, () => GROUPS);
export const labColor = g => `var(--group-text-${g},${GROUPS[g].lab || GROUPS[g].color})`;
// 组名以英文结尾（AI、Serverless）时和「组」之间留空格，跟手写的「AI 组」一致；按用量收费的三格不算色组，不加「组」
export const grpN = g => GROUPS[g].name + (/[A-Za-z]$/.test(GROUPS[g].name) ? _t(9, " 组") : _t(10, "组"));
// 前面紧挨着中文时，英文开头的组名（IaaS、Serverless、AI）前面再补一个空格
export const grpGap = g => /^[A-Za-z]/.test(GROUPS[g].name) ? ' ' : '';
// type：iaas / paas / ctr（容器）/ sls（Serverless）/ mgd（托管服务）/ glb（全局服务）/ token（按 token）
// bill：hour 按小时 / req 按请求 / sub 订阅 / token 按 token / free 免费
// upg：三级升级 [名字, 格子上的短标, 效果]
let SVC = __rv(() => ({
  s3: { n: 'S3', g: 'storage', p: 60, type: 'sls', bill: 'req', upg: [[_t(11, "版本控制"), _t(11, "版本控制"), 'backup'], [_t(12, "智能分层"), _t(12, "智能分层"), 'cost'], [_t(13, "自动生成缩略图"), _t(14, "缩略图"), 'boost']] },
  efs: { n: 'EFS', g: 'storage', p: 100, type: 'sls', bill: 'req', upg: [[_t(15, "生命周期管理"), _t(16, "生命周期"), 'cost'], [_t(17, "自动备份"), _t(17, "自动备份"), 'backup'], [_t(18, "跨区域复制"), 'Region', 'mr']] },   // 原来 $60 和 S3 一样：S3 在 10 个架构里，EFS 只在 2 个架构里当备选，升满却要 $300，算上升级是存储组最难回本的。现实里 EFS 每 GB 也比 S3 贵得多
  cognito: { n: 'Cognito', g: 'sec', p: 80, type: 'mgd', bill: 'req', upg: [[_t(19, "MFA 多因素认证"), 'MFA', 'audit'], [_t(20, "社交与企业登录"), _t(21, "联合登录"), 'boost'], [_t(22, "身份池（联合身份）"), _t(23, "身份池"), 'cost']] },   // 11-08 换掉 Backup：Backup 是集中管备份的托管服务，各服务自己的备份功能（S3 版本控制、EBS 快照……）在升级里都有
  agentcore: { n: 'AgentCore', g: 'ai', p: 100, type: 'sls', bill: 'req', upg: [[_t(24, "Memory 记忆"), 'Memory', ''], [_t(25, "Gateway 工具网关"), 'Gateway', 'boost'], [_t(26, "Identity 身份"), 'Identity', 'audit']] },
  ec2: { n: 'EC2', g: 'iaas', p: 100, type: 'iaas', bill: 'hour', upg: [[_t(27, "自动 AMI"), _t(27, "自动 AMI"), 'backup'], [_t(28, "跨 AZ Auto Scaling"), 'ASG', 'maz+scale'], ['Graviton', 'Graviton', 'cost']] },
  ebs: { n: 'EBS', g: 'storage', p: 120, type: 'iaas', bill: 'hour', upg: [[_t(29, "快照跨 AZ 恢复"), '2 AZ', 'maz'], [_t(30, "gp3 卷"), 'gp3', 'cost'], [_t(31, "跨区域快照复制"), 'Region', 'mr']] },
  vpc: { n: 'VPC', g: 'net', p: 140, type: 'mgd', bill: 'free', upg: [[_t(32, "私有子网 + NAT"), _t(33, "私有子网"), 'priv'], ['Session Manager', 'SSM', 'bastion'], ['Transit Gateway', 'TGW', '']] },
  elb: { n: 'ELB', g: 'net', p: 140, type: 'mgd', bill: 'hour', upg: [['HTTPS + ACM', 'HTTPS', 'tls'], [_t(34, "预置容量"), _t(34, "预置容量"), 'scale'], [_t(35, "负载均衡 + Auto Scaling"), 'ELB+ASG', '']] },
  route53: { n: 'Route 53', g: 'net', p: 160, type: 'glb', bill: 'req', upg: [[_t(36, "健康检查"), _t(36, "健康检查"), ''], [_t(37, "故障转移路由"), _t(38, "故障转移"), 'mr'], [_t(39, "延迟路由"), _t(39, "延迟路由"), '']] },
  ecr: { n: 'ECR', g: 'ctr', p: 180, type: 'mgd', bill: 'req', upg: [[_t(40, "基础扫描"), _t(40, "基础扫描"), ''], [_t(41, "增强扫描"), _t(41, "增强扫描"), 'scanimg'], [_t(18, "跨区域复制"), 'Region', 'mr']] },
  ecs: { n: 'ECS', g: 'ctr', p: 180, type: 'ctr', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], ['Fargate', 'Fargate', 'scan'], [_t(43, "服务自动扩缩"), 'ASG', 'scale']] },
  eks: { n: 'EKS', g: 'ctr', p: 200, type: 'ctr', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], [_t(44, "Karpenter 自动扩缩"), 'Karpenter', 'scale'], [_t(45, "托管节点组"), _t(45, "托管节点组"), 'scan']] },
  lambda: { n: 'Lambda', g: 'iaas', p: 220, type: 'sls', bill: 'req', upg: [[_t(46, "提高并发配额"), _t(47, "并发配额"), 'scale'], [_t(48, "预置并发"), _t(48, "预置并发"), ''], [_t(49, "容器镜像 + Web Adapter"), _t(50, "Web 框架"), 'cost']] },
  apigw: { n: 'API Gateway', g: 'net', p: 220, type: 'sls', bill: 'req', upg: [[_t(51, "使用计划限流"), _t(52, "限流"), ''], [_t(53, "接入认证"), _t(54, "认证"), 'audit'], [_t(55, "缓存"), _t(55, "缓存"), 'boost']] },
  dynamodb: { n: 'DynamoDB', g: 'db', p: 240, type: 'sls', bill: 'req', upg: [[_t(56, "预置容量 + Auto Scaling"), _t(34, "预置容量"), 'cost'], [_t(57, "时间点恢复"), 'PITR', 'backup'], [_t(58, "全局表"), 'Region', 'mr']] },
  sqs: { n: 'SQS', g: 'integ', p: 240, type: 'sls', bill: 'req', upg: [[_t(59, "死信队列"), _t(59, "死信队列"), ''], [_t(60, "长轮询"), _t(60, "长轮询"), 'cost'], [_t(61, "积压告警 + SNS 通知"), _t(62, "SNS 通知"), 'boost']] },
  eventbridge: { n: 'EventBridge', g: 'integ', p: 240, type: 'sls', bill: 'req', upg: [[_t(63, "定时启停 EC2"), _t(64, "定时启停"), ''], [_t(65, "Health 事件通知"), _t(66, "Health 通知"), ''], [_t(67, "调用任意 API"), _t(68, "通用目标"), 'cost']] },
  sfn: { n: 'Step Functions', g: 'integ', p: 260, type: 'sls', bill: 'req', upg: [[_t(69, "Express 工作流"), 'Express', 'cost'], [_t(70, "分布式 Map"), _t(70, "分布式 Map"), ''], [_t(71, "多区域"), 'Region', 'mr']] },
  rds: { n: 'RDS', g: 'db', p: 280, type: 'paas', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], [_t(72, "只读副本"), _t(72, "只读副本"), 'scale'], [_t(73, "跨区域只读副本"), 'Region', 'mr']] },
  aurora: { n: 'Aurora', g: 'db', p: 280, type: 'paas', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], ['Aurora Auto Scaling', 'ASG', 'scale'], [_t(74, "全球数据库"), 'Region', 'mr']] },
  elasticache: { n: 'ElastiCache', g: 'db', p: 300, type: 'paas', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], [_t(75, "集群模式"), _t(75, "集群模式"), 'scale'], [_t(76, "全局数据存储"), 'Region', 'mr']] },
  kinesis: { n: 'Kinesis', g: 'ana', p: 300, type: 'mgd', bill: 'hour', upg: [[_t(77, "按需模式"), _t(77, "按需模式"), 'scale'], [_t(78, "增强扇出"), _t(78, "增强扇出"), ''], [_t(79, "数据转换"), 'ETL', 'cost']] },
  glue: { n: 'Glue', g: 'ana', p: 300, type: 'sls', bill: 'req', upg: [[_t(80, "数据目录"), _t(80, "数据目录"), ''], [_t(81, "作业书签"), _t(81, "作业书签"), 'cost'], [_t(82, "数据质量"), _t(82, "数据质量"), '']] },
  athena: { n: 'Athena', g: 'ana', p: 320, type: 'sls', bill: 'req', upg: [[_t(83, "分区投影"), _t(83, "分区投影"), 'cost'], [_t(84, "查询结果复用"), _t(85, "结果复用"), ''], [_t(86, "联合查询"), _t(86, "联合查询"), '']] },
  redshift: { n: 'Redshift', g: 'ana', p: 340, type: 'paas', bill: 'hour', upg: [[_t(42, "多 AZ"), '2 AZ', 'maz'], [_t(87, "并发扩展"), _t(87, "并发扩展"), 'scale'], [_t(88, "Zero-ETL 集成"), 'Zero-ETL', 'boost']] },
  dms: { n: 'DMS', g: 'db', p: 340, type: 'paas', bill: 'hour', upg: [[_t(89, "多 AZ 复制实例"), '2 AZ', 'maz'], ['DMS Serverless', 'Serverless', 'cost'], ['Schema Conversion', _t(90, "异构迁移"), 'boost']] },   // 11-09 换掉 EMR：DMS 撑起迁移上云和 CDC 这几个架构
  opensearch: { n: 'OpenSearch', g: 'ana', p: 360, type: 'paas', bill: 'hour', upg: [[_t(91, "多 AZ（含备用）"), '2 AZ', 'maz'], ['UltraWarm', 'UltraWarm', 'cost'], [_t(92, "跨集群复制"), 'Region', 'mr']] },
  guardduty: { n: 'GuardDuty', g: 'sec', p: 380, type: 'mgd', bill: 'req', upg: [[_t(93, "S3 保护"), _t(93, "S3 保护"), ''], [_t(94, "运行时监控"), _t(94, "运行时监控"), ''], [_t(95, "所有区域开启"), 'Region', 'mr']] },
  inspector: { n: 'Inspector', g: 'sec', p: 380, type: 'mgd', bill: 'req', upg: [[_t(96, "EC2 扫描"), _t(96, "EC2 扫描"), 'scan'], [_t(97, "ECR 镜像扫描"), _t(98, "镜像扫描"), 'scanimg'], [_t(99, "Lambda 扫描"), _t(99, "Lambda 扫描"), '']] },
  kms: { n: 'KMS', g: 'sec', p: 400, type: 'mgd', bill: 'req', upg: [[_t(100, "客户托管密钥"), 'CMK', ''], [_t(101, "自动轮换"), _t(101, "自动轮换"), ''], [_t(102, "多区域密钥"), 'Region', 'mr']] },
  cloudfront: { n: 'CloudFront', g: 'net', p: 400, type: 'glb', bill: 'req', upg: [[_t(103, "HTTPS（ACM）"), 'HTTPS', 'tls'], [_t(104, "源访问控制"), 'OAC', ''], [_t(105, "源故障转移"), _t(38, "故障转移"), 'mr']] },
  waf: { n: 'WAF', g: 'sec', p: 400, type: 'mgd', bill: 'req', upg: [[_t(106, "托管规则"), _t(106, "托管规则"), ''], [_t(107, "限速规则"), _t(107, "限速规则"), ''], ['Bot Control', 'Bot', '']] },
  shield: { n: 'Shield Advanced', g: 'sec', p: 420, type: 'glb', bill: 'sub', upg: [[_t(36, "健康检查"), _t(36, "健康检查"), ''], [_t(108, "主动响应"), _t(108, "主动响应"), ''], [_t(109, "DDoS 成本保护"), _t(110, "成本保护"), '']] },
  // 2024-12-03 起官方叫 Amazon SageMaker AI（Amazon SageMaker 现在指统一的数据和 AI 平台）；HyperPod、训练计划这些子功能官方没改名
  sagemaker: { n: 'SageMaker AI', g: 'ai', p: 460, type: 'paas', bill: 'hour', upg: [[_t(111, "多 AZ 推理端点"), '2 AZ', 'maz'], [_t(112, "多卡训练（GPU 集群）"), _t(113, "多卡训练"), 'scale'], [_t(114, "训练自己的大模型（HyperPod）"), _t(115, "自研大模型"), '']] },
  bedrock: { n: 'Bedrock', g: 'ai', p: 500, type: 'token', bill: 'token', upg: [['Nova Lite', 'Nova Lite', ''], ['Nova Pro', 'Nova Pro', ''], [_t(116, "跨区域推理"), 'Region', 'mr']] },
}), v => { SVC = v; }, () => SVC);
let CAP = __rv(() => ({ agentcore: _t(117, "会话"), ec2: _t(118, "实例"), ebs: _t(119, "卷"), vpc: _t(120, "子网"), elb: 'LCU', route53: _t(121, "托管区域"), ecr: _t(122, "仓库"), ecs: _t(123, "任务"), eks: _t(124, "节点"),
  lambda: _t(125, "并发"), apigw: _t(126, "请求配额"), dynamodb: _t(127, "容量单位"), sqs: _t(128, "队列"), eventbridge: _t(129, "规则"), sfn: _t(130, "状态机"), rds: _t(131, "只读节点"), aurora: _t(132, "副本节点"), elasticache: _t(133, "缓存节点"),
  kinesis: _t(134, "分片"), glue: 'DPU', athena: _t(135, "工作组"), redshift: _t(136, "计算节点"), dms: _t(137, "复制任务"), opensearch: _t(138, "数据节点"), guardduty: _t(139, "受保护账户"), inspector: _t(140, "扫描账户"),
  kms: _t(141, "密钥"), cloudfront: _t(142, "分配"), waf: _t(143, "规则组"), shield: _t(144, "受保护资源"), sagemaker: _t(118, "实例"), bedrock: _t(145, "模型单元"), s3: _t(146, "存储桶"), efs: _t(147, "吞吐单位"), cognito: _t(148, "用户池") }), v => { CAP = v; }, () => CAP);
export const CAP_MAX = 4;
// 「N 个 + 容量单位」：单位是英文缩写（LCU、DPU）时前面留空格，跟「3 个 AZ」的写法一致
export const capU = k => (/^[A-Za-z]/.test(CAP[k] || '') ? ' ' : '') + (CAP[k] || '');
let UTIL = __rv(() => ({
  cloudwatch: { n: 'CloudWatch', p: 150, g: 'util', type: 'util', bill: 'req', upg: [[_t(149, "详细监控"), _t(149, "详细监控"), ''], [_t(150, "告警与仪表板"), _t(151, "告警"), ''], [_t(152, "跨账户可观测性"), _t(153, "跨账户"), '']] },
  config: { n: 'Config', p: 150, g: 'util', type: 'util', bill: 'req', upg: [[_t(106, "托管规则"), _t(129, "规则"), ''], [_t(154, "自动修正"), _t(154, "自动修正"), ''], [_t(155, "聚合器"), _t(155, "聚合器"), '']] },   // 原来是 Data Transfer（不是服务，是账单项），11-07 换成 Config
  cloudtrail: { n: 'CloudTrail', p: 150, g: 'util', type: 'util', bill: 'req', upg: [[_t(156, "数据事件"), _t(156, "数据事件"), ''], [_t(157, "日志文件完整性验证"), _t(158, "完整性验证"), ''], [_t(159, "组织级跟踪"), _t(160, "组织跟踪"), '']] },
}), v => { UTIL = v; }, () => UTIL);
// 每个服务的三级升级：[名字, 格子上的短标, 效果, 这个功能现实里是干什么的]
let UPGRADES = __rv(() => ({
  s3: [[_t(11, "版本控制"), _t(11, "版本控制"), 'backup', _t(161, "保留每个对象的历史版本，误删、误改都能找回")], [_t(12, "智能分层"), _t(12, "智能分层"), 'cost', _t(162, "按访问频率自动把数据挪到便宜的存储层")], [_t(13, "自动生成缩略图"), _t(14, "缩略图"), 'boost', _t(163, "图片一上传，S3 事件通知就触发 Lambda 生成缩略图，写回另一个桶或前缀")]],
  efs: [[_t(15, "生命周期管理"), _t(16, "生命周期"), 'cost', _t(164, "不常用的文件自动转到低频访问存储，更便宜")], [_t(17, "自动备份"), _t(17, "自动备份"), 'backup', _t(165, "用 Backup 每天自动备份文件系统")], [_t(18, "跨区域复制"), 'Region', 'mr', _t(166, "把文件系统复制到另一个 Region")]],
  cognito: [[_t(19, "MFA 多因素认证"), 'MFA', 'audit', _t(167, "登录时除了密码再验一次（短信、邮件验证码或身份验证器应用），密码泄露了也登不进去")], [_t(20, "社交与企业登录"), _t(21, "联合登录"), 'boost', _t(168, "接入 Google、Apple 这类社交账号和公司的 SAML、OIDC 身份提供商，用户不用再记一套密码，来登录的人更多")], [_t(22, "身份池（联合身份）"), _t(23, "身份池"), 'cost', _t(169, "把用户池或社交账号登录后的身份换成临时的亚马逊云科技凭证，权限按角色限定，App 直接调用 S3、DynamoDB 这些服务，不用自己的服务器转一道")]],
  agentcore: [[_t(24, "Memory 记忆"), 'Memory', '', _t(170, "短期记忆存这次会话的上下文，长期记忆跨会话记住用户的偏好和关键事实")], [_t(25, "Gateway 工具网关"), 'Gateway', 'boost', _t(171, "把现有的 API、Lambda 函数接成 MCP 工具，智能体直接调业务接口")], [_t(26, "Identity 身份"), 'Identity', 'audit', _t(172, "智能体有自己的身份：代用户调第三方服务时走 OAuth 授权，不用把密钥写进代码")]],
  ec2: [[_t(27, "自动 AMI"), _t(27, "自动 AMI"), 'backup', _t(173, "用 Data Lifecycle Manager 按计划给实例做 AMI（连同挂着的 EBS 卷），实例坏了、被误删了，直接用镜像再起一台")], [_t(28, "跨 AZ Auto Scaling"), 'ASG', 'maz+scale', _t(174, "Auto Scaling 组跨几个 AZ 放实例，按 CPU 或请求数自动加减；一个 AZ 出问题，别的 AZ 里的实例顶上")], ['Graviton', 'Graviton', 'cost', _t(175, "换成 Arm 架构实例，同样性能更便宜")]],
  ebs: [[_t(176, "自动快照（DLM）"), _t(177, "自动快照"), 'backup', _t(178, "按计划自动给卷拍快照，误删数据能恢复；卷本身还是只在一个 AZ")], [_t(30, "gp3 卷"), 'gp3', 'cost', _t(179, "性能和容量分开计费，比 gp2 便宜")], [_t(31, "跨区域快照复制"), _t(180, "跨区快照"), '', _t(181, "快照复制到另一个 Region 做灾备，出事后能在那边重建卷")]],
  vpc: [[_t(32, "私有子网 + NAT"), _t(33, "私有子网"), 'priv', _t(182, "实例不直接暴露在公网，也不用付公网 IPv4 地址费（2024 年起按小时收），出网走 NAT 网关")], ['Session Manager', 'SSM', 'bastion', _t(183, "不开 22 端口、不用跳板机，也能登录私有子网里的实例，操作全程有记录")], ['Transit Gateway', 'TGW', 'boost', _t(184, "把多个 VPC 和公司机房连成一张网")]],
  elb: [['HTTPS + ACM', 'HTTPS', 'tls', _t(185, "用 ACM 免费证书开 HTTPS，证书自动续期")], [_t(186, "LCU 预留"), _t(186, "LCU 预留"), 'scale', _t(187, "提前预留负载均衡器容量单位（LCU），接得住可预期的流量高峰")], [_t(35, "负载均衡 + Auto Scaling"), 'ELB+ASG', '', _t(188, "目标组挂在 EC2 Auto Scaling 组上：健康检查发现坏实例，Auto Scaling 自动换一台新的；流量高了按每个目标的请求数自动加机器")]],
  // boost（这块过路费再 +20%）不管几级都只乘一次 1.2（见 baseRent0、rentAt）。Route 53「延迟路由」、Athena「联合查询」、Shield「SRT」前面已经有一级 boost，
  // 这几级再标就成了说明写「再 +20%」实际不加，所以留空，界面写「过路费提高」，数字不变
  route53: [[_t(36, "健康检查"), _t(36, "健康检查"), 'boost', _t(189, "定期探测后端是否健康，不健康的不再分流量")], [_t(37, "故障转移路由"), _t(38, "故障转移"), 'mr', _t(190, "主站挂了自动把域名切到备用站")], [_t(39, "延迟路由"), _t(39, "延迟路由"), '', _t(191, "把用户导到延迟最低的 Region")]],
  ecr: [[_t(40, "基础扫描"), _t(40, "基础扫描"), '', _t(192, "推送镜像时扫一遍已知漏洞")], [_t(41, "增强扫描"), _t(41, "增强扫描"), 'scanimg', _t(193, "用 Inspector 持续扫描镜像里的系统包和语言包")], [_t(18, "跨区域复制"), 'Region', 'mr', _t(194, "镜像自动复制到别的 Region，就近拉取")]],
  // Service Connect 只管同一命名空间里 ECS 服务之间的调用，外部第三方 API 不走它的代理，所以不给「第三方 API 挂了」免疫
  ecs: [['Service Connect', 'Service Connect', '', _t(195, "同一命名空间里的 ECS 服务互相发现，代理自动做负载均衡、重试和异常检测；只管服务之间的调用，外部 API 不走这个代理")], ['Fargate', 'Fargate', 'ssh', _t(196, "不用管服务器：主机和操作系统由亚马逊云科技打补丁，也没有 SSH 可以登录；镜像里的漏洞还要靠 ECR 增强扫描")], [_t(43, "服务自动扩缩"), 'ASG', 'scale', _t(197, "按 CPU 或请求数自动加减任务")]],
  eks: [[_t(42, "多 AZ"), '2 AZ', 'maz', _t(198, "工作节点分散到多个 AZ")], [_t(44, "Karpenter 自动扩缩"), 'Karpenter', 'scale', _t(199, "按需快速拉起最合适的节点")], ['EKS Auto Mode', 'Auto Mode', 'ssh', _t(200, "节点交给亚马逊云科技管理：自动打补丁，最长 21 天换一批新节点，节点不开 SSH；镜像里的漏洞还要靠 ECR 增强扫描")]],
  lambda: [[_t(46, "提高并发配额"), _t(47, "并发配额"), 'scale', _t(201, "申请更高的并发上限，流量大也不被限流")], [_t(48, "预置并发"), _t(48, "预置并发"), 'boost', _t(202, "提前准备好执行环境，消除冷启动")], [_t(49, "容器镜像 + Web Adapter"), _t(50, "Web 框架"), 'cost', _t(203, "用容器镜像打包函数（最大 10 GB），配上 Lambda Web Adapter，Express、Flask、Spring Boot 这些 Web 框架基本不用改代码就能跑；不用常开的服务器，按请求付钱")]],
  apigw: [[_t(51, "使用计划限流"), _t(52, "限流"), 'scale', _t(204, "按阶段和 API 密钥限制请求速率，突发请求不会全压到后端；官方说明这是尽力而为，防 DDoS 要靠 WAF")], [_t(53, "接入认证"), _t(54, "认证"), 'audit', _t(205, "用 Cognito 用户池、Lambda 授权方或 IAM 校验调用方：没登录、没权限的请求在网关就被挡掉，到不了后端")], [_t(55, "缓存"), _t(55, "缓存"), 'boost', _t(206, "把响应缓存起来，少调后端，响应更快；缓存按小时收费")]],
  dynamodb: [[_t(56, "预置容量 + Auto Scaling"), _t(34, "预置容量"), 'cost', _t(207, "流量稳定时改成预置读写容量，配 Auto Scaling 自动调整，比按需便宜")], [_t(57, "时间点恢复"), 'PITR', 'backup', _t(208, "可以把表恢复到最近 35 天内任意一秒")], [_t(58, "全局表"), 'Region', 'mr', _t(209, "多个 Region 同时读写、自动同步")]],
  // SQS 本身在可见性超时后会重新投递，所以持有 SQS 就免疫「依赖的第三方 API 挂了」；死信队列只是把反复处理失败的消息隔离出来方便排查，不另给免疫
  sqs: [[_t(59, "死信队列"), _t(59, "死信队列"), '', _t(210, "反复处理失败的消息转到单独的队列，方便排查原因")], [_t(60, "长轮询"), _t(60, "长轮询"), 'cost', _t(211, "没消息时等一会儿再返回，减少空请求，省钱")], [_t(61, "积压告警 + SNS 通知"), _t(62, "SNS 通知"), 'boost', _t(212, "CloudWatch 告警盯着队列积压和死信队列里的消息数，超过阈值就通过 SNS 发邮件、短信或推到聊天群，消息堆起来马上有人知道")]],
  eventbridge: [[_t(63, "定时启停 EC2"), _t(64, "定时启停"), '', _t(213, "EventBridge Scheduler 按时间表开关实例：开发测试环境晚上、周末自动停机，上班前再开起来")], [_t(65, "Health 事件通知"), _t(66, "Health 通知"), '', _t(214, "规则订阅 Health 事件，计划维护、实例退役一来就推到 SNS、Slack，提前处理")], [_t(67, "调用任意 API"), _t(68, "通用目标"), 'cost', _t(215, "Scheduler 的通用目标能按时间表直接调几乎任何亚马逊云科技 API，不用再写一个 Lambda 转一手")]],
  sfn: [[_t(69, "Express 工作流"), 'Express', 'cost', _t(216, "适合 5 分钟内跑完的高频短流程：按执行次数和运行时长（按内存折算）计费，不按状态转换数计，步骤多、跑得快时更便宜")], [_t(70, "分布式 Map"), _t(70, "分布式 Map"), 'boost', _t(217, "并行处理上百万个项目")], [_t(71, "多区域"), 'Region', 'mr', _t(218, "在多个 Region 部署状态机（现实里没有一键开关：要自己在另一个 Region 再部署一套，配合 Route 53 或应用自己切换）")]],
  rds: [[_t(42, "多 AZ"), '2 AZ', 'maz', _t(219, "备库在另一个 AZ，主库故障自动切换")], [_t(72, "只读副本"), _t(72, "只读副本"), 'scale', _t(220, "读请求分到副本上，主库压力小")], [_t(73, "跨区域只读副本"), 'Region', 'mr', _t(221, "在另一个 Region 放一份可以随时提升为主库的副本")]],
  aurora: [[_t(42, "多 AZ"), '2 AZ', 'maz', _t(222, "在其他 AZ 加 Aurora 副本，主实例故障自动切换；存储本来就在 3 个 AZ 里存 6 份，单 AZ 的只是计算实例")], ['Aurora Auto Scaling', 'ASG', 'scale', _t(223, "按负载自动加减只读副本")], [_t(74, "全球数据库"), 'Region', 'mr', _t(224, "跨 Region 复制，通常 1 秒内同步")]],
  elasticache: [[_t(42, "多 AZ"), '2 AZ', 'maz', _t(225, "主节点故障自动切到另一个 AZ 的副本")], [_t(75, "集群模式"), _t(75, "集群模式"), 'scale', _t(226, "数据分片到多个节点，容量和吞吐都能横向扩")], [_t(76, "全局数据存储"), 'Region', 'mr', _t(227, "跨 Region 复制缓存数据")]],
  kinesis: [[_t(77, "按需模式"), _t(77, "按需模式"), 'scale', _t(228, "不用自己管分片数，按流量自动扩缩（按数据流小时和数据量计费）")], [_t(78, "增强扇出"), _t(78, "增强扇出"), 'boost', _t(229, "每个消费者独享读取吞吐，互不抢")], [_t(79, "数据转换"), 'ETL', 'cost', _t(230, "Data Firehose 投递前调用 Lambda 清洗、转换每条记录，或者按 Glue 数据目录里的表结构转成 Parquet 再写进 S3：存得更省，下游用 Athena 查时扫的数据也少")]],
  glue: [[_t(80, "数据目录"), _t(80, "数据目录"), 'boost', _t(231, "统一管理所有表的结构，Athena、Redshift 都能直接用")], [_t(81, "作业书签"), _t(81, "作业书签"), 'cost', _t(232, "只处理新增的数据，不重复跑")], [_t(82, "数据质量"), _t(82, "数据质量"), '', _t(233, "自动检查数据是否完整、是否符合规则")]],
  athena: [[_t(83, "分区投影"), _t(83, "分区投影"), 'cost', _t(234, "按规则直接算出分区位置，不用查数据目录；配合分区只扫需要的数据，扫得少花得少")], [_t(84, "查询结果复用"), _t(85, "结果复用"), 'boost', _t(235, "同样的查询直接用上次的结果")], [_t(86, "联合查询"), _t(86, "联合查询"), '', _t(236, "一条 SQL 同时查 S3、数据库、日志等多个数据源")]],
  redshift: [[_t(42, "多 AZ"), '2 AZ', 'maz', _t(237, "集群部署在两个 AZ")], [_t(87, "并发扩展"), _t(87, "并发扩展"), 'scale', _t(238, "查询多的时候自动加临时集群")], [_t(88, "Zero-ETL 集成"), 'Zero-ETL', 'boost', _t(239, "Aurora、RDS for MySQL、DynamoDB 里的数据近实时同步进 Redshift，不用自己搭 ETL 管道；方向是同步进来，要把 Redshift 的数据给别处用，靠数据共享或 UNLOAD 到 S3")]],
  dms: [[_t(89, "多 AZ 复制实例"), '2 AZ', 'maz', _t(240, "复制实例在另一个 AZ 放一台同步的备用实例，主实例所在的 AZ 出问题自动切过去，迁移和持续复制不断")], ['DMS Serverless', 'Serverless', 'cost', _t(241, "不用自己挑复制实例的大小，按实际用的容量单位（DCU）自动扩缩、按用量计费")], ['Schema Conversion', _t(90, "异构迁移"), 'boost', _t(242, "把 Oracle、SQL Server 的表结构、存储过程、函数自动转换成 Aurora PostgreSQL、MySQL 能用的，换数据库引擎不用手工重写")]],
  opensearch: [[_t(91, "多 AZ（含备用）"), '2 AZ', 'maz', _t(243, "数据节点分布在多个 AZ，还有一个 AZ 专门备用")], ['UltraWarm', 'UltraWarm', 'cost', _t(244, "旧数据放到便宜的温存储")], [_t(92, "跨集群复制"), 'Region', 'mr', _t(245, "把索引复制到另一个 Region 的集群")]],
  // 运行时监控看主机里的进程和文件；SSH 暴力破解是基础检测从 VPC 流日志里发现的，开了 GuardDuty 就有，所以不挂在这一级
  // 发现桶被公开是基础检测从 CloudTrail 管理事件里做的（Policy:S3/BucketPublicAccessGranted），不用开 S3 保护；GuardDuty 也只告警、不改桶权限，所以这一级不给免疫，减损在 #7 结算里
  guardduty: [[_t(93, "S3 保护"), _t(93, "S3 保护"), '', _t(246, "监控 S3 里的可疑访问和数据外泄")], [_t(94, "运行时监控"), _t(94, "运行时监控"), '', _t(247, "盯 EC2、ECS、EKS 里的可疑进程、文件和网络行为（要装代理，可以自动管理）")], [_t(95, "所有区域开启"), _t(248, "全区域"), 'audit', _t(249, "没在用的 Region 也开启威胁检测，攻击者在偏僻 Region 开机器也能发现；满足合规要求")]],
  inspector: [[_t(96, "EC2 扫描"), _t(96, "EC2 扫描"), 'scan', _t(250, "持续扫描 EC2 上的软件漏洞")], [_t(97, "ECR 镜像扫描"), _t(98, "镜像扫描"), 'scanimg', _t(251, "持续扫描容器镜像里的漏洞")], [_t(99, "Lambda 扫描"), _t(99, "Lambda 扫描"), 'audit', _t(252, "扫描 Lambda 函数代码和依赖包里的漏洞")]],
  kms: [[_t(100, "客户托管密钥"), 'CMK', 'dataprot', _t(253, "自己控制密钥策略和权限，没有密钥权限的人拿到数据也解不开")], [_t(101, "自动轮换"), _t(101, "自动轮换"), 'audit', _t(254, "按设定周期（90–2560 天，默认 1 年）自动更换密钥材料，满足合规要求")], [_t(102, "多区域密钥"), 'Region', 'mr', _t(255, "同一把密钥在多个 Region 都能用")]],
  cloudfront: [[_t(103, "HTTPS（ACM）"), 'HTTPS', 'tls', _t(256, "用 ACM 免费证书开 HTTPS")], [_t(104, "源访问控制"), 'OAC', 'dataprot', _t(257, "只允许 CloudFront 访问 S3 源站，桶不用公开")], [_t(105, "源故障转移"), _t(38, "故障转移"), 'mr', _t(258, "主源站挂了自动切到备用源站")]],
  waf: [[_t(106, "托管规则"), _t(106, "托管规则"), 'audit', _t(259, "一键启用常见攻击防护规则，满足合规要求")], [_t(107, "限速规则"), _t(107, "限速规则"), 'ddos', _t(260, "单个 IP 请求太多就拦截")], ['Bot Control', 'Bot', 'boost', _t(261, "识别爬虫、扫描器、状态监控、搜索引擎这类机器人流量，可以只计数观察、限速或拦截；用目标检查级别还能质询不报身份的机器人")]],
  shield: [[_t(36, "健康检查"), _t(36, "健康检查"), 'boost', _t(262, "结合健康检查更快、更准地发现攻击")], [_t(263, "Shield 响应团队（SRT）"), 'SRT', '', _t(264, "遭到攻击时，Shield 响应团队帮你分析和处置（要订阅 Business Support+ 或 Enterprise Support）")], [_t(109, "DDoS 成本保护"), _t(110, "成本保护"), '', _t(265, "DDoS 导致的扩容费用可以申请抵扣")]],
  sagemaker: [[_t(111, "多 AZ 推理端点"), '2 AZ', 'maz', _t(266, "推理实例分布在多个 AZ")], [_t(112, "多卡训练（GPU 集群）"), _t(113, "多卡训练"), 'boost', _t(267, "先用训练计划预留一批 GPU，再多卡并行训练，模型更大、训练更快")], [_t(114, "训练自己的大模型（HyperPod）"), _t(115, "自研大模型"), '', _t(268, "用 HyperPod 集群训练自己的基础模型，节点坏了自动换")]],
  bedrock: [['Nova Lite', 'Nova Lite', '', _t(269, "换成更强的模型，每个 token 更贵")], ['Nova Pro', 'Nova Pro', '', _t(270, "再换成更强的模型，每个 token 更贵")], [_t(116, "跨区域推理"), _t(116, "跨区域推理"), 'scale', _t(271, "请求自动分到同一地理区域里的多个 Region，扛得住突发流量；本 Region 出故障时照样调不通")]],
  // 日志费主要花在摄取上，保留期挡不住「日志打太多了」；它省的是存储费，所以算降成本
  cloudwatch: [[_t(272, "日志保留期"), _t(273, "保留期"), 'cost', _t(274, "给日志组设置保留期，过期自动删除，省存储费")], [_t(150, "告警与仪表板"), _t(151, "告警"), '', _t(275, "指标超过阈值自动告警")], [_t(152, "跨账户可观测性"), _t(153, "跨账户"), '', _t(276, "在一个账户里看所有账户的指标和日志")]],
  // CloudTrail Lake 从 2026-05-31 起不再接新客户，第 2 级换成仍在提供、又对得上审计的日志文件完整性验证
  cloudtrail: [[_t(156, "数据事件"), _t(156, "数据事件"), '', _t(277, "记录 S3 对象级、Lambda 调用等细粒度操作")], [_t(157, "日志文件完整性验证"), _t(158, "完整性验证"), 'audit', _t(278, "每小时生成一份带数字签名的摘要文件，事后能证明日志有没有被改过、删过")], [_t(159, "组织级跟踪"), _t(160, "组织跟踪"), 'audit', _t(279, "一个跟踪覆盖组织里所有账户")]],
  config: [[_t(106, "托管规则"), _t(129, "规则"), 'audit', _t(280, "用托管规则持续检查资源配置合不合规，比如 S3 桶有没有公开、EBS 卷有没有加密")], [_t(154, "自动修正"), _t(154, "自动修正"), 'dataprot', _t(281, "不合规的资源用 Systems Manager 自动化文档自动改回来，比如把公开的 S3 桶改回私有")], [_t(155, "聚合器"), _t(155, "聚合器"), '', _t(282, "把多个账户、多个区域的配置和合规结果汇总到一处看")]],
}), v => { UPGRADES = v; }, () => UPGRADES);
Object.entries(UPGRADES).forEach(([k, v]) => { (SVC[k] || UTIL[k]).upg = v; });
// 平衡参数（?bal={} 能覆盖，地狱模式在 rules/35-modes.js 换一部分）；jailFee 是被送进维护窗口后付钱提前出来的价钱（落在维护窗口格上交的 $50 不算）。
// 放在格子数据前面：SPECIAL 的说明要用
export const BAL = Object.assign({ salary: 200, cashMul: 1, hourLow: [5, 10, 20, 30], hourHigh: [10, 20, 30, 40], capLow: 5, capHigh: 10, req: 0.15, token: 0.25, rentBase: 0.2, sell: 0.8, cardGrow: 0.5, protect: 2, growth: 0.75, growthEvery: 5, skillFull: 1.2, seatBonus: 50, rsKeepCombo: 1, rsKeepGroup: 1, rsComboMul: 2, rsCashSum: 1, rsLimitPer: 300, rsHell: 0.2, jailFee: 500 },
  (() => { try { return JSON.parse(new URLSearchParams(location.search).get('bal') || '{}'); } catch (e) { return {}; } })());

export const BAL0 = { ...BAL };
export let SPECIAL = __rv(() => ({
  go: { t: 'go', n: _t(283, "Startup 扶持"), icon: 'activate', d: _t(284, "经过或停下领 $200 Credits，并交运行费") },
  jail: { t: 'jail', n: _t(285, "维护窗口"), icon: 'ssm', d: _tf(5674, "落在这里：停一轮，或者交 $50 照常走；被送进来：下回合停一轮，或者付 ${$0} 马上出来", BAL.jailFee) },
  free: { t: 'free', n: _t(287, "User Group 活动"), icon: 'users', d: _t(288, "经过 UG 活动领取 $50；停在上面二选一：抽奖 $100～奖池全部（不够亚马逊云科技补）/ 抽 3 张 re:Invent 卡选一张") },
  gotojail: { t: 'gotojail', n: _t(289, "Root 密钥泄露"), icon: 'iam', d: _t(290, "直接进维护窗口") },
  inc: { t: 'inc', n: _t(291, "Health 事件"), icon: 'health', d: _t(292, "抽一张 Health 事件卡") },
  rei: { t: 'rei', n: 're:Invent', icon: 'reinvent', d: _t(293, "抽一张 re:Invent 卡") },
  tax: { t: 'tax', n: _t(294, "忘关的 EC2"), icon: 'ec2', d: _t(295, "交 $200 或总资产 10%（自选），进奖池") },
  tax2: { t: 'tax2', n: _t(296, "NAT Gateway 账单"), icon: 'billing', d: _t(297, "交 $100 进奖池；VPC 开了私有子网（有 NAT 网关）的交 $200") },
}), v => { SPECIAL = v; }, () => SPECIAL);
// 同色服务打散在棋盘四边（每组三块大约隔 15 格），落在自己的服务上可以「同色跳」到下一块同色服务
const LAYOUT = ['go', 's3', 'agentcore', 'rei', 'vpc', 'ecr', 'tax', 'lambda', 'sqs', 'cloudwatch', 'rds', 'kinesis', 'inc', 'redshift',
  'jail', 'guardduty', 'cloudfront', 'sagemaker', 'efs', 'ec2', 'elb', 'ecs', 'apigw', 'eventbridge',
  'free', 'aurora', 'glue', 'rei', 'dms', 'inspector', 'waf', 'inc', 'bedrock', 'config', 'ebs', 'cognito', 'tax2', 'route53',
  'gotojail', 'eks', 'dynamodb', 'sfn', 'elasticache', 'athena', 'opensearch', 'cloudtrail', 'kms', 'shield'];
// 横向长方形棋盘：上下各 13 格、左右各 9 格（不含角）
export const N = LAYOUT.length, BW = 15, BH = 11, CORNERS = [0, BW - 1, BW + BH - 2, 2 * BW + BH - 3];
export const sideIdx = i => i < CORNERS[1] ? 0 : i < CORNERS[2] ? 1 : i < CORNERS[3] ? 2 : 3;
export const isCorner = i => CORNERS.includes(i);
// 搜索用的别名：简称、常见叫法和中文叫法，逗号隔开。只用来搜（图鉴、架构讲解、服务知识点三处的搜索框），不显示。
// 搜的时候大小写、空格、连字符都不算，所以「apig」「api gateway」「API-Gateway」都能搜到 API Gateway。
// 每个词各自比，不跨词拼起来比；英文全称里像 storage 这种会把「rag」也搜出来的就不放
let SVC_ALIAS = __rv(() => ({
  s3: _t(298, "对象存储,存储桶,bucket"), efs: _t(299, "文件系统,共享文件,nfs"), cognito: _t(300, "登录,用户池,认证,身份,user pool,oidc,sso"),
  agentcore: _t(301, "智能体,agent,代理"), ec2: _t(302, "虚拟机,服务器,云主机,实例,vm,instance"), ebs: _t(303, "云盘,块存储,硬盘,磁盘,卷,volume"),
  vpc: _t(304, "私有网络,子网,安全组,subnet,security group"), elb: _t(305, "负载均衡,alb,nlb,load balancer"), route53: _t(306, "dns,域名,解析,r53"),
  ecr: _t(307, "镜像仓库,容器镜像,docker,registry"), ecs: _t(308, "容器,docker,fargate"), eks: _t(309, "容器,k8s,kubernetes"),
  lambda: _t(310, "函数,无服务器,serverless,faas"), apigw: _t(311, "apig,api,网关,rest api,http api,websocket"), dynamodb: _t(312, "ddb,nosql,键值,key value"),
  sqs: _t(313, "队列,消息队列,queue,mq"), eventbridge: _t(314, "事件总线,事件,event bus"), sfn: _t(315, "工作流,状态机,编排,workflow,state machine"),
  rds: _t(316, "关系数据库,数据库,mysql,postgresql,postgres,mariadb,oracle,sql server"), aurora: _t(317, "关系数据库,数据库,mysql,postgresql,postgres"), elasticache: _t(318, "缓存,redis,valkey,memcached,cache"),
  kinesis: _t(319, "实时流,流数据,stream,data streams,firehose"), glue: _t(320, "etl,数据目录,爬网程序,data catalog,crawler"), athena: _t(321, "sql,查询,交互式查询,trino,presto"),
  redshift: _t(322, "数仓,数据仓库,data warehouse,olap"), dms: _t(323, "数据库迁移,迁移,cdc"), opensearch: _t(324, "搜索,全文检索,向量,elasticsearch,es,kibana"),
  guardduty: _t(325, "威胁检测,入侵检测"), inspector: _t(326, "漏洞扫描,漏洞,cve"), kms: _t(327, "加密,密钥,key"),
  cloudfront: _t(328, "cdn,内容分发,加速,边缘,cf"), waf: _t(329, "防火墙,web 应用防火墙,firewall"), shield: _t(330, "ddos,防护"),
  sagemaker: _t(331, "机器学习,训练,推理,ml"), bedrock: _t(332, "大模型,生成式,基础模型,llm,genai,rag"), cloudwatch: _t(333, "监控,日志,告警,指标,metrics,logs,alarm,cw"),
  config: _t(334, "合规,配置审计,配置规则"), cloudtrail: _t(335, "审计,操作记录,调用记录,audit")
}), v => { SVC_ALIAS = v; }, () => SVC_ALIAS);
// 搜索时统一的写法：小写，去掉空格、连字符、点、斜杠和括号；竖线不去掉，用来隔开各个词
export const qNorm = s => String(s || '').toLowerCase().replace(_tr(336, "[\\s\\-_·・.\\/()（）「」]+", "g"), '');
// 一块服务的搜索词：key 加别名，每个词先统一写法，再用竖线隔开
export const aliasQ = k => [k, ...(SVC_ALIAS[k] || '').split(',')].map(qNorm).filter(Boolean).join('|');
// 免责声明：封面、图鉴、玩法手册、服务知识点页、架构讲解页都用这几句。DISC_GENAI 是总的说法；
// DISC_GENAI_SVC 跟在 Bedrock、AgentCore 的介绍后面（「前述」指上面刚介绍的服务）；DISC_PRICE 放在有价格的地方
export let DISC_GENAI = __rv(() => (_t(337, "免责声明：游戏里特定亚马逊云科技生成式人工智能相关的服务仅在亚马逊云科技海外区域可用，亚马逊云科技 User Group 仅为帮助您了解行业前沿技术和发展海外业务选择推介该服务。亚马逊云科技中国区域相关云服务由西云数据和光环新网运营，具体信息以中国区域官网为准。")), v => { DISC_GENAI = v; }, () => DISC_GENAI);
export let DISC_GENAI_SVC = __rv(() => (_t(338, "免责声明：前述特定亚马逊云科技生成式人工智能相关的服务目前在亚马逊云科技海外区域可用。亚马逊云科技中国区域相关云服务由西云数据和光环新网运营，具体信息以中国区域官网为准。")), v => { DISC_GENAI_SVC = v; }, () => DISC_GENAI_SVC);
export let DISC_PRICE = __rv(() => (_t(339, "游戏内价格为虚构，不代表实际定价；$ 是游戏币单位。")), v => { DISC_PRICE = v; }, () => DISC_PRICE);
// 文档（更新说明、手册 PDF）在哪：发布的网站里 docs/ 和游戏在同一层；直接打开仓库里的 code/index.html 时在上一层
export const DOCS = /\/code\/(index(\.i18n)?\.html)?$/.test(location.pathname) ? '../docs/' : 'docs/';
// 玩法来源：封面免责声明一栏最后一行；「请告知」链到 GitHub issue
export let DISC_PLAY = __rv(() => (_t(340, "本游戏为原创作品，规则借鉴了已进入公共领域的经典地产类桌游机制（可追溯至 1904 年的 The Landlord’s Game），与任何第三方品牌无关联、无授权关系。游戏内容如有疏漏，欢迎通过上面的反馈地址告知。")), v => { DISC_PLAY = v; }, () => DISC_PLAY);   // 封面「免责声明」一栏的最后一句：模仿声明和侵权处理（反馈地址在上面「反馈」那一行）
export const GENAI_K = ['bedrock', 'agentcore'];   // 只在海外区域可用的生成式 AI 服务
// 游戏版本：tools/stamp_version.py 按「更新说明.html」最后一轮和这个文件的内容自动写（同步到仓库前跑），别手改。输入 :version 回车能看
export const LANG_KEY = 'aws-tycoon-lang';   // 记住上次选的语言：根目录 index.html 按它打开哪个版本
// 有哪些语言：每种语言用它自己的写法（不翻译）。中文版在 code/index.html，别的语言在 code/<代码>/index.html（tools/i18n.mjs build <代码> 按 i18n/<代码>.json 生成）。
// 以后加语言：这里加一行，再出一份 i18n/<代码>.json
export let LANGS = __rv(() => ([{ code: 'zh', name: _t(341, "简体中文") }, { code: 'en', name: 'English' }, { code: 'ja', name: _t(342, "日本語") }]), v => { LANGS = v; }, () => LANGS);
export let GAME_VERSION = __rv(() => ({ major: 1, round: 21, name: _t(5661, "第二十一轮"), title: _t(5662, "中途加入、埋 Health 卡、12 张新卡、修 27 处问题"), commits: 184, changes: 518, since: '2026-10-20', build: 'a550e03', time: '2026-11-22 10:48' }), v => { GAME_VERSION = v; }, () => GAME_VERSION);
export let SQ = __rv(() => (LAYOUT.map(k => SVC[k] ? { t: 'prop', k, icon: k, ...SVC[k] } : UTIL[k] ? { t: 'util', k, icon: k, ...UTIL[k] } : { k, ...SPECIAL[k] })), v => { SQ = v; }, () => SQ);
export const IX = {}; SQ.forEach((s, i) => { if (!(s.k in IX)) IX[s.k] = i; });
export const GRP = g => SQ.map((s, i) => s.g === g ? i : -1).filter(i => i >= 0);
export let UTILS = __rv(() => (SQ.map((s, i) => s.t === 'util' ? i : -1).filter(i => i >= 0)), v => { UTILS = v; }, () => UTILS);
export let OWNABLE = __rv(() => (SQ.map((s, i) => ['prop', 'util'].includes(s.t) ? i : -1).filter(i => i >= 0)), v => { OWNABLE = v; }, () => OWNABLE);
// 升级费按色组定：同组三块打散在不同的边，过路费又只看价格，按边收会让同价的 RDS 和 Aurora 升满差 3 倍，落点最少的右边反而升级最贵。
// 每组取原来三条边的平均，取整到 $50（加容量是它的一半）。函数名没改：tools/gamedata.mjs 按这个名字取
// 按用量收费的三格每级只让倍数 +3，按 $150 收要几十轮才回本（电脑每局在上面白扔 $100 多），所以单独定 $50
const GRP_UPG = { storage: 100, iaas: 100, net: 100, ctr: 100, integ: 100, db: 150, ana: 150, sec: 150, ai: 150, util: 50 };
// 11-08 换色组时升级价不变：DynamoDB 原来在 $100 一档，CloudFront 原来在 $150 一档，Cognito 接 Backup 的 $100
const SVC_UPG = { dynamodb: 100, cloudfront: 150, cognito: 100 };
export const sideCost = i => SVC_UPG[SQ[i].k] ?? GRP_UPG[SQ[i].g] ?? [50, 100, 150, 200][sideIdx(i)];
// 升到第 l 级的价钱（基础价，落地时还按情况加钱或减半）：越往上越贵，三级加起来是基础价的 3 倍，和以前每级一个价的总数一样
const UP_MUL = [0.75, 1, 1.25];
export const upCost = (i, l) => Math.round(sideCost(i) * UP_MUL[l - 1] / 5) * 5;
export const upCostsTxt = i => [1, 2, 3].map(l => _tf(348, "第 {$0} 级 ${$1}", l, upCost(i, l))).join(_t(349, "、"));
export const isInst = i => ['iaas', 'paas', 'ctr'].includes(SQ[i].type);
export const haOf = i => isInst(i) ? 'inst' : SQ[i].type === 'glb' ? 'global' : 'region';
export let HA_N = __rv(() => ({ inst: _t(350, "实例型"), region: _t(351, "托管服务"), global: _t(352, "全局服务") }), v => { HA_N = v; }, () => HA_N);
export let TYPE_N = __rv(() => ({ util: _t(353, "按用量"), iaas: 'IaaS', paas: 'PaaS', ctr: _t(3, "容器"), sls: LANG === 'ja' ? 'サーバーレス' : 'Serverless', mgd: _t(351, "托管服务"), glb: _t(352, "全局服务"), token: _t(354, "按 token 计费") }), v => { TYPE_N = v; }, () => TYPE_N);
export let BILL_N = __rv(() => ({ hour: _t(355, "按小时"), req: _t(353, "按用量"), sub: _t(356, "订阅"), token: _t(357, "按 token"), free: _t(358, "免费"), bundle: _t(359, "打包价") }), v => { BILL_N = v; }, () => BILL_N);
// 现实里能停机或缩到 0 的才能下线：EC2、RDS、Aurora（最多停 7 天，到期自动启动）、Redshift（暂停）、ECS（任务数调到 0）。
// OpenSearch、ElastiCache 不能停
export const OFFLINE_OK = new Set(['ec2', 'rds', 'aurora', 'redshift', 'ecs']);
export const OFFLINE_MIN = 3;   // 下线固定几轮（主人的回合数）：满了自动恢复。这几轮里主人落到这一格可以提前免费拉起来，别人落上来可以付原价买走
// 停机后存储照收：EC2 的 EBS 卷、RDS / Aurora / Redshift 的存储；ECS 任务数调到 0 不花钱
export const OFFLINE_FEE = { ec2: 5, rds: 5, aurora: 5, redshift: 5, ecs: 0 };
// 「旧版本停止支持」只打带版本的服务，值是到期的那样东西（写进日志）。DynamoDB、S3、SQS、CloudFront 这类没有版本可言；
// Athena 引擎版本、Fargate 平台版本到期会自动升级，EC2 到期的只是系统镜像，都不算
export let EOL_VER = __rv(() => ({ rds: _t(360, "数据库引擎大版本"), aurora: _t(360, "数据库引擎大版本"), elasticache: _t(361, "引擎版本"), opensearch: _t(361, "引擎版本"), eks: _t(362, "Kubernetes 版本"), lambda: _t(363, "运行时"), glue: _t(364, "版本"), dms: _t(365, "复制引擎版本"), bedrock: _t(366, "模型") }), v => { EOL_VER = v; }, () => EOL_VER);
const onlineCost = i => 0;   // 重新上线不要钱：主人落到这一格就拉起来，满 OFFLINE_MIN 轮没人动它自动恢复；下线时拿回的一半不用还
// 高可用归类：自带跨 AZ / 要自己做多 AZ / 永远单 AZ / 全局
export function haTag(i) {
  const s = SQ[i];
  if (s.t !== 'prop') return null;
  if (s.k === 'ebs') return { k: 'single', t: _t(367, "永远单 AZ"), d: _t(368, "EBS 卷只存在于一个 AZ，靠快照在别处恢复") };
  if (s.k === 'ecs') return { k: 'auto', t: _t(369, "默认跨 AZ"), d: _t(370, "ECS 服务默认把任务分散到多个 AZ") };
  if (isInst(i)) { const mz = SQ[i].upg ? SQ[i].upg.findIndex(u => effIn(u[2], 'maz')) + 1 : 0; return { k: 'diy', t: _t(371, "要自己做多 AZ"), d: mz ? _tf(372, "买下时是单 AZ，第 {$0} 级「{$1}」升多 AZ", mz, SQ[i].upg[mz - 1][0]) : _t(373, "买下时是单 AZ") }; }
  if (s.type === 'glb') return { k: 'glb', t: _t(352, "全局服务"), d: _t(374, "不在任何一个 AZ 或 Region 里，天生扛 AZ 和 Region 故障") };
  return { k: 'auto', t: _t(375, "自带跨 AZ 高可用"), d: _tf(376, "{$0}由亚马逊云科技在多个 AZ 里运行，不用自己做多 AZ；要扛整个 Region 出问题，才需要升多区域", TYPE_N[s.type]) };
}
// 「第 1 级「Nova Lite」」：日志、明细、落地卡、格子悬停都用这个写法，一眼看出升到第几级（共 3 级）；没升级写「未升级（基础版）」
export const lvFull = (i, l) => l ? _tf(377, "第 {$0} 级「{$1}」", l, lvName(i, l)) : _tf(378, "未升级（{$0}）", lvName(i, 0));
export const lvName = (i, l) => l ? SQ[i].upg[l - 1][0] : (SQ[i].k === 'bedrock' ? 'Nova Micro' : isInst(i) && SQ[i].k !== 'ecs' ? _t(379, "单 AZ") : _t(380, "基础版"));
let EFF_N = __rv(() => ({
  maz: _t(381, "扛住 AZ 断电和单点故障"), mr: _t(382, "扛住整个 Region 出问题"), scale: _t(383, "扛住流量暴增"), backup: _t(384, "免疫误删数据"),
  cost: _t(385, "运行费或请求费减半"), scan: _t(386, "你的 EC2 免疫高危 CVE"), scanimg: _t(387, "你的 ECS、EKS、SageMaker AI 免疫高危 CVE"), tls: _t(388, "免疫证书过期"),
  priv: _t(389, "实例放进私有子网（要开 NAT 网关，多交钱）"), bastion: _t(390, "配合私有子网，不开 22 端口，免疫 SSH 暴力破解"),
  retry: _t(391, "免疫「依赖的第三方 API 挂了」"), dataprot: _t(392, "免疫「S3 桶被设成了公开」"), ddos: _t(393, "免疫「接口被恶意刷爆」（安全攻防 DLC）"), audit: _t(394, "免疫「安全审计没过」"),
  spof: _t(395, "免疫「单点故障」（还是单 AZ，挡不住 AZ 断电）"), boost: _t(396, "这块过路费再 +20%"), ssh: _t(397, "这块不会被「暴露在公网的实例被 SSH 暴力破解」打中（别的实例照样会被打）"), nat: _t(398, "NAT Gateway 账单格减半"),
}), v => { EFF_N = v; }, () => EFF_N);
// 按级别直接判、不靠升级效果码的免疫，显示升级效果时补在最前面（各级一览、落地升级按钮、图鉴、规则书、打印的服务卡都用 effLabel）。
// 对应 immuneByProp case 1、INC #23/#31/#32/#34/#37 的 imm 和 incident case 17，改那些判定时同步改这里
let UPG_EXTRA = __rv(() => ({ elb: { 3: _t(399, "你的 EC2 免疫「EC2 实例硬件退役」和「单点故障」（坏实例自动换掉）") }, eventbridge: { 1: _t(400, "你的 EC2 每圈运行费减半；免疫「测试环境忘了删」（FinOps 账单 DLC）"), 2: _t(401, "免疫「EC2 实例硬件退役」") }, lambda: { 1: _t(402, "免疫「服务配额用完了」") }, cloudwatch: { 2: _t(402, "免疫「服务配额用完了」") }, apigw: { 1: _t(393, "免疫「接口被恶意刷爆」（安全攻防 DLC）") }, route53: { 1: _t(403, "免疫「DNS 解析配错了」") }, sagemaker: { 2: _t(404, "免疫「GPU 容量不够用」（GenAI 浪潮 DLC）") }, cognito: { 1: _t(405, "免疫「用户账号被撞库」（光有密码登不进去）") }, config: { 2: _t(406, "免疫「有人手动改了生产配置」") }, ec2: { 2: _t(401, "免疫「EC2 实例硬件退役」") } }), v => { UPG_EXTRA = v; }, () => UPG_EXTRA);
// 第 l 级升级在游戏里管什么（空串 = 只是过路费提高）。「流量暴增」只打实例型服务，Lambda、API Gateway 这类升了弹性扩展只算性能效率支柱的分；
// 同一块服务前面某一级已经有同样效果的（第二个「过路费再 +20%」只乘一次、CloudTrail 第 3 级的审计），不叠加，按过路费提高写
// 一级可以带几个效果，写成 'maz+scale'（EC2 跨 AZ Auto Scaling：既多 AZ 又能扩缩）。比对效果码一律用 effIn
export const effIn = (code, e) => code === e || (typeof code === 'string' && code.includes('+') && code.split('+').includes(e));
export function effLabel(i, l) {
  const s = SQ[i], e = s.upg[l - 1][2], ex = (UPG_EXTRA[s.k] || {})[l];
  const one = x => s.upg.slice(0, l - 1).some(u => effIn(u[2], x)) ? '' : x === 'scale' && !isInst(i) ? _t(407, "性能效率支柱 +1 分") : EFF_N[x];
  const t = !e ? '' : String(e).split('+').map(one).filter(Boolean).join(_t(408, "；"));
  return [ex, t].filter(Boolean).join(_t(408, "；"));
}
// 按 token 计费：过路费 = 点数 × 单价。按平均 7 点算，未升级和同价位的固定价服务差不多，升满约六成（集齐 AI 组时每一级都 × 1.5，
// 它不交运行费，收到过路费要交 25% token 成本）。早先是 [4, 8, 14, 20]，后来 [8, 24, 48, 80]：模拟里算上升级花的钱，
// 后者在不限轮数的局里要 28 轮才回本，是全盘最慢的（其他服务中位 16 轮）；翻倍后 17 轮
export const TOKEN = [16, 48, 96, 160];
// 一局最多打多少轮（学习模式不限轮数，慢慢答题）：模拟里 4 人局中位约 35 轮能打出胜负，再长就拖沓了
export const MAX_ROUNDS = 50;
// 地狱模式必须答题：答对过路费只减 30%（全答对时对局中位 28 轮；减半的话 32 轮，最早测时要拖到 38 轮）
// 地狱模式的代理商：7 折进货、自己的地正常收过路费（不再只靠架构），所以架构不翻倍、起始资金也不按客户总和算

