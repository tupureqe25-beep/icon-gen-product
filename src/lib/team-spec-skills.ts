export type TeamSpecOutputProfile = {
  platform: string;
  componentPrefix: string;
  logicalSize: number;
  masterSize: number;
  scale: number;
  color: string;
  strokeWidth: number;
  padding: number;
  liveArea: string;
  skillNames: string;
};

export type TeamSpecSkill = {
  id: "baijiahao" | "manju" | "assistant";
  name: string;
  desc: string;
  skillName: string;
  skillPath?: string;
  status: string;
  accent: string;
  outputProfile: TeamSpecOutputProfile;
};

export const teamSpecSkillRegistry = [
  {
    id: "baijiahao",
    name: "百家号 icon 组件库",
    desc: "内容平台场景，适合文章、章节、互动操作图标",
    skillName: "icon-gen-baijiahao",
    skillPath: "skills/icon-gen-baijiahao/SKILL.md",
    status: "已连接",
    accent: "from-blue-400/20 to-indigo-400/8",
    outputProfile: {
      platform: "baijiahao",
      componentPrefix: "BjhBasic",
      logicalSize: 24,
      masterSize: 48,
      scale: 2,
      color: "#242529",
      strokeWidth: 4,
      padding: 4,
      liveArea: "40×40",
      skillNames: "figma-use,icon-gen-baijiahao",
    },
  },
  {
    id: "manju",
    name: "漫剧平台 icon 组件库",
    desc: "阅读、播放、角色、剧情与互动场景语义库",
    skillName: "icon-gen-promax",
    skillPath: "skills/icon-gen-promax/SKILL.md",
    status: "已连接",
    accent: "from-sky-400/18 to-blue-500/8",
    outputProfile: {
      platform: "manju",
      componentPrefix: "AijBasic",
      logicalSize: 24,
      masterSize: 24,
      scale: 1,
      color: "#0F1218",
      strokeWidth: 2,
      padding: 2,
      liveArea: "20×20",
      skillNames: "icon-gen-promax",
    },
  },
  {
    id: "assistant",
    name: "AI 助手 icon 组件库",
    desc: "AI 工具、智能生成、对话与工作流图标规范",
    skillName: "待上传 skill",
    skillPath: undefined,
    status: "可上传",
    accent: "from-indigo-400/20 to-cyan-400/8",
    outputProfile: {
      platform: "ai-assistant",
      componentPrefix: "AijBasic",
      logicalSize: 24,
      masterSize: 24,
      scale: 1,
      color: "#0F1218",
      strokeWidth: 2,
      padding: 2,
      liveArea: "20×20",
      skillNames: "icon-gen-promax",
    },
  },
] as const satisfies readonly TeamSpecSkill[];

export type TeamSpecSkillId = (typeof teamSpecSkillRegistry)[number]["id"];

export function resolveTeamSpecSkill(id?: string) {
  return teamSpecSkillRegistry.find((skill) => skill.id === id) ?? teamSpecSkillRegistry[0];
}
