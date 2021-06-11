const RANK = ['이병', '일병', '상병', '병장', '민간인'];
const RANK_MARK = ['fa-minus', 'fa-equals', 'fa-bars', 'fa-align-justify', 'fa-grin-squint'];
const MS_TO_DATE = 86400000;
const PERIODS = {
    army: [2, 6, 6, 4],
    navy: [2, 6, 6, 5],
    airforce: [2, 6, 6, 7],
};

let users = [];
let userNum = 0;
let currentPageIndex = 0;

const reduce = (f, acc, iter) => {
    if (!iter) {
        iter = acc[Symbol.iterator]();
        acc = iter.next().value;
    }

    for (const a of iter) {
        acc = f(acc, a);
    }

    return acc;
}

const sum = iter => reduce((a, b) => a + b, iter);

// 기존의 date 객체를 받아서 변형없이 새로운 date 객체를 반환
const addDate = (date, y = 0, m = 0, d = 0) => {
    let res = new Date(date);

    res.setFullYear(res.getFullYear() + y);
    res.setMonth(res.getMonth() + m);
    res.setDate(res.getDate() + d);

    return res;
}

function addUser(name, startDate, endDate, imgSrc, kind) {

    let user = {};

    // setting main values
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate ? endDate : addDate(user.startDate, 0, sum(PERIODS[kind]), -1);
    document.querySelector('.profile_image img').src = imgSrc;
    user.period = PERIODS[kind];

    // setting rank-date
    user.rankDate = [];
    let acc = 0;

    user.rankDate.push(new Date(startDate));
    for (let i of user.period) {
        acc += i;
        user.rankDate.push(new Date(addDate(startDate, 0, acc)));
    }

    // setting current rank/salary
    user.salary = 1;
    user.rankIndex = 1;
    user.lastSalaryDate;
    let currentDate = new Date(startDate);

    while ((currentDate = addDate(currentDate, 0, 1)) < Date.now()) {

        user.salary++;

        // 해당 계급의 최대 호봉을 초과했을 때
        if (currentDate >= user.rankDate[user.rankIndex]) {
            user.salary = 1;
            user.rankIndex++;
        }
    }
    currentDate = addDate(currentDate, 0, -1);
    user.rankIndex--;
    user.lastSalaryDate = new Date(currentDate);

    // setting next-dates
    user.nextSalaryDate = addDate(user.lastSalaryDate, 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updatePrgoress(user);

    // add user
    users[userNum++] = user;
}

function updatePrgoress(user) {
    user.updatingProgressId = setInterval(() => {
        user.mainProgress = Math.min(((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100, 100);
        user.salaryProgress = Math.min(((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100, 100);
        user.rankProgress = Math.min(((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100, 100);
    }, 100);
}


const parseValueToQuery = (value, query, elem) => {
    for (let i of elem.querySelectorAll(query)) {
        i.textContent = value;
    }
}

const dateToString = date => {
    return `${date.getFullYear()}.${date.getMonth() > 8 ? date.getMonth() + 1 :
        '0' + (date.getMonth() + 1)}.${date.getDate() > 9 ? date.getDate() : '0' + date.getDate()}`;
}

function parseUserToPage(user, page) {

    // main values
    parseValueToQuery(user.name, '.name', page);
    parseValueToQuery(RANK[user.rankIndex], '.rank', page);
    parseValueToQuery(user.salary, '.salary', page);
    parseValueToQuery(dateToString(user.startDate), '.start-date', page);
    parseValueToQuery(dateToString(user.endDate), '.end-date', page);
    page.querySelector('.level .fas').classList.add(RANK_MARK[user.rankIndex]);

    // progress values
    parseValueToQuery(dateToString(user.nextRankDate), '.next-rank-date', page);
    parseValueToQuery(dateToString(user.nextSalaryDate), '.next-salary-date', page);
    parseValueToQuery(RANK[Math.max(user.rankIndex + 1, 4)], '.next-rank', page);

    let nextRankIndex = user.rankIndex;
    let nextSalary = user.salary + 1;

    if (nextSalary > user.period[user.rankIndex]) {
        nextRankIndex = user.rankIndex + 1;
        nextSalary = 1;
    }

    page.querySelector('.next-salary').textContent = `${RANK[nextRankIndex]} ${nextSalary}호봉`

    parseProgressToPage(user, page);

    // days values
    parseValueToQuery(Math.ceil((user.endDate - user.startDate) / MS_TO_DATE) + 1, '.full-day', page);
    parseValueToQuery(Math.ceil((new Date() - user.startDate) / MS_TO_DATE), '.current-day', page);
    parseValueToQuery(+page.querySelector('.full-day').textContent - +page.querySelector('.current-day').textContent, '.remaining-day', page);
    parseValueToQuery(Math.ceil((user.nextRankDate - new Date()) / MS_TO_DATE), '.next-rank-day', page);
}

function parseProgressToPage(user, page) {
    user.parsingProgressId = setInterval(() => {
        let bars = page.querySelectorAll('.bar_filled');
        let percents = page.querySelectorAll('.percent');

        const _left = elem => elem.getBoundingClientRect().left;
        const _width = elem => elem.getBoundingClientRect().width;

        // main percent
        bars[0].style.width = `${user.mainProgress}%`;
        percents[0].textContent = `${user.mainProgress.toFixed(7)}%`;
        percents[0].style.left = `${user.mainProgress}%`;

        // salary percent
        bars[1].style.width = `${user.salaryProgress}%`;
        percents[1].textContent = `${user.salaryProgress.toFixed(5)}%`;
        percents[1].style.left = `${user.salaryProgress}%`;

        // rank percent
        bars[2].style.width = `${user.rankProgress}%`;
        percents[2].textContent = `${user.rankProgress.toFixed(5)}%`;
        percents[2].style.left = `${user.rankProgress}%`;

    }, 100);
}

// add buttons action
document.querySelector('#menu-open-button').onpointerdown = () => {
    document.querySelector('.menu').classList.add('active');
}

document.querySelector('#menu-close-button').onpointerdown = () => {
    document.querySelector('.menu').classList.remove('active');
}

document.querySelector('#edit-open-button').onpointerdown = () => {
    document.querySelector('.editWindow').classList.add('active');
}

document.querySelector('#edit-close-button').onpointerdown = () => {
    document.querySelector('.editWindow').classList.remove('active');
}


// Execution
addUser('군돌이', new Date(2020, 2, 9), null, 'kiwi.jpeg', 'airforce');
parseUserToPage(users[0], document.querySelector('#user1'));