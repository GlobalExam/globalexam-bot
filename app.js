const puppeteer = require('puppeteer');
const prompt = require('prompt');

(async () => {
    console.log("\n\
  ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗     ███████╗██╗  ██╗ █████╗ ███╗   ███╗      ██████╗  ██████╗ ████████╗\n\
 ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝╚██╗██╔╝██╔══██╗████╗ ████║      ██╔══██╗██╔═══██╗╚══██╔══╝\n\
 ██║  ███╗██║     ██║   ██║██████╔╝███████║██║     █████╗   ╚███╔╝ ███████║██╔████╔██║█████╗██████╔╝██║   ██║   ██║   \n\
 ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║     ██╔══╝   ██╔██╗ ██╔══██║██║╚██╔╝██║╚════╝██╔══██╗██║   ██║   ██║   \n\
 ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗███████╗██╔╝ ██╗██║  ██║██║ ╚═╝ ██║      ██████╔╝╚██████╔╝   ██║   \n\
  ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   \n\
                                              Made with ♥ by GlobalExam.                                              \n\
Type Control-C to stop application.\n")

    let browser = await puppeteer.launch({headless: false})
    let page = await browser.newPage()

    // set defaultTimeout to 5min in ms (60sec * 5min * 1000ms)
    await page.setDefaultTimeout(300000)
    await page.setViewport({width: 1920, height: 980, deviceScaleFactor: 0.5})

    await login()

    // if popup appear close it
    await findPopupAndClose()

    // click on continue
    await clickAndNavigate("a.button-solid-primary-large.min-w-36", true)

    let element = await findElementAndProcess()
    while (element) {
        try {
            await processElement(element)
            element = await findElementAndProcess()
        } catch (e){
            console.log("error:\n" + e)
            await page.screenshot({path: 'screen-' + new Date().getTime() + '.png'});
            await sleep(30)
            await page.goto("https://exam.global-exam.com/")
            break
        }
    }

    await browser.close()


    async function findElementAndProcess() {
        await waitInSec(3)
        // if is practice course
        if (null !== await page.$("p.text-size-20.text-center.leading-none.pt-8.pb-6")) {
            return "practice_course"
        }
        // if is media video
        else if (null != await page.$("video#video")) {
            return "video_media"
        }
        // if is terminated course
        else if (null !== await page.$("a.group.flex.items-center.mb-8 > span.text-white") && await page.evaluate(`document.querySelector("a.group.flex.items-center.mb-8 > span.text-white").innerText.includes("Retour à la liste")`)) {
            return "course_terminated";
        }
        // if is student sheet
        else if (null !== await page.$("div.ch-bg-selection.card.flex.flex-col.relative.overflow-hidden.my-14")) {
            return "student_sheet";
        }
        // if is course instruction
        else if (0 !== (await page.$x("//button[@type='button'][contains(.,'Démarrer')]")).length) {
            return "course_instructions"
        }
        // if is card with questions
        else if (0 !== (await page.$x("//div[contains(@class,'container h-full flex flex-col flex-1 py-6 lg:px-14 lg:pb-8 items-center')]")).length) {
            return "course_cards";
        }
        // if is split pane
        else if (null !== await page.$("div.container.h-full.flex.flex-col.flex-1.py-6.mt-10")) {
            return "course_split_pane";
        }
        // if is course selection
        else if (0 !== (await page.$x("//h1[contains(.,'Mon parcours actif')]")).length) {
            return "course_selection"
        } else {
            await page.screenshot({path: 'screen-' + new Date().getTime() + '.png'});
            return null
        }
    }

    async function processCourseSelection() {
        await waitInSec(10, 5);
        await page.evaluate(() =>
            [...document.querySelectorAll("button.flex.flex-col.items-center.group.col-span-4")].filter(e => !e.querySelector("svg") || e.querySelector("svg.fa-chevron-right")).filter(e => !e.querySelector("svg") || e.querySelector("svg.fa-chevron-right")).filter(course => course.querySelector("img").src.includes("skill-categories") && course.querySelector("span").className.includes("bgi-study-sheet") || !course.querySelector("img").src.includes("skill-categories"))[0].click()
        )

        // bypass network not idle when studysheet has read
        if (null === await page.$("div.ch-bg-selection.card.flex.flex-col.relative.overflow-hidden.my-14")) {
            await page.waitForNavigation({waitUntil: "networkidle0"})
        }
    }

    async function processVideoMedia() {
        await waitInSec(10)
        await clickAndNavigate("div.bg-black.bg-opacity-50", true)
    }

    async function processCourseInstructions() {
        await waitInSec(5);
        await clickAndNavigate("button.button-solid-primary-medium", false)
    }

    async function processCourseCards(secPerCard = 30.0, randSec = 20.0) {
        let sec
        let cards = await page.$$("div.px-4.pb-8.card.mb-4")

        // if stop are present to play audio
        if (null !== await page.$("div.wysiwyg.ch-bg-selection.text-neutral-80.break-words") && await page.evaluate(`document.querySelector("div.wysiwyg.ch-bg-selection.text-neutral-80.break-words").innerText.includes("seconds")`)) {
            let timeToWait = parseInt(await page.evaluate(`document.querySelector("p.text-size-12.text-neutral-80").querySelector("span").innerText`));
            await sleep(timeToWait)
            await waitInSec(0.5, 0)
        }

        // if play button are present
        if (null !== await page.$("svg.svg-inline--fa.fa-play.fa-w-14.fa-fw.fa-sm")) {
            await clickAndNavigate("svg.svg-inline--fa.fa-play.fa-w-14.fa-fw.fa-sm", false);
            let totalSec = await page.evaluate(`parseInt(document.querySelector("span.w-24.flex-shrink-0.text-size-14.text-center.whitespace-nowrap").innerText.split("/")[1].trim().split(":")[0] * 60) + parseInt(document.querySelector("span.w-24.flex-shrink-0.text-size-14.text-center.whitespace-nowrap").innerText.split("/")[1].trim().split(":")[1])`);
            sec = totalSec / cards.length;
        } else {
            sec = (secPerCard + getRandFloat(randSec));
        }
        // if stop sound button are present
        if (null !== await page.$("svg.svg-inline--fa.fa-volume-up.fa-w-18.fa-fw")) {
            await clickAndNavigate("svg.svg-inline--fa.fa-volume-up.fa-w-18.fa-fw", false);
        }

        for (let card of cards) {
            // scroll to question
            await waitInSec(sec * 0.2);
            await page.evaluate((card) => {
                card.querySelector("button.flex.items-center.leading-none").scrollIntoView({behavior: "smooth", block: "center", inline: "start"})
            }, card)

            // display answer
            await waitInSec(sec * 0.6);
            await page.evaluate((card) => {
                card.querySelector("button.flex.items-center.leading-none").click()
            }, card)

            // click on good answer
            await waitInSec(sec * 0.2);
            await page.evaluate((card) => {
                card.querySelector("label.flex.bg-success-05").click()
            }, card)
        }

        await waitInSec()
        // if button validate is present
        if (null !== await page.$("button.min-w-48.button-solid-primary-large")) {
            await clickAndNavigate("button.min-w-48.button-solid-primary-large", true);
        }
    }

    async function processCoursePanes(secPerPane = 30.0, randSec = 20.0) {
        let panes = await page.$$("div.px-4.pb-8.custom-scrollbar.h-full.overflow-auto");
        for (const pane of panes) {
            let sec = (secPerPane + getRandFloat(randSec))
            // display answer
            await waitInSec(sec * 0.6);
            await clickAndNavigate("button.button-outline-default-large.hidden.min-w-48.mr-6", false);

            // click on good answer
            await waitInSec(sec * 0.2);
            await page.evaluate((pane) => {
                pane.querySelector("label.flex.bg-success-05").click()
            }, pane)

            // click on next
            await waitInSec(sec * 0.2)
            if (null !== await page.$("button.min-w-48.button-solid-primary-large") && await page.evaluate(`document.querySelector("button.min-w-48.button-solid-primary-large").innerText == "Suivant"`)) {
                await clickAndNavigate("button.min-w-48.button-solid-primary-large", false);
            } else if (null !== await page.$("button.min-w-48.button-solid-primary-large") && (await page.evaluate(`document.querySelector("button.min-w-48.button-solid-primary-large").innerText == "Valider"`) || await page.evaluate(`document.querySelector("button.min-w-48.button-solid-primary-large").innerText == "Terminer"`))) {
                await clickAndNavigate("button.min-w-48.button-solid-primary-large", true);
            }
        }
    }

    async function processCourseTerminated() {
        await waitInSec(10, 5);
        await clickAndNavigate("a.group.flex.items-center.mb-8,span.text-white", true);
    }

    async function processStudentSheet(secPerSheet = 240.0, randSec = 120.0) {
        await scrollToDown(0, null, 0, (secPerSheet + getRandFloat(randSec)))
        // if button understand is present
        if (null !== await page.$("button.button-solid-primary-large")) {
            await clickAndNavigate("button.button-solid-primary-large", true)
        }
    }

    async function processElement(elementType) {
        if (elementType === "video_media") {
            console.log("processVideoMedia()");
            await processVideoMedia();
        } else if (elementType === "course_instructions") {
            console.log("processCourseInstructions()");
            await processCourseInstructions();
        } else if (elementType === "course_cards") {
            console.log("processCourseCards()");
            await processCourseCards();
        } else if (elementType === "course_split_pane") {
            console.log("processCoursePanes()");
            await processCoursePanes();
        } else if (elementType === "student_sheet") {
            console.log("processStudentSheet()");
            await processStudentSheet();
        } else if (elementType === "practice_course") {
            // console.log("processPracticeCourse()");
            // await processPracticeCourse();
        } else if (elementType === "course_selection") {
            await processCourseSelection()
        } else if (elementType === "course_terminated") {
            console.log("processCourseTerminated()");
            await processCourseTerminated();
        }
    }

    async function login() {
        const credentials = await new Promise((resolve, reject) => {
            prompt.get([{name: 'email', pattern: /^\S+@\S+$/, description: "Email"}, {name: 'password', hidden: true, replace: '*', description: "Password"}], (error, result) => {
                resolve(result);
            });
        });

        if (credentials.email.split('@')[1].includes("ynov")) {
            await page.goto("https://auth.global-exam.com/sso/cas/ynov/4604", {waitUntil: 'networkidle0'})
            await page.type('#username', credentials.email)
        } else {
            await page.goto("https://auth.global-exam.com/login", {waitUntil: 'networkidle0'})
            await page.type('#email', credentials.email)
        }

        await page.type('#password', credentials.password)
        await page.keyboard.press('Enter')
        await page.waitForNavigation()

        // get url to see if connection are working
        if (page.url() !== "https://exam.global-exam.com/") {
            console.log("Invalid credentials")
            await login()
        }
    }

    // UTILS FUNCTIONS
    async function waitInSec(sec = 0.0, rand = 1.0) {
        rand = getRandFloat(rand)
        sec = (sec + rand)
        await sleep(sec);
    }

    async function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time * 1000));
    }

    function getRandFloat(rand) {
        return parseFloat((Math.random() * rand).toFixed(3));
    }

    async function findPopupAndClose() {
        await clickAndNavigate("button.wisepops-close", false)
    }

    async function clickAndNavigate(selector, waitForNavigation) {
        await waitInSec(5)
        if (null !== await page.$(selector)) {
            if (waitForNavigation) {
                await page.click(selector, {delay: getRandFloat(0.100)})
                await page.waitForNavigation({waitUntil: "networkidle0"})
            } else {
                await page.click(selector, {delay: getRandFloat(0.100)})
                await page.waitForTimeout(1000)
            }
        }
    }

    async function scrollToDown(start, end, step, sec) {
        if (!end) {
            if (null !== await page.$("div.bg-black.bg-opacity-50")) {
                end = await page.evaluate(`document.querySelector("div.bg-black.bg-opacity-50").scrollHeight - document.documentElement.clientHeight`)
            } else {
                end = await page.evaluate(`document.body.scrollHeight - document.documentElement.clientHeight`)
            }
            if (null === sec) {
                sec = 60
            }
            step = end / sec
        }
        if (start <= end) {
            await waitInSec(1, 1)
            if (null !== await page.$("div.bg-black.bg-opacity-50")) {
                await page.evaluate(`document.querySelector("div.bg-black.bg-opacity-50").scrollTo(${start}, ${start + step})`)
            } else {
                await page.evaluate(`window.scrollTo(${start}, ${start + step})`)
            }
            await scrollToDown(start + step, end, step, sec)
        }
    }
})();