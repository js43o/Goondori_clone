const USER_PROTOTYPE_HTML = `
<div id="" class="page">
    <div class="profile">
        <div class="profile_image">
            <label>
                <img src="" alt="profile_image">
                <input name="change-image" type="file" accept="image/*">
            </label>
        </div>
        <div class="info">
            <span class="rank"></span> <span class="name" style="font-weight: bold"></span>
            <br>
            <br>입대<span style="color: var(--color-grey)">│</span><span class="start-date"></span>
            <br>전역<span style="color: var(--color-grey)">│</span><span class="end-date"></span>
        </div>
    </div>
    <div class="current" data-theme="side">
        <div class="home">
            <i class="fas fa-home"></i>
            D-<span class="remaining-day"></span>
        </div>
        <div class="level">
            <i></i>
            <span class="rank"></span> <span class="salary"></span>
        </div>
    </div>
    <div class="progress">
        <div class="progress_main" data-theme="main">
            <b>전역</b><span class="end-date-type" style="float: right"></span>
            <div class="bar">
                <div class="bar_filled"></div>
            </div>
            <span class="percent"></span>
        </div>
        <div class="progress_sub" data-theme="side">
            <div class="progress_salary">
                <small class="next-salary-date" style="float: right"></small>
                <br>
                <b>다음 호봉</b><span class="next-salary" style="float: right"></span>
                <div class="bar">
                    <div class="bar_filled"></div>
                </div>
                <span class="percent"></span>
            </div>
            <div class="progress_rank">
                <small class="next-rank-date" style="float: right"></small>
                <br>
                <b>다음 계급</b><span class="next-rank" style="float: right"></span>
                <div class="bar">
                    <div class="bar_filled"></div>
                </div>
                <span class="percent"></span>
            </div>
        </div>
    </div>
    <div class="days">
        <div><b>전체 복무일</b><span class="full-day" style="float: right"></span></div>
        <div><b>현재 복무일</b><span class="current-day"></span></div>
        <div><b>남은 복무일</b><span class="remaining-day"></span></div>
        <div><b>다음 진급일</b><span class="next-rank-day"></span></div>
    </div>
</div>
`;

const RANK = ['이병', '일병', '상병', '병장', '민간인'];
const RANK_MARK = ['fa-minus', 'fa-equals', 'fa-bars', 'fa-align-justify', 'fa-grin-squint'];
const MS_TO_DATE = 86400000;
const PERIODS = {
    army: [2, 6, 6, 4],
    navy: [2, 6, 6, 5],
    airforce: [2, 6, 6, 7],
};
const FILE_TYPES = [
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
let currentPagePos = 0;
let users = [];
let pages = [];

// prevent default events
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
    return FILE_TYPES.includes(file.type);
}


/* user & page setting functions */


function addUser(...info) {
    let user = {};
    setUser(user, ...info);

    users.push(user);

    return user;
}

function addPage(user) {
    let html = USER_PROTOTYPE_HTML;
    let id = users.indexOf(user);

    let main = document.querySelector('.main');
    main.insertAdjacentHTML('beforeend', html);

    let elems = main.querySelectorAll('.page')
    let page = elems[elems.length - 1]; // get the last page
    page.id = id;

    addProfileChangeListener(user, page);
    addDraggingListenerToPages();

    pages.push(page);

    return page;
}

function setUser(user, name, startDate, endDate, imgSrc, armyType, theme) {
    // main values
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate || addDate(user.startDate, 0, sum(PERIODS[armyType]), -1);
    user.armyType = armyType;
    user.period = PERIODS[armyType];
    user.imgSrc = imgSrc || user.imgSrc;
    user.theme = theme || user.theme;

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
    user.nextSalaryDate = user.rankIndex === 4 ? user.lastSalaryDate : addDate(user.lastSalaryDate, 0, 1);
    user.nextRankDate = user.rankIndex >= 3 ? user.endDate : user.rankDate[user.rankIndex + 1];

    updateProgress(user);

    user.fullDay = Math.ceil((user.endDate - user.startDate) / MS_TO_DATE) + 1;
    user.currentDay = user.rankIndex < 4 ? Math.ceil((new Date() - user.startDate) / MS_TO_DATE) : user.fullDay;
    user.remainingDay = user.fullDay - user.currentDay;
    user.nextRankDay = user.rankIndex < 4 ? Math.ceil((user.nextRankDate - new Date()) / MS_TO_DATE) : 0;
}


function updateProgress(user) {
    user.mainProgress = Math.min(100, ((Date.now() - user.startDate) / (user.endDate - user.startDate)) * 100);
    user.salaryProgress = Math.min(100, ((Date.now() - user.lastSalaryDate) / (user.nextSalaryDate - user.lastSalaryDate)) * 100);
    user.rankProgress = Math.min(100, ((Date.now() - user.rankDate[user.rankIndex]) / (user.nextRankDate - user.rankDate[user.rankIndex])) * 100);

    return [user.mainProgress, user.salaryProgress, user.rankProgress];
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
        `${RANK[nextRankIndex]} ${(nextRankIndex === 4 && nextSalary === 1) ? '' : nextSalary + '호봉'}` : '';

    parseProgressToPage(user, page);

    // days values
    parseValueToQuery(user.fullDay, '.full-day', page);
    parseValueToQuery(user.currentDay, '.current-day', page);
    parseValueToQuery(user.remainingDay, '.remaining-day', page);
    parseValueToQuery(user.nextRankDay, '.next-rank-day', page);

    // page theme setting
    let progressMain = page.querySelector('.progress_main');
    let current = page.querySelector('.current');
    let progressSub = page.querySelector('.progress_sub');

    switch (user.theme) {
        case 'kiwi':
            paintTheme(current, progressMain, progressSub,
                'var(--color-dark-green)', 'var(--color-yellow)', 'var(--color-green)', 'white', 'var(--color-light-green)');
            break;
        case 'gold':
            paintTheme(current, progressMain, progressSub,
                'var(--color-gold)', 'white', 'var(--color-dark-gold)', 'white', 'var(--color-light-gold)');
            break;
        default:
            paintTheme(current, progressMain, progressSub,
                'var(--color-brown)', 'var(--color-default-green)', 'var(--color-dark-brown)', 'var(--color-light-yellow)', 'var(--color-grey)');
            break;
    }
}

const paintTheme = (current, progressMain, progressSub, mainColor, mainBarColor, sideColor, sideBarColor, emptyBarColor) => {
    let progressSalary = progressSub.children[0];
    let progressRank = progressSub.children[1];

    current.style.backgroundColor = sideColor;
    current.querySelector('.fa-home').style.color = mainBarColor;

    progressMain.style.backgroundColor = mainColor;
    progressMain.querySelector('.percent').style.color = mainBarColor;
    progressMain.querySelector('.bar').style.backgroundColor = emptyBarColor;
    progressMain.querySelector('.bar_filled').style.backgroundColor = mainBarColor;

    progressSub.style.backgroundColor = sideColor;

    progressSalary.querySelector('.percent').style.color = sideBarColor;
    progressSalary.querySelector('.bar').style.backgroundColor = emptyBarColor;
    progressSalary.querySelector('.bar_filled').style.backgroundColor = sideBarColor;

    progressRank.querySelector('.percent').style.color = sideBarColor;
    progressRank.querySelector('.bar').style.backgroundColor = emptyBarColor;
    progressRank.querySelector('.bar_filled').style.backgroundColor = sideBarColor;
}

function parseProgressToPage(user, page) {

    const getLeft = elem => elem.getBoundingClientRect().left;
    const getWidth = elem => elem.getBoundingClientRect().width;

    let bars = page.querySelectorAll('.bar_filled');
    let percents = page.querySelectorAll('.percent');

    user.progressTimer = setInterval(() => {

        const progresses = updateProgress(user);

        for (let i = 0; i < 3; i++) {
            bars[i].style.width = `${progresses[i]}%`;
            percents[i].textContent = `${progresses[i].toFixed(i === 0 ? 7 : 5)}%`;
            percents[i].style.left = `${progresses[i]}%`;
            if (getLeft(percents[i]) + getWidth(percents[i]) > getLeft(bars[i].parentElement) + getWidth(bars[i].parentElement))
                percents[i].style.left = getWidth(bars[i].parentElement) - getWidth(percents[i]) + 'px';
        }

    }, 50);

}


/* event & form functions */


const addDraggingListenerToPages = () => {
    let main = document.querySelector('.main');
    
    main.onpointerdown = event => {
        main.classList.add('grabbed');

        let originX = event.clientX;
        let shift;
        let pageWidth = document.documentElement.clientWidth;

        document.onpointermove = event => {
            if (!event.target.closest('.main')) return;

            shift = originX - event.clientX;
            main.style.left = `${currentPagePos - shift}px`;
        }

        document.onpointerup = () => {
            main.classList.remove('grabbed');

            if (shift >= 120 && currentIndex < pages.length - 1) {
                currentPagePos -= pageWidth;
                currentIndex++;

            } else if (shift <= -120 && currentIndex > 0) {
                currentPagePos += pageWidth;
                currentIndex--;
            }
            main.style.left = `${currentPagePos}px`;

            document.onpointermove = null;
            document.onpointerup = null;
        }
    }
}


// menu window open
let black = document.querySelector('.black');
let menuWindow = document.querySelector('.menu-window');
let menuOpener = document.querySelector('#menu-open');
let menuCloser = document.querySelector('#menu-close');

const openMenuWindow = () => {
    menuWindow.classList.add('active');
    black.classList.add('active');
}

const closeMenuWindow = () => {
    menuWindow.classList.remove('active');
    black.classList.remove('active');
}

const menuDraggingAction = event => {
    let originX = event.clientX;

    document.onpointermove = event => {
        if (!event.target.closest('.menu-window')) return;
        menuWindow.style.transform = `translate(${Math.min(event.clientX - originX, 0) + 'px'})`;
    }

    document.onpointerup = event => {
        // drageed to the left
        if (event.clientX < originX) closeMenuWindow();

        document.onpointermove = null;
        document.onpointerup = null;

        setTimeout(() => menuWindow.style.transform = '', 400);
    }
}

menuOpener.onpointerdown = () => {
    menuOpener.onpointerup = openMenuWindow;
}

menuWindow.onpointerdown = menuDraggingAction;

black.onpointerdown = closeMenuWindow;

menuCloser.onpointerdown = () => {
    menuCloser.onpointerup = closeMenuWindow;
}


// edit window open
let editWindow = document.querySelector('.edit-window');
let editOpener = document.querySelector('#edit-open');
let editCloser = document.querySelector('#edit-close');

const initializeForm = (user, form) => {
    form.name.value = user.name;
    form['start-date'].value = dateToString(user.startDate);
    form['start-date'].max = dateToString(new Date());
    form['army-type'].value = user.armyType;
    form['end-date'].value = dateToString(user.endDate);
}

const openEditWindow = () => {
    editWindow.classList.add('active');
}

const closeEditWindow = () => {
    editWindow.classList.remove('active');
}

const editOpenAction = () => {
    openEditWindow();

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

    // select page theme
    let checkedTheme;
    let checked = document.querySelector('.themes .checked');
    let themes = document.querySelectorAll('.themes table');
    const SHIFT = themes[0].getBoundingClientRect().left; // table margin

    for (let theme of themes) {
        if (theme.className === users[currentIndex].theme) {
            checked.style.left = theme.getBoundingClientRect().left - SHIFT + 'px';
        }
        theme.onpointerdown = () => {
            let pos = theme.getBoundingClientRect().left;
            checked.style.left = pos - SHIFT + 'px';
            checkedTheme = theme.className;
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
            form['army-type'].value,
            checkedTheme);

        parseUserToPage(users[currentIndex], pages[currentIndex]);

        form['upload-image'].value = null;
        closeEditWindow();

        updateUserList();
    }
}

const editCloseAction = () => {
    closeEditWindow();
    updateUserList();
}

editOpener.onpointerdown = () => {
    editOpener.onpointerup = editOpenAction;
}

editCloser.onpointerdown = () => {
    editCloser.onpointerup = editCloseAction;
}

// profile image event
const addProfileChangeListener = (user, page) => {
    let profile = page.querySelector('input[name="change-image"]');

    profile.onchange = () => {
        user.imgSrc = getFilePath(profile) || user.imgSrc;
        page.querySelector('.profile_image img').src = user.imgSrc;

        profile.value = null;
    }
}


// user-list open
let userListWindow = document.querySelector('.user-list');
let userListOpener = document.querySelector('#user-list-open');
let userListCloser = document.querySelector('#user-list-close');
let userListAdd = document.querySelector('#user-list-add');
let userListUl = userListWindow.querySelector('ul');

const openUserListWindow = () => {
    userListWindow.classList.add('active');
}

const closeUserListWindow = () => {
    userListWindow.classList.remove('active');
}

const loadUserList = users => {
    let fragment = new DocumentFragment();

    for (let user of users) {
        let li = document.createElement('li');
        li.innerHTML = `<div class="user-item"><div><i class="fas ${RANK_MARK[user.rankIndex]}"></i> ${user.name}</div>
        <div><i class="fas fa-home">${user.mainProgress.toFixed(0)}%</i> D-${user.remainingDay}</div></div>
        <div class="edit"><i class="fas fa-pencil-alt"></i></div>
        <div class="remove"><i class="fas fa-trash-alt"></i></div>`;

        li.style.width = document.documentElement.clientWidth + 120 + 'px';
        li.querySelector('.user-item').style.width = document.documentElement.clientWidth + 'px';

        fragment.append(li);
    }

    return fragment;
}

const updateUserList = () => {
    userListUl.innerHTML = '';
    userListUl.append(loadUserList(users));

    addDraggingListenerToUserList();
    addEditListenerToUserList();
}

const addDraggingListenerToUserList = () => {
    for (let li of userListUl.querySelectorAll('li')) {
        let userItem = li.querySelector('.user-item');
        userItem.onpointerdown = event => {
            li.classList.add('grabbed');

            let originX = event.clientX;
            let shift;

            document.onpointermove = event => {
                if (!event.target.closest('.user-item')) return;

                if (li.classList.contains('pushed')) {
                    shift = Math.min(Math.max(originX - event.clientX, -120), 0);
                    li.style.transform = `translate(${-120 - shift}px)`;
                } else {
                    shift = Math.max(Math.min(originX - event.clientX, 120), 0);
                    li.style.transform = `translate(${-shift}px)`;
                }
            }

            document.onpointerup = () => {
                li.classList.remove('grabbed');
                li.style.transform = '';

                if (li.classList.contains('pushed') && shift <= -20) {
                    li.classList.remove('pushed');
                } else if (!li.classList.contains('pushed') && shift >= 20) {
                    li.classList.add('pushed');
                }

                document.onpointermove = null;
                document.onpointerup = null;
            }
        }
    }
}

const addEditListenerToUserList = () => {
    Array.from(userListUl.querySelectorAll('li')).forEach((li, index) => {
        li.querySelector('.edit').onpointerdown = () => {
            currentIndex = index;
            editOpenAction();
        }
    });
}

const userListOpenAction = () => {
    if (userListWindow.classList.contains('active')) return;

    closeMenuWindow();

    openUserListWindow();

    updateUserList();
}

const userListCloseAction = () => {
    if (!userListWindow.classList.contains('active')) return;
    closeUserListWindow();
    setTimeout(() => userListUl.innerHTML = '', 200);
}

const userAddingAction = () => {
    let newUser = addUser('군돌이', new Date(dateToString(new Date())), null, 'images/kiwi.jpg', 'army');
    currentIndex = users.length - 1;

    editOpenAction();

    let newPage = addPage(newUser);

    parseUserToPage(newUser, newPage);
}

userListCloser.onpointerdown = () => {
    userListCloser.onpointerup = userListCloseAction;
}

userListOpener.onpointerdown = () => {
    userListOpener.onpointerup = userListOpenAction;
}

userListAdd.onpointerdown = () => {
    userListAdd.onpointerup = userAddingAction;
}


// initial execution
let defaultUser = addUser('군돌이', new Date(2020, 2, 9), null, 'images/kiwi.jpg', 'airforce');
let defaultPage = addPage(defaultUser);
parseUserToPage(defaultUser, defaultPage);

let user2 = addUser('조기전역', new Date(2020, 2, 9), new Date(2021, 8, 20), 'images/sushi.jpg', 'airforce', 'gold');
let page2 = addPage(user2);
parseUserToPage(user2, page2);

let user3 = addUser('군순이', new Date(2020, 7, 9), null, 'images/flower.jpg', 'army', 'kiwi');
let page3 = addPage(user3);
parseUserToPage(user3, page3);