// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Max | Personal Website';
export const SITE_DESCRIPTION = 'Max\'s Blog';
export const TRANSITION_API = true;
export const contact = {
  github: 'https://github.com/swliu920322',
  linkin: 'https://www.linkedin.com/in/shengwei-liu/',
};

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