// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Max | Personal Website';
export const SITE_DESCRIPTION = 'Max\'s Blog';
export const TRANSITION_API = true;
export const contact = {
  github: 'https://github.com/swliu920322',
  linkin: 'https://www.linkedin.com/in/shengwei-liu/',
};

export const experiences = [
  {
    title: '前端开发（SCANIA 江苏南通如皋）2023.7 ~ 2024.1',
    biz: '去瑞典工厂培训 MES 业务，整理集团软件采购安全流程(ISEC)，负责软件采购方案调研。',
    tech: '',
  }, {
    title: '前端AM（埃森哲启云 辽宁大连）2021.9 ~ 2023.3',
    biz: '主导某 500 强企业数字化项目，负责移动App和微信同构、钉钉端架构升级。',
    tech: '核心技术栈 Vuejs、React、Uniapp、Ding。',
  }, {
    title: '前端架构师(上海翱盛 辽宁大连）2020.5 ~ 2022.9',
    biz: '主导多个企业管理系统研发，开发配置式组件，提升交付速度。',
    tech: '核心技术栈 Vue3、Vuejs、TS、Echarts、Flutter。',
  }, {
    title: '高级前端开发(深圳汇思诺 辽宁大连）2019.5 ~ 2020.2',
    biz: '主导企业 SASS 平台和小程序架构。',
    tech: '核心技术栈 Angular10+、Vuejs、Uniapp。',
  }, {
    title: '跨平台开发(江苏⻛云科技 江苏苏州）2017.5 ~ 2019.2',
    biz: '负责devops平台模块、某国企可视化网站和移动管理端，开发 Form、Table、Tree 组件。',
    tech: '核心技术栈 Angular 8、Vuejs、D3.js、Echarts、Cordova。',
  }, {
    title: '初级软件工程师(上海安硕 江苏苏州）2015.6 ~ 2017.4',
    biz: '参与银行 web 开发，主导移动端 RN 开发、负责 Redux 替换 Flux、推行 ES6 规范与代码审核。',
    tech: '核心技术栈 Angular.js、RN。',
  }, {
    title: 'JAVA工程师(浪潮通软 上海）2014.9 ~ 2015.5',
    biz: '参与浦发银行财资系统开发。',
    tech: '技术栈JAVA mybatis servlet。',
  },
];

export const myType = {
  medical: '中医',
  civilization: '国学',
  frontend: '前端',
  science: '科学',
};
export const myTypeArr = Object.entries(myType);
export const typeReverse = myTypeArr.reduce((r, c) => {
  const [key, val] = c;
  return { ...r, [val]: key };
}, {});