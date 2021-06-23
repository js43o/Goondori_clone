const RANK = ['이병', '일병', '상병', '병장', '민간인'];
const RANK_MARK = ['fa-minus', 'fa-equals', 'fa-bars', 'fa-align-justify', 'fa-grin-squint'];
const MS_TO_DATE = 86400000;
const PERIODS = {
    army: [2, 6, 6, 4],
    navy: [2, 6, 6, 5],
    airforce: [2, 6, 6, 7],
};
const fileTypes = [
    "image/apng",
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/svg+xml",
    "image/tiff",
    "image/webp",
    "image/x-icon"
];

let currentIndex = 0;
let users = [];
let pages = [];

document.ondragstart = () => false;
document.onselectstart = () => false;
document.oncontextmenu = () => false;

/* utility functions */


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

const parseValueToQuery = (value, query, page) => {
    for (let i of page.querySelectorAll(query)) {
        i.textContent = value;
    }
}

const dateToString = (date, delm = '-') => {
    return `${date.getFullYear()}${delm}${date.getMonth() > 8 ? date.getMonth() + 1 :
        '0' + (date.getMonth() + 1)}${delm}${date.getDate() > 9 ? date.getDate() : '0' + date.getDate()}`;
}

// 기존의 date 객체를 받아서 변형없이 새로운 date 객체를 반환
const addDate = (date, y = 0, m = 0, d = 0) => {
    let res = new Date(date);

    res.setFullYear(res.getFullYear() + y);
    res.setMonth(res.getMonth() + m);
    res.setDate(res.getDate() + d);

    return res;
}

const getFilePath = input => {
    if (input.files.length === 0) return null;
    let file = input.files[0];
    if (validFileType(file)) return URL.createObjectURL(file);
    else return null;
}

const validFileType = file => {
    return fileTypes.includes(file.type);
}


/* user & page setting functions */


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
    user.endDate = endDate || addDate(user.startDate, 0, sum(PERIODS[armyType]), -1);
    user.armyType = armyType;
    user.period = PERIODS[armyType];
    user.imgSrc = imgSrc || user.imgSrc;

    // rank-date
    user.rankDate = [new Date(user.startDate)];
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

    if (user.endDate < new Date()) user.rankIndex = 4;

    // next-dates
    user.nextSalaryDate = user.rankIndex == 4 ? user.lastSalaryDate : addDate(user.lastSalaryDate, 0, 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updatePrgoress(user);

    user.fullDay = Math.ceil((user.endDate - user.startDate) / MS_TO_DATE) + 1;
    user.currentDay = user.rankIndex < 4 ? Math.ceil((new Date() - user.startDate) / MS_TO_DATE) : user.fullDay;
    user.remainingDay = user.fullDay - user.currentDay;
    user.nextRankDay = user.rankIndex < 4 ? Math.ceil((user.nextRankDate - new Date()) / MS_TO_DATE) : 0;

    console.table(user);
}


function updatePrgoress(user) {
    user.updatingProgressId = setInterval(() => {
        user.mainProgress = Math.min(100, ((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100);
        user.salaryProgress = Math.min(100, ((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100);
        user.rankProgress = Math.min(100, ((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100);
    }, 50);
}

function parseUserToPage(user, page) {

    // main values
    parseValueToQuery(user.name, '.name', page);
    parseValueToQuery(RANK[user.rankIndex], '.rank', page);
    parseValueToQuery(user.rankIndex > 3 ? '' : `${user.salary}호봉`, '.salary', page);
    parseValueToQuery(dateToString(user.startDate, '.'), '.start-date', page);
    parseValueToQuery(dateToString(user.endDate, '.'), '.end-date', page);
    page.querySelector('.level i').className = `fas ${RANK_MARK[user.rankIndex]}`;

    // profile image
    page.querySelector('.profile_image img').src = user.imgSrc;

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
    parseValueToQuery(user.fullDay, '.full-day', page);
    parseValueToQuery(user.currentDay, '.current-day', page);
    parseValueToQuery(user.remainingDay, '.remaining-day', page);
    parseValueToQuery(user.nextRankDay, '.next-rank-day', page);
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


/* event & form functions */


// menu event
let black = document.querySelector('.black');
let menu = document.querySelector('.menu');
let menuClose = document.querySelector('#menu-close');
let menuOpen = document.querySelector('#menu-open');
menuOpen.onpointerdown = () => {

    menuOpen.onpointerup = () => {
        menu.classList.add('active');
        black.classList.add('active');

        menuClose.onpointerdown = () => {
            menuClose.onpointerup = () => {
                menu.classList.remove('active');
                black.classList.remove('active');
            }
        }
    }
}

// edit window open
let editOpen = document.querySelector('#edit-open');
let editClose = document.querySelector('#edit-close');
let editWindow = document.querySelector('.edit-window');
editOpen.onpointerdown = () => {
    editOpen.onpointerup = () => {
        editWindow.classList.add('active');

        editClose.onpointerdown = () => {
            editClose.onpointerup = () => {
                editWindow.classList.remove('active');
            }
        }

        let form = document.forms['user-info'];

        initializeForm(users[currentIndex], form);

        // set end-date by army-type
        form['army-type'].onchange = event => {
            switch (form['army-type'].value) {
                case 'army':
                    form['end-date'].value = dateToString(
                        addDate(new Date(form['start-date'].value), 0, 18, -1));
                    break;
                case 'navy':
                    form['end-date'].value = dateToString(
                        addDate(new Date(form['start-date'].value), 0, 20, -1));
                    break;
                case 'airforce':
                    form['end-date'].value = dateToString(
                        addDate(new Date(form['start-date'].value), 0, 21, -1));
                    break;
            }
        }

        // submit action
        form.onsubmit = event => {
            event.preventDefault();

            if (form['start-date'].value > form['end-date'].value) {
                alert("시작일이 종료일보다 클 수 없습니다.");
                form['start-date'].focus();
                return false;
            }

            setUser(users[currentIndex], form.name.value,
                new Date(`${form['start-date'].value}`),
                new Date(`${form['end-date'].value}`),
                getFilePath(form['upload-image']),
                form['army-type'].value);

            parseUserToPage(users[currentIndex], pages[currentIndex]);

            editWindow.classList.remove('active');
        }
    }

}

// profile image event
let changing = document.querySelectorAll('input[name="change-image"]')[currentIndex];
changing.onchange = () => {
    users[currentIndex].imgSrc = getFilePath(changing) || users[currentIndex].imgSrc;
    pages[currentIndex].querySelector('.profile_image img').src = users[currentIndex].imgSrc;
}

// user-list open
let userListOpen = document.querySelector('#user-list-open');
let userListWindow = document.querySelector('.user-list');
let userListClose = document.querySelector('#user-list-close');
userListOpen.onpointerdown = () => {
    userListOpen.onpointerup = () => {
        userListWindow.classList.add('active');

        let ul = userListWindow.querySelector('ul');
        for (let user of users) {
            let li = document.createElement('li');
            li.innerHTML = `<div><i class="fas ${RANK_MARK[user.rankIndex]}"></i> ${user.name}</div>
            <div><i class="fas fa-home">${user.mainProgress.toFixed(0)}%</i> D-${user.remainingDay}</div>
            `;
            ul.append(li);
        }

        userListClose.onpointerdown = () => {
            userListClose.onpointerup = () => {
                ul.innerHTML = "";
                userListWindow.classList.remove('active');
            }
        }
    }
}

const initializeForm = (user, form) => {
    form.name.value = user.name;
    form['start-date'].value = dateToString(user.startDate);
    form['start-date'].max = dateToString(new Date());
    form['army-type'].value = user.armyType;
    form['end-date'].value = dateToString(user.endDate);
}


// initial execution
pages.push(document.querySelector('#user1'));
addUser('군돌이', new Date(2020, 2, 9), null, 'images/kiwi.jpg', 'airforce');
parseUserToPage(users[currentIndex], pages[currentIndex]);