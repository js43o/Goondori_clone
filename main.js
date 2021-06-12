const RANK = ['이병', '일병', '상병', '병장', '민간인', '?'];
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

    // main values
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate ? endDate : addDate(user.startDate, 0, sum(PERIODS[kind]), -1);
    document.querySelector('.profile_image img').src = imgSrc;
    user.period = PERIODS[kind];

    // rank-date
    user.rankDate = [ new Date(user.startDate) ];
    let acc = 0;

    for (let i of user.period.slice(0, -1)) {
        acc += i;
        user.rankDate.push(new Date(addDate(user.startDate, 0, acc)));
    }
    user.rankDate.push(new Date(user.endDate)); // endDate is less 1 day

    // current rank/salary
    user.salary = 0;
    user.rankIndex = 0;
    user.lastSalaryDate;
    let currentDate = new Date(startDate);

    while ((currentDate = addDate(currentDate, 0, 1)) < Date.now()) {
        // 해당 계급의 최대 호봉을 초과했을 때
        if (currentDate >= user.rankDate[user.rankIndex + 1]) {
            user.salary = 0;
            user.rankIndex++;
        }
        user.salary++;
    }
    user.lastSalaryDate = new Date(addDate(currentDate, 0, -1));

    // next-dates
    user.nextSalaryDate = user.rankIndex > 3 ? user.lastSalaryDate : addDate(user.lastSalaryDate, 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updatePrgoress(user);

    // add user
    users[userNum++] = user;
}


function updatePrgoress(user) {
    user.updatingProgressId = setInterval(() => {
        user.mainProgress = Math.min(100, ((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100);
        user.salaryProgress = Math.min(100, ((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100);
        user.rankProgress = Math.min(100, ((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100);
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
    parseValueToQuery(user.rankIndex > 3 ? '' : `${user.salary}호봉`, '.salary', page);
    parseValueToQuery(dateToString(user.startDate), '.start-date', page);
    parseValueToQuery(dateToString(user.endDate), '.end-date', page);
    page.querySelector('.level .fas').classList.add(RANK_MARK[user.rankIndex]);

    // progress values
    parseValueToQuery(user.rankIndex < 4 ? dateToString(user.nextRankDate) : '', '.next-rank-date', page);
    parseValueToQuery(user.rankIndex < 4 ? dateToString(user.nextSalaryDate) : '', '.next-salary-date', page);
    parseValueToQuery(user.rankIndex < 4 ? RANK[user.rankIndex] : '', '.next-rank', page);

    let nextRankIndex = user.rankIndex;
    let nextSalary = user.salary + 1;

    if (user.rankIndex < 4 && nextSalary > user.period[user.rankIndex]) {
        nextRankIndex = user.rankIndex + 1;
        nextSalary = 1;
    }
    page.querySelector('.next-salary').textContent = user.rankIndex < 4 ? `${RANK[nextRankIndex]} ${nextSalary}호봉` : '';

    parseProgressToPage(user, page);

    // days values
    let fullDay = Math.ceil((user.endDate - user.startDate) / MS_TO_DATE) + 1;
    parseValueToQuery(fullDay, '.full-day', page);
    parseValueToQuery(user.rankIndex < 4 ? Math.ceil((new Date() - user.startDate) / MS_TO_DATE) : fullDay, '.current-day', page);
    parseValueToQuery(fullDay - +page.querySelector('.current-day').textContent, '.remaining-day', page);
    parseValueToQuery(user.rankIndex < 4 ? Math.ceil((user.nextRankDate - new Date()) / MS_TO_DATE) : 0, '.next-rank-day', page);
}


function parseProgressToPage(user, page) {

    const getLeft = elem => elem.getBoundingClientRect().left;
    const getWidth = elem => elem.getBoundingClientRect().width;

    let bars = page.querySelectorAll('.bar_filled');
    let percents = page.querySelectorAll('.percent');

    user.parsingProgressId = setInterval(() => {

        const progresses = [user.mainProgress, user.salaryProgress, user.rankProgress];

        for (let i = 0; i < 3; i++) {
            bars[i].style.width = `${progresses[i]}%`;
            percents[i].textContent = `${progresses[i].toFixed(7)}%`;
            percents[i].style.left = `${progresses[i]}%`;
            if (getLeft(percents[i]) + getWidth(percents[i]) > getWidth(bars[i].parentElement))
                percents[i].style.left = Math.max(0, getWidth(bars[i].parentElement) - getWidth(percents[i])) + 'px';
        }
        
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