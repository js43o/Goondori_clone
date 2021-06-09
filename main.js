const RANK = ['이병', '일병', '상병', '병장', '민간인'];
const MS_TO_DATE = 86400000;

const PERIODS = {
    army: [0, 2, 6, 6, 4],
    navy: [0, 2, 6, 6, 5],
    airforce: [0, 2, 6, 6, 7],
};

let users= [];
let userNumber = 0;
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

const addDate = (date, y, m, d) => {
    let res = new Date(date);
    res.setFullYear(res.getFullYear() + y);
    res.setMonth(res.getMonth() + m);
    res.setDate(res.getDate() + d);
    return res;
}

function addUser(name, startDate, endDate, imgSrc, kind) {

    let user = {};

    // Default values
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate ? endDate : addDate(user.startDate, 0, sum(PERIODS[kind]), -1);
    user.imgSrc = imgSrc;
    user.kind = kind;
    user.period = PERIODS[kind];

    document.querySelector('.image img').src = user.imgSrc;

    user.rankDate = [];

    let tempDate = new Date(startDate);

    for (let i of user.period) {
        tempDate.setMonth(tempDate.getMonth() + i);
        user.rankDate.push(new Date(tempDate));
    }

    tempDate = new Date(startDate);

    user.salary = 1;
    user.rankIndex = 1;
    user.lastSalaryDate;

    while (true) {
        tempDate.setMonth(tempDate.getMonth() + 1);

        if (tempDate > Date.now()) {
            tempDate.setMonth(tempDate.getMonth() - 1);
            user.rankIndex--;
            
            user.lastSalaryDate = new Date(tempDate);
            break;
        }

        user.salary++;

        // 해당 계급의 최대 호봉을 초과했을 때
        if (tempDate >= user.rankDate[user.rankIndex]) {
            user.salary = 1;
            user.rankIndex++;
        }
    }

    user.nextSalaryDate = new Date(user.lastSalaryDate);
    user.nextSalaryDate.setMonth(user.lastSalaryDate.getMonth() + 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updatePrgoress(user);

    users[userNumber++] = user;
}

function updatePrgoress(user) {
    user.updatingProgressId = setInterval(() => {
        user.mainProgress = Math.min(((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100, 100);
        user.salaryProgress = Math.min(((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100, 100);
        user.rankProgress = Math.min(((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100, 100);
    }, 100);
}

function showUser(user, page) {

    // Main values

    for (let i of page.querySelectorAll('.name')) {
        i.textContent = user.name;
    }

    for (let i of page.querySelectorAll('.rank')) {
        i.textContent = RANK[user.rankIndex];
    }

    let rankMark = page.querySelector('.level .fas');
    if (user.rankIndex == 0) rankMark.classList.add('fa-minus');
    else if (user.rankIndex == 1) rankMark.classList.add('fa-equals');
    else if (user.rankIndex == 2) rankMark.classList.add('fa-bars');
    else if (user.rankIndex == 3) rankMark.classList.add('fa-align-justify');
    else rankMark.classList.add('fa-grin-squint');

    for (let i of page.querySelectorAll('.salary')) {
        i.textContent = user.salary;
    }
    
    for (let i of page.querySelectorAll('.start-date')) {
        let d = user.startDate;
        i.textContent = `${d.getFullYear()}.${d.getMonth() > 8 ? d.getMonth() + 1 :
            '0' + (d.getMonth() + 1)}.${d.getDate() > 9 ? d.getDate() : '0' + d.getDate()}`;
    }

    for (let i of page.querySelectorAll('.end-date')) {
        let d = user.endDate;
        i.textContent = `${d.getFullYear()}.${d.getMonth() > 8 ? d.getMonth() + 1 :
            '0' + (d.getMonth() + 1)}.${d.getDate() > 9 ? d.getDate() : '0' + d.getDate()}`;
    }

    // Progress values
    
    for (let i of page.querySelectorAll('.next-salary-date')) {
        let d = user.nextSalaryDate;
        i.textContent = `${d.getFullYear()}.${d.getMonth() > 8 ? d.getMonth() + 1 :
            '0' + (d.getMonth() + 1)}.${d.getDate() > 9 ? d.getDate() : '0' + d.getDate()}`;
    }

    for (let i of page.querySelectorAll('.next-salary')) {
        let nextRankIndex = user.rankIndex;
        let nextSalary = user.salary + 1;

        switch(nextRankIndex) {
            case 0:
                if (nextSalary > 2) {
                    nextRankIndex++;
                    nextSalary = 1;
                }
                break;
            case 1:
            case 2:
                if (nextSalary >= 6) {
                    nextRankIndex++;
                    nextSalary = 1;
                }
                break;
            case 3:
                if (nextSalary >= user.period[-1]) {
                    nextRankIndex++;
                    nextSalary = 1;
                }
        }

        i.textContent = `${RANK[nextRankIndex]} ${nextSalary}호봉`
    }

    for (let i of page.querySelectorAll('.next-rank-date')) {
        let d = user.nextRankDate;
        i.textContent = `${d.getFullYear()}.${d.getMonth() > 8 ? d.getMonth() + 1 :
            '0' + (d.getMonth() + 1)}.${d.getDate() > 9 ? d.getDate() : '0' + d.getDate()}`;
    }
    
    for (let i of page.querySelectorAll('.next-rank')) {
        i.textContent = user.rankIndex >= 4 ? RANK[user.rankIndex] : RANK[user.rankIndex + 1];
    }

    parseProgress(page, user);

    // Days values

    page.querySelector('.full-day').textContent = Math.ceil((user.endDate - user.startDate) / MS_TO_DATE) + 1;

    page.querySelector('.current-day').textContent = Math.ceil((new Date() - user.startDate) / MS_TO_DATE);

    for (let i of page.querySelectorAll('.remaining-day')) {
        i.textContent = +page.querySelector('.full-day').textContent - +page.querySelector('.current-day').textContent;
    }

    page.querySelector('.next-rank-day').textContent = Math.ceil((user.nextRankDate - new Date()) / MS_TO_DATE);
}

function parseProgress(page, user) {
    user.parsingProgressId = setInterval(() => {
        let bars = page.querySelectorAll('.bar_filled');
        let percents = page.querySelectorAll('.percent');

        const _left = elem => elem.getBoundingClientRect().left;
        const _width = elem => elem.getBoundingClientRect().width;

        // Main percent
        bars[0].style.width = `${user.mainProgress}%`;
        percents[0].textContent = `${user.mainProgress.toFixed(7)}%`;
        percents[0].style.left = `${user.mainProgress}%`;
        
        // Salary percent
        bars[1].style.width = `${user.salaryProgress}%`;
        percents[1].textContent = `${user.salaryProgress.toFixed(5)}%`;
        percents[1].style.left = `${user.salaryProgress}%`;

        // Rank percent
        bars[2].style.width = `${user.rankProgress}%`;
        percents[2].textContent = `${user.rankProgress.toFixed(5)}%`;
        percents[2].style.left = `${user.rankProgress}%`;

    }, 100);
}

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

addUser('군돌이', new Date(2020, 2, 9), new Date(2021, 11, 9), 'kiwi.jpeg', 'army');
showUser(users[0], document.querySelector('#user1'));