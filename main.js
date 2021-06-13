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
let currentUser;
let currentPage = document.querySelector('#user1');

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

function addUser(...info) {
    let newUser = {};
    setUser(newUser, ...info);
    users.push(newUser);

    return newUser;
}

function setUser(user, name, startDate, endDate, imgSrc, armyType) {
    // main values
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate ? endDate : addDate(user.startDate, 0, sum(PERIODS[armyType]), -1);
    document.querySelector('.profile_image img').src = imgSrc;
    user.armyType = armyType;
    user.period = PERIODS[armyType];

    // rank-date
    user.rankDate = [ new Date(user.startDate) ];
    let acc = 0;

    for (let i of user.period.slice(0, -1)) {
        acc += i;
        user.rankDate.push(new Date(addDate(user.startDate, 0, acc)));
    }
    user.rankDate.push(new Date(user.endDate)); // endDate is less 1 day

    // current rank/salary
    user.salary = 1;
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
    user.nextSalaryDate = user.rankIndex == 4 ? user.lastSalaryDate : addDate(user.lastSalaryDate, 0, 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updatePrgoress(user);
}


function updatePrgoress(user) {
    user.updatingProgressId = setInterval(() => {
        user.mainProgress = Math.min(100, ((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100);
        user.salaryProgress = Math.min(100, ((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100);
        user.rankProgress = Math.min(100, ((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100);
    }, 50);
}


const parseValueToQuery = (value, query, page) => {
    for (let i of page.querySelectorAll(query)) {
        i.textContent = value;
    }
}

const dateToString = (date, delm) => {
    return `${date.getFullYear()}${delm}${date.getMonth() > 8 ? date.getMonth() + 1 :
        '0' + (date.getMonth() + 1)}${delm}${date.getDate() > 9 ? date.getDate() : '0' + date.getDate()}`;
}

function parseUserToPage(user, page) {

    // main values
    parseValueToQuery(user.name, '.name', page);
    parseValueToQuery(RANK[user.rankIndex], '.rank', page);
    parseValueToQuery(user.rankIndex > 3 ? '' : `${user.salary}호봉`, '.salary', page);
    parseValueToQuery(dateToString(user.startDate, '.'), '.start-date', page);
    parseValueToQuery(dateToString(user.endDate, '.'), '.end-date', page);
    page.querySelector('.level i').className = `fas ${RANK_MARK[user.rankIndex]}`;

    // progress values
    parseValueToQuery(user.rankIndex < 4 ? dateToString(user.nextRankDate, '.') : '', '.next-rank-date', page);
    parseValueToQuery(user.rankIndex < 4 ? dateToString(user.nextSalaryDate, '.') : '', '.next-salary-date', page);
    parseValueToQuery(user.rankIndex < 4 ? RANK[user.rankIndex + 1] : '', '.next-rank', page);

    let nextRankIndex = user.rankIndex;
    let nextSalary = user.salary + 1;

    if (user.rankIndex < 4 && nextSalary > user.period[user.rankIndex]) {
        nextRankIndex = user.rankIndex + 1;
        nextSalary = 1;
    }
    page.querySelector('.next-salary').textContent = user.rankIndex < 4 ?
        `${RANK[nextRankIndex]} ${(nextRankIndex == 4 && nextSalary == 1) ? '' : nextSalary + '호봉'}` : '';

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
            percents[i].textContent = `${progresses[i].toFixed(i == 0 ? 7 : 5)}%`;
            percents[i].style.left = `${progresses[i]}%`;
            if (getLeft(percents[i]) + getWidth(percents[i]) > getLeft(bars[i].parentElement) + getWidth(bars[i].parentElement))
                percents[i].style.left = getWidth(bars[i].parentElement) - getWidth(percents[i]) + 'px';
        }
        
    }, 50);
    
}

// add buttons action
document.querySelector('#menu-open-button').onpointerdown = () => {
    let menu = document.querySelector('.menu');
    menu.classList.add('active');

    menu.querySelector('#menu-close-button').onpointerdown = () => {
        menu.classList.remove('active');
    }
}

document.querySelector('#edit-open-button').onpointerdown = () => {
    let editWindow = document.querySelector('.edit-window');
    editWindow.classList.add('active');

    editWindow.querySelector('#edit-close-button').onpointerdown = () => {
        editWindow.classList.remove('active');
    }
    
    let form = document.forms['user-info'];
    initializeForm(form, currentUser);

    form.submit.onpointerdown = event => {
        setUser(currentUser, form.name.value,
            new Date(`${form['start-date'].value}`),
            new Date(`${form['end-date'].value}`),
        'kiwi.jpeg', form['army-type'].value);
        parseUserToPage(currentUser, currentPage);
        editWindow.querySelector('#edit-close-button').onpointerdown();
        this.onsubmit = () => false;
    }
}

const initializeForm = (form, user) => {
    form.name.value = user.name;
    form['start-date'].value = dateToString(user.startDate, '-');
    form['army-type'].value = user.armyType;
    form['end-date'].value = dateToString(user.endDate, '-');
}



// Execution
currentUser = addUser('군돌이', new Date(2020, 2, 9), null, 'kiwi.jpeg', 'airforce');
parseUserToPage(currentUser, currentPage);