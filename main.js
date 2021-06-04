const RANK = ['이병', '일병', '상병', '병장', '민간인'];

let users= [];
let userNum = 0;

function addUser(name, startDate, endDate) {
    let user = {};
    user.name = name;
    user.startDate = startDate;
    user.endDate = endDate;

    let rankDate = [];
    let tempDate = new Date(startDate);

    for (let i of [0, 2, 6, 6, 7]) {
        tempDate.setMonth(tempDate.getMonth() + i);
        rankDate.push(new Date(tempDate));
    }

    tempDate = new Date(startDate);
    user.salary = 1;
    user.rankIndex = 1;
    let lastSalaryDate;

    for (let i = 0; i < 21; i++) {
        tempDate.setMonth(tempDate.getMonth() + 1);

        if (tempDate > Date.now()) {
            tempDate.setMonth(tempDate.getMonth() - 1);
            user.rankIndex--;
            
            lastSalaryDate = new Date(tempDate);
            break;
        }

        user.salary++;

        if (tempDate >= rankDate[user.rankIndex]) {
            user.salary = 1;
            user.rankIndex++;
        }
    }

    user.mainProgress = ((Date.now() - startDate) / (endDate - startDate)) * 100;

    let nextSalaryDate = new Date(lastSalaryDate);
    nextSalaryDate.setMonth(nextSalaryDate.getMonth() + 1);
    user.salaryProgress = ((Date.now() - lastSalaryDate) / (nextSalaryDate - lastSalaryDate)) * 100;

    let nextRankDate = user.rankIndex >= 3 ? endDate : rankDate[user.rankIndex + 1];
    user.rankProgress = ((Date.now() - rankDate[user.rankIndex]) / (nextRankDate - rankDate[user.rankIndex])) * 100;


    users[userNum] = user;
}

addUser('군돌이', new Date(2020, 3 - 1, 9), new Date(2021, 12 - 1, 8));
userNum++;

console.log(users[0]);