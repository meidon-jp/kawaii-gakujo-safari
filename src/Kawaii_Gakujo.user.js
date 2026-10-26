// ==UserScript==
// @name         Kawaii Gakujo (Safari Userscripts)
// @namespace    https://github.com/meidon-jp/kawaii-gakujo-safari
// @version      1.13.0
// @description  READMEを必ず読んでからご利用ください：https://github.com/meidon-jp/kawaii-gakujo-safari/blob/main/README.md
// @author       woody_1227
// @license      MIT
// @match        https://gakujo.shizuoka.ac.jp/*
// @match        https://idp.shizuoka.ac.jp/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @updateURL    https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/Kawaii_Gakujo.user.js
// @downloadURL  https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/Kawaii_Gakujo.user.js
// @icon         https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/icon.png
// ==/UserScript==

/*
 * 移植元: https://github.com/woody-1227/Comfortable-Gakujo
 * MIT License
 *
 * Copyright (c) 2026 woody-1227
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function () {
    'use strict';

    const version = "1.13.0";
    const updateURL = "https://raw.githubusercontent.com/meidon-jp/kawaii-gakujo-safari/main/src/Kawaii_Gakujo.user.js";

    function waitForSelector(selector, timeout = 10000) {
        const existing = document.querySelector(selector);
        if (existing) return Promise.resolve(existing);
        return new Promise((resolve, reject) => {
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (!el) return;
                observer.disconnect();
                clearTimeout(timer);
                resolve(el);
            });
            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: ${selector}`));
            }, timeout);
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });
    }

    function cachedHomeDeadline(now) {
        try {
            const deadlines = JSON.parse(sessionStorage.getItem("cg-home-deadlines"));
            if (Array.isArray(deadlines)) return deadlines.filter(value => Number.isFinite(value) && value > now)
                .reduce((nearest, value) => Math.min(nearest, value), Infinity);
        } catch (error) { console.debug("[CG] 前回の締め切りを読み込めませんでした", error); }
        return Infinity;
    }

    function cacheHomeDeadlines(texts) {
        // Keep only timestamps in this tab; current task data corrects them on every home visit.
        try {
            const value = JSON.stringify(texts.map(homeTaskDeadline).filter(Number.isFinite));
            if (sessionStorage.getItem("cg-home-deadlines") !== value) sessionStorage.setItem("cg-home-deadlines", value);
        } catch (error) { console.debug("[CG] 締め切りの一時保存を省略", error); }
    }

    function installEarlyAppearance() {
        // Keep SSO, login screens and embedded university pages unchanged.
        if (window.self !== window.top || location.hostname !== "gakujo.shizuoka.ac.jp") return;
        const apply = () => {
            if (!document.documentElement) return false;
            if (!document.getElementById("cg-early-appearance")) {
                const style = document.createElement("style");
                style.id = "cg-early-appearance";
                style.textContent = `
                    .cg-page-appearance { --cg-navigation-background: rgba(255, 255, 255, .58); }
                    .cg-page-appearance body { isolation: isolate; }
                    .cg-page-appearance .c-wrapper { isolation: isolate; background: transparent; }
                    .cg-page-appearance .c-footer,
                    .cg-page-appearance .c-footer-fixed,
                    .cg-page-appearance .c-footer-inner { background-color: transparent; }
                    .cg-page-appearance .c-header {
                        background-color: var(--cg-navigation-background);
                        border-bottom: 1px solid #ffffff80; box-shadow: 0 2px 18px #18253b0d;
                        -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
                    }
                    .cg-page-appearance .c-main-menu { background-color: transparent !important; }
                    .cg-page-appearance .c-main-menu-overlay { background-color: transparent; }
                    .cg-page-appearance .c-main-menu .c-gnav:not(#cg-sidebar) {
                        background: var(--cg-navigation-background) !important;
                        border-right: 1px solid #52617424;
                    }
                    /* Blurring the native scroll container clips its fixed-position flyout. */
                    .cg-page-appearance #cg-sidebar {
                        background: transparent !important;
                        border-right: none;
                    }
                    .cg-page-appearance #cg-sidebar a,
                    .cg-page-appearance body:not(.is-main-menu-open) .c-main-menu .c-main-menu-btn {
                        background-color: var(--cg-navigation-background) !important;
                        -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
                    }
                    .cg-page-appearance .c-main-menu .c-gnav-dropdown-content {
                        background-color: var(--cg-navigation-background) !important;
                    }
                    .cg-page-appearance .c-main-menu .c-gnav-children { box-shadow: none; }
                    .cg-page-appearance .c-main-menu .c-main-menu-btn { background-color: transparent; }
                    .cg-page-appearance .c-main-menu .c-gnav-link,
                    .cg-page-appearance .c-main-menu .c-gnav-children-link {
                        background-color: transparent !important; color: #253044; box-shadow: none;
                    }
                    .cg-page-appearance .c-main-menu .c-gnav-items,
                    .cg-page-appearance .c-main-menu .c-gnav-item,
                    .cg-page-appearance .c-main-menu .c-gnav-children,
                    .cg-page-appearance .c-main-menu .c-gnav-children-items,
                    .cg-page-appearance .c-main-menu .c-gnav-children-item { background-color: transparent !important; }
                    .cg-page-appearance .c-main-menu .c-gnav-link:not(.cg-gnav-link) { filter: brightness(0) opacity(.8); }
                    .cg-page-appearance #cg-sidebar a { color: #253044; border-color: #52617424; }
                    .cg-page-appearance #cg-sidebar i { color: inherit; }
                    .cg-page-appearance .c-main-menu .c-main-menu-btn img { filter: brightness(0) opacity(.8); }
                    .cg-page-appearance .c-main-menu .c-gnav-link:hover,
                    .cg-page-appearance .c-main-menu .c-gnav-link:focus-visible,
                    .cg-page-appearance .c-main-menu .c-gnav-children-link:hover,
                    .cg-page-appearance .c-main-menu .c-gnav-children-link:focus-visible { background-color: #52617414 !important; }
                    .cg-page-appearance #cg-sidebar a:hover,
                    .cg-page-appearance #cg-sidebar a:focus-visible { background-image: linear-gradient(#52617414, #52617414); }
                    #cg-page-background {
                        position: fixed; inset: 0; z-index: -1; pointer-events: none;
                        background-color: #eef1f4; background-position: center; background-size: cover; background-repeat: no-repeat;
                    }
                    #cg-page-background[data-cg-deadline-urgency="warning"] {
                        background-image: var(--cg-header-warning-image, repeating-linear-gradient(135deg, transparent 0 32px, rgba(255, 165, 0, .14) 32px 64px),
                            linear-gradient(110deg, #49251b, #a74819 55%, #351b1b)) !important;
                    }
                    #cg-page-background[data-cg-deadline-urgency="critical"] {
                        background-image: var(--cg-header-critical-image, repeating-linear-gradient(135deg, transparent 0 32px, rgba(255, 60, 60, .2) 32px 64px),
                            radial-gradient(ellipse at 60% 50%, #bb172c, #540b18 65%, #220910)) !important;
                    }
                    .cg-glass-content .c-container .c-box-shadow,
                    .cg-registration-page .stady-sec01-box > ul > li,
                    .cg-registration-page .stady-sec02-contents,
                    .cg-registration-page .modal-box {
                        background: rgba(255, 255, 255, .76); border: 1px solid #ffffff8c; border-radius: 18px;
                        box-shadow: 0 8px 32px #18253b12; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
                    }
                    .cg-glass-content .c-container .c-box-shadow .c-box-shadow {
                        background: transparent; border: 0; box-shadow: none;
                        -webkit-backdrop-filter: none; backdrop-filter: none;
                    }
                    .cg-glass-content .c-heading { color: #253044; }
                    .cg-glass-content .c-heading-container {
                        background-color: rgba(255, 255, 255, .24); color: #253044;
                        border-radius: 18px 18px 0 0; border-bottom: 1px solid #52617424;
                    }
                    .cg-glass-content .c-search-accordion-contents,
                    .cg-glass-content .select_wrapper { background-color: transparent; }
                    .cg-glass-content .c-container select,
                    .cg-glass-content .c-container input[type="text"],
                    .cg-glass-content .c-container input[type="search"],
                    .cg-glass-content .c-container input[type="date"],
                    .cg-glass-content .c-container input[type="number"],
                    .cg-glass-content .c-container textarea,
                    .cg-glass-content .c-btn-detail {
                        background-color: rgba(255, 255, 255, .9); border-color: #52617430; border-radius: 6px;
                    }
                    .cg-glass-content .c-btn-search-large,
                    .cg-glass-content .paginate_button.current { background-color: rgba(35, 41, 50, .8); border-radius: 6px; }
                    .cg-glass-content #dataTable01 th,
                    .cg-glass-content #hiddenTasksTable th,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table th {
                        background-color: rgba(255, 255, 255, .36); color: #34445b; border-color: #52617436;
                    }
                    .cg-glass-content #dataTable01 td,
                    .cg-glass-content #hiddenTasksTable td,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table td { background-color: transparent; border-color: #52617436; }
                    .cg-glass-content #dataTable01 tbody tr,
                    .cg-glass-content #hiddenTasksTable tbody tr,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table tbody tr { background-color: rgba(255, 255, 255, .12); }
                    .cg-glass-content #dataTable01 tbody tr:hover,
                    .cg-glass-content #hiddenTasksTable tbody tr:hover,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table tbody tr:hover { background-color: rgba(255, 255, 255, .3); }
                    /* is-unread also appears on read rows; only the portal's inline blue marks unread notices. */
                    .cg-notice-page #dataTable01 tbody tr[style*="background-color: rgb(218, 238, 243)"] { background-color: rgba(218, 238, 243, .55) !important; }
                    .cg-notice-page #dataTable01 tbody tr[style*="background-color: rgb(218, 238, 243)"]:hover { background-color: rgba(218, 238, 243, .7) !important; }
                    .cg-task-detail .question-heading-container,
                    .cg-notice-page .c-fixed-heading-container,
                    .cg-reference-page .c-fixed-heading-container {
                        background-color: rgba(255, 255, 255, .24); color: #253044;
                        border-radius: 18px 18px 0 0; border-color: #ffffff8c;
                    }
                    .cg-task-detail .status_box .text,
                    .cg-task-detail .deadline_box .days {
                        background-color: rgba(255, 255, 255, .5); border-radius: 6px;
                    }
                    .cg-task-detail .c-table-line th,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table-line th {
                        background-color: rgba(255, 255, 255, .24); color: #34445b;
                    }
                    .cg-task-detail .question-heading-h4,
                    .cg-task-detail .submission_place dt,
                    .cg-task-detail .question-summary dt,
                    .cg-task-detail .question-reference-data dt,
                    .cg-task-detail .table-question01 dt {
                        background-color: rgba(255, 255, 255, .24); color: #34445b; border-color: #52617436;
                    }
                    .cg-task-detail .question-heading-h4 { border-radius: 8px; }
                    .cg-task-detail .c-table-line th,
                    .cg-task-detail .c-table-line td,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table-line th,
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table-line td { border-color: #52617436; }
                    :is(.cg-reference-page, .cg-syllabus-page) .c-table-line td { background-color: transparent; }
                    .cg-syllabus-page .c-heading-h3 { color: #34445b; border-color: #52617436; }
                    .cg-syllabus-page .c-btn-search-large.c-btn-line {
                        background-color: rgba(255, 255, 255, .5); color: #34445b; border-color: #52617436;
                    }
                    /* The pre-search result form contains only hidden inputs; its border otherwise becomes a white line. */
                    .cg-syllabus-page .c-box-shadow:has(> form #TableForm_rowIndex):not(:has(.c-heading-container, .c-contents-body, table)) {
                        background: transparent; border: 0; box-shadow: none;
                        -webkit-backdrop-filter: none; backdrop-filter: none;
                    }
                    .cg-registration-page .stady-sec01-box > ul > li,
                    .cg-registration-page .stady-sec02-contents,
                    .cg-registration-page .modal-box {
                        box-sizing: border-box; background-color: rgba(255, 255, 255, .76) !important;
                    }
                    .cg-registration-page .stady-sec01 h3,
                    .cg-registration-page .ttl-area h3,
                    .cg-registration-page .lecture-ttl-area h3 { color: #34445b; }
                    .cg-registration-page .heading-ttl {
                        background-color: rgba(255, 255, 255, .24) !important; color: #253044;
                        border-radius: 18px 18px 0 0; border-color: #52617436;
                    }
                    .cg-registration-page :is(.unit-table, .schedule-table, .c-table, .c-table-line) :is(th, td) {
                        background-color: transparent !important; border-color: #52617436;
                    }
                    .cg-registration-page :is(.schedule-table, .c-table, .c-table-line) th,
                    .cg-registration-page .unit-table :is(.header, .header-unit, .sub-header) {
                        background-color: rgba(255, 255, 255, .36) !important; color: #34445b;
                    }
                    .cg-registration-page .schedule-table td,
                    .cg-registration-page .stady-lecture-list-item-nodata { background-color: rgba(255, 255, 255, .12) !important; }
                    .cg-registration-page .schedule-table li.modal-open,
                    .cg-registration-page .stady-lecture-list-item {
                        background-color: rgba(255, 255, 255, .4) !important; border-radius: 8px;
                        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .1);
                    }
                    .cg-registration-page .stady-sec01-box .right > p,
                    .cg-registration-page .c-half-btn { background-color: rgba(255, 255, 255, .5) !important; border-color: #52617436; }
                    .cg-task-detail .fileList .preview {
                        background-color: rgba(255, 255, 255, .36); border-radius: 8px;
                    }
                    .cg-task-detail .lcu-dropzone {
                        background-color: rgba(255, 255, 255, .55); border-color: #52617436; border-radius: 10px;
                    }
                    .cg-page-appearance .c-header-information-popup {
                        background: rgba(255, 255, 255, .76); border: 1px solid #ffffff8c; border-radius: 18px;
                        box-shadow: 0 8px 32px #18253b12; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
                    }
                    .cg-page-appearance .index-main-visual { min-height: 0; }
                    .cg-page-appearance .index-main-visual-bg { display: none; }
                    .cg-page-appearance .index-main-visual .sp_box {
                        display: flex; flex-direction: column; height: auto; gap: 16px; padding: 24px 0;
                    }
                    .cg-page-appearance .index-main-visual-top { height: auto; padding-top: 0; padding-bottom: 0; }
                    .cg-page-appearance .index-main-visual-notice {
                        position: relative; inset: auto; transform: none; width: 100%; margin: 0 auto; justify-content: center;
                    }
                    .cg-page-appearance .index-main-visual-notice-other { width: min(100%, 720px); }
                    .cg-page-appearance .index-main-visual-bottom {
                        position: static; height: auto; width: 100%; order: -1; background: transparent;
                    }
                    .cg-page-appearance .index-main-visual-bottom .c-contents > div {
                        position: static; display: flex; align-items: center;
                    }
                    .cg-page-appearance .index-main-visual-user-picture { display: none; }
                    .cg-page-appearance .index-main-visual-user-information {
                        position: static; margin: 0; padding: 12px 16px; border-radius: 8px; background: #fffffff2;
                    }
                    @media screen and (max-width: 560px) {
                        .cg-page-appearance .c-main-menu .c-main-menu-btn { background-color: var(--cg-navigation-background); }
                        .cg-page-appearance .index-main-visual .sp_box { padding: 16px 0; }
                    }
                `;
                try {
                    const properties = [];
                    for (const [state, key] of Object.entries(headerImageKeys)) {
                        const image = localStorage.getItem(key);
                        if (image) properties.push(`${state === "normal" ? "background-image" : `--cg-header-${state}-image`}: url(${JSON.stringify(image)});`);
                    }
                    if (properties.length) style.textContent += `
                        #cg-page-background:not([data-cg-background-ready]) { ${properties.join("\n")} }
                    `;
                } catch (error) { console.debug("[CG] 背景画像の先行読込を省略", error); }
                (document.head || document.documentElement).appendChild(style);
            }
            const wrapper = document.querySelector(".c-wrapper");
            if (!document.body || !wrapper || !document.querySelector(".c-header")) return false;
            document.documentElement.classList.add("cg-page-appearance");
            if (document.title === "課題・アンケートリスト") document.documentElement.classList.add("cg-task-list");
            const referencePage = document.title.includes("授業参考情報");
            const syllabusPage = document.title.includes("シラバス");
            const registrationPage = document.title === "履修登録";
            if (referencePage || syllabusPage || registrationPage || ["課題・アンケートリスト", "課題・アンケート提出", "課題・アンケート詳細", "連絡一覧", "連絡詳細"].includes(document.title)) {
                document.documentElement.classList.add("cg-glass-content");
            }
            if (referencePage) document.documentElement.classList.add("cg-reference-page");
            if (syllabusPage) document.documentElement.classList.add("cg-syllabus-page");
            if (registrationPage) document.documentElement.classList.add("cg-registration-page");
            if (["課題・アンケート提出", "課題・アンケート詳細"].includes(document.title)) document.documentElement.classList.add("cg-task-detail");
            if (["連絡一覧", "連絡詳細"].includes(document.title)) document.documentElement.classList.add("cg-notice-page");
            if (!document.getElementById("cg-page-background")) {
                const background = document.createElement("div");
                background.id = "cg-page-background";
                background.setAttribute("aria-hidden", "true");
                let warningDays = 3;
                try { warningDays = validHeaderWarningDays(localStorage.getItem("cg-header-warning-days")) ?? 3; }
                catch (error) { console.debug("[CG] 背景の警告日数を読み込めませんでした", error); }
                const now = Date.now();
                updateDeadlineBackground(background, cachedHomeDeadline(now) - now, warningDays);
                // Portal menu blur makes fixed descendants relative to the tall wrapper. Keep the layer outside it.
                document.body.appendChild(background);
            }
            return true;
        };
        if (apply()) return;
        const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
        observer.observe(document, { childList: true, subtree: true });
    }

    // Check existing content as well as future mutations.
    function observeUntilReady(check) {
        const observer = new MutationObserver(() => {
            if (check()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        if (check()) observer.disconnect();
    }

    let initializationStarted = false;
    async function initializeKawaiiGakujo() {
        if (initializationStarted) return;
        initializationStarted = true;
        try {
            sessionStorage.removeItem("cg_grade_nav");
            if (document.title === "ホーム画面（学生・保護者）") {
                await waitForSelector(".index-container");
                await waitForSelector(".index-main-visual-user-last-login");
                await waitForSelector(".index-main-visual-notice");
            }

            if (document.title === "課題・アンケートリスト") {
                await waitForSelector("#dataTable01");
            }

            console.log("[CG] page ready → start");

            startKawaiiGakujo();

        } catch (e) {
            console.warn("[CG] initialization failed:", e);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeKawaiiGakujo, { once: true });
    } else {
        setTimeout(initializeKawaiiGakujo, 0);
    }

    const setCookie = (name, value, days = 365) => {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
    };

    const getCookie = (name) => {
        return document.cookie
            .split("; ")
            .find(row => row.startsWith(name + "="))
            ?.split("=")[1];
    };

    const deleteCookie = (name) => {
        document.cookie = `${name}=; max-age=0; path=/`;
    };

    // Resolve only known form submissions; never execute scripts from fetched HTML.
    function pageSubmission(doc, baseURL, control) {
        const source = `${control?.getAttribute("onclick") || ""} ${control?.getAttribute("href") || ""}`;
        const match = source.match(/postSubmit\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
        if (!match && control?.matches("a[href]") && !/^(javascript:|#)/i.test(control.getAttribute("href"))) {
            const url = new URL(control.getAttribute("href"), baseURL);
            if (url.origin !== location.origin) throw new Error("学情以外への送信はできません。");
            return { url, data: new FormData(), method: "GET" };
        }
        const buttonMatch = source.match(/submitFormButton\(\s*\$\(this\)\s*,\s*['"]([^'"]+)['"]/);
        const formId = control?.getAttribute("formid") || control?.getAttribute("form");
        const form = match ? doc.getElementById(match[1]) : formId ? doc.getElementById(formId) : control?.closest("form");
        if (!form) throw new Error("送信フォームが見つかりません。");
        const action = match ? match[2] : buttonMatch ? buttonMatch[1] : control.getAttribute("formaction") || form.getAttribute("action");
        if (!action) throw new Error("送信先が見つかりません。");
        const url = new URL(action, baseURL);
        if (url.origin !== location.origin) throw new Error("学情以外への送信はできません。");
        const data = new FormData(form);
        if (!match && control.name) data.append(control.name, control.value);
        return { url, data, method: match || buttonMatch ? "POST" : (form.getAttribute("method") || "GET").toUpperCase() };
    }

    function explicitSubmission(doc, baseURL, formId, action) {
        const form = doc.getElementById(formId);
        if (!form) throw new Error("学情のフォームが見つかりません。");
        return { url: new URL(action, baseURL), data: new FormData(form), method: "POST" };
    }

    async function fetchPage(request) {
        const url = new URL(request.url);
        const options = { method: request.method, credentials: "same-origin", cache: "no-store" };
        const body = new URLSearchParams(request.data);
        if (request.method === "GET") {
            body.forEach((value, key) => url.searchParams.append(key, value));
        } else {
            options.body = body;
        }
        const response = await fetch(url, options);
        if (!response.ok || new URL(response.url).origin !== location.origin) {
            throw new Error("ページ取得に失敗しました。再ログインが必要な可能性があります。");
        }
        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        return { doc, url: new URL(doc.querySelector("base[href]")?.getAttribute("href") || response.url, response.url).href };
    }

    async function openCreditInfo(button) {
        if (button.dataset.cgBusy) return;
        button.dataset.cgBusy = "1";
        try {
            const dashboard = await fetchPage(explicitSubmission(document, location.href, "emptyForm", "SC_15005B00_01/init"));
            if (dashboard.doc.title !== "成績ダッシュボード") throw new Error("成績ダッシュボードを取得できませんでした。");
            const info = await fetchPage(pageSubmission(dashboard.doc, dashboard.url, Array.from(dashboard.doc.querySelectorAll(".c-btn-submit01")).find(control => control.textContent.trim() === "成績情報詳細")));
            if (info.doc.title !== "成績情報") throw new Error("成績情報を取得できませんでした。");
            const request = pageSubmission(info.doc, info.url, Array.from(info.doc.querySelectorAll(".c-btn-submit01")).find(control => control.textContent.trim() === "単位修得情報照会"));
            // Only the destination is displayed, using fresh fields from the fetched page.
            const form = document.createElement("form");
            form.method = request.method;
            form.action = request.url.href;
            form.hidden = true;
            for (const [name, value] of request.data) {
                if (typeof value !== "string") continue;
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                input.value = value;
                form.appendChild(input);
            }
            document.body.appendChild(form);
            HTMLFormElement.prototype.submit.call(form);
            form.remove();
        } catch (error) {
            console.warn("[CG] 単位情報取得失敗", error);
            alert("単位情報を取得できませんでした。成績メニューから開くか、再ログイン後にお試しください。");
        } finally {
            delete button.dataset.cgBusy;
        }
    }

    function gradeSnapshot(doc) {
        const table = doc.getElementById("02");
        if (!table || !table.querySelector('td[data-label="成績報告時期"]')) {
            throw new Error("成績明細の表を確認できませんでした。");
        }
        // Ignore sorting, pagination controls, and presentation-only whitespace.
        return Array.from(table.querySelectorAll("tbody tr"), row =>
            Array.from(row.querySelectorAll("td[data-label]"), cell =>
                [cell.getAttribute("data-label"), cell.textContent.replace(/\s+/g, " ").trim()]
            )
        ).filter(row => row.length).map(row => JSON.stringify(row)).sort();
    }

    let gradeCheckRunning = false;
    async function checkGradeUpdates() {
        if (gradeCheckRunning || getCookie("cg_grade_save_enabled") !== "1") return;
        gradeCheckRunning = true;
        try {
            let gradeDoc = document;
            if (document.title === "ホーム画面（学生・保護者）") {
                const dashboard = await fetchPage(explicitSubmission(document, location.href, "emptyForm", "SC_15005B00_01/init"));
                if (dashboard.doc.title !== "成績ダッシュボード") throw new Error("成績ダッシュボードを取得できませんでした。");
                const detail = Array.from(dashboard.doc.querySelectorAll(".c-btn-submit01")).find(control =>
                    control.textContent.trim() === "成績情報詳細");
                const info = await fetchPage(pageSubmission(dashboard.doc, dashboard.url, detail));
                if (!["成績情報", "成績情報詳細"].includes(info.doc.title)) throw new Error("成績情報を取得できませんでした。");
                gradeDoc = info.doc;
            } else if (!["成績情報", "成績情報詳細"].includes(document.title)) {
                return;
            }
            const hash = "detail-v1:" + await sha256(JSON.stringify(gradeSnapshot(gradeDoc)));
            if (getCookie("cg_grade_save_enabled") !== "1") return;
            const previous = decodeURIComponent(getCookie("cg_grade") || "");
            if (previous.startsWith("detail-v1:") && previous !== hash) setCookie("cg_grade_updated", "1");
            setCookie("cg_grade", hash);
            showUpdateNotice();
        } catch (error) {
            console.warn("[CG] 成績更新確認失敗（前回のデータを保持）", error);
        } finally {
            gradeCheckRunning = false;
        }
    }

    function showUpdateNotice() {
        if (getCookie("cg_grade_updated") !== "1") return (false);
        if (document.title !== "ホーム画面（学生・保護者）") return (false);
        if (document.getElementsByClassName("cg-grade-notice-container").length > 0) return (false);

        const indexContainer = document.getElementsByClassName("index-container")[0];
        const cContents = indexContainer?.getElementsByClassName("c-contents")[0];

        const notice = document.createElement("div");
        notice.className = "cg-grade-notice-container";
        notice.innerHTML = `<button class="cg-grade-notice-button c-main-menu-btn" onclick="showLoading();postSubmit('emptyForm', 'SC_15005B00_01/init')"><i class="c-icon-notice" aria-hidden="true" style="margin-right: 0.5em"></i>成績が更新されました</button>`;

        const style = document.createElement('style');
        style.textContent = `
                .cg-grade-notice-container {
                    margin-top: 10px;
                    margin-bottom: 40px;
                }

                .cg-grade-notice-button {
                    height: 5rem;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    margin: 0 auto;
                    padding: 1em 2em;
                    overflow: hidden;
                    border: none;
                    border-radius: 0.5rem;
                    color: #fff;
                    font-weight: 600;
                    font-size: 2.4rem;
                    cursor: pointer;
                }

                .cg-grade-notice-button::before {
                    display: block;
                    position: absolute;
                    top: -50%;
                    left: -30%;
                    transform: rotate(30deg);
                    width: 70px;
                    height: 100px;
                    content: '';
                    background-image: linear-gradient(left, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0) 100%);
                    background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0%, rgba(255, 255, 255, 0)), color-stop(50%, rgba(255, 255, 255, 1)), color-stop(100%, rgba(255, 255, 255, 0)));
                    animation: animation-cg-grade-notice-button 3s infinite linear;
                }

                @keyframes animation-cg-grade-notice-button {
                    17% {
                        left: 120%;
                    }
                    100% {
                        left: 120%;
                    }
                }

                .cg-grade-notice-button::after {
                    content: '';
                    transform: rotate(45deg);
                    width: 0.5em;
                    height: 0.5em;
                    margin-left: 0.5em;
                    border-top: 2px solid #fff;
                    border-right: 2px solid #fff;
                }
            `;

        if (!document.querySelector('style[data-cg-grade-notice]')) {
            style.setAttribute('data-cg-grade-notice', 'true');
            document.head.appendChild(style);
        }

        if (cContents) {
            cContents.insertBefore(notice, cContents.firstChild);
        }

        return (true);
    }

    async function sha256(text) {
        const uint8 = new TextEncoder().encode(text)
        const digest = await crypto.subtle.digest('SHA-256', uint8)
        return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('')
    }

    function formatTimeLeft(ms, precision = 0) {
        const d = Math.floor(ms / (1000 * 60 * 60 * 24));
        const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
        const m = Math.floor(ms / (1000 * 60)) % 60;
        const s = Math.floor(ms / 1000) % 60;
        const dayStr = d > 0 ? `${d}日 ` : '';
        const digits = precision === true ? 1 : precision === 2 ? 2 : 0;
        const fraction = digits ? `.${Math.floor((ms % 1000) / (10 ** (3 - digits))).toString().padStart(digits, '0')}` : '';
        const seconds = s.toString().padStart(2, '0') + fraction;
        return `残り ${dayStr}${h.toString().padStart(2, '0')}時間 ${m.toString().padStart(2, '0')}分 ${seconds}秒`;
    }

    function renderDeadlineCountdown(timer, remaining, precision = 0, warningDays = 3) {
        const expired = remaining <= 0;
        timer.textContent = expired ? "締切済み" : formatTimeLeft(remaining, precision);
        Object.assign(timer.style, {
            color: remaining < 86400000 ? "red" : remaining < warningDays * 86400000 ? "#FF8C00" : "",
            fontWeight: remaining < warningDays * 86400000 ? "bold" : "",
            textDecoration: !expired && remaining < 86400000 ? "underline" : ""
        });
    }

    function homeTaskDeadline(text) {
        const normalized = text.normalize("NFKC");
        const dates = Array.from(normalized.matchAll(/(\d{4})[年/.-](\d{1,2})[月/.-](\d{1,2})日?(?:\s*[（(][^）)]*[）)])?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/g));
        // A submission period contains both dates; its last date is the deadline.
        if (!dates.length) return NaN;
        const labelled = dates.find(match => /(?:締(?:め)?切(?:り)?(?:日時|日)?|提出期限)\s*[:：]?\s*$/.test(normalized.slice(0, match.index)));
        const [, year, month, day, hour, minute, second = "0"] = labelled || dates[dates.length - 1];
        if (+month < 1 || +month > 12 || +day < 1 || +day > 31 || +hour > 23 || +minute > 59 || +second > 59) return NaN;
        // University deadlines use Japan time, even if the browser uses another timezone.
        const value = Date.UTC(+year, +month - 1, +day, +hour - 9, +minute, +second);
        const local = new Date(value + 9 * 3600000);
        return local.getUTCMonth() === +month - 1 && local.getUTCDate() === +day ? value : NaN;
    }

    function nearestHomeDeadline(texts, now) {
        return texts.map(homeTaskDeadline).filter(deadline => Number.isFinite(deadline) && deadline > now)
            .reduce((nearest, deadline) => Math.min(nearest, deadline), Infinity);
    }

    function updateDeadlineBackground(visual, remaining, warningDays = 3) {
        if (!visual) return;
        const urgency = remaining > 0 && remaining < 86400000 ? "critical"
            : remaining > 0 && remaining < warningDays * 86400000 ? "warning" : "";
        // Override only the presentation; the user's saved image stays untouched.
        if (urgency) {
            if (visual.dataset.cgDeadlineUrgency !== urgency) visual.dataset.cgDeadlineUrgency = urgency;
        } else if (visual.dataset.cgDeadlineUrgency !== undefined) {
            delete visual.dataset.cgDeadlineUrgency;
        }
    }

    const headerImageKeys = {
        normal: "cg-header-image",
        warning: "cg-header-image-warning",
        critical: "cg-header-image-critical"
    };

    function validHeaderWarningDays(value) {
        const days = Number(value);
        return Number.isSafeInteger(days) && days >= 2 ? days : null;
    }

    function createHeaderBackgroundController(visual, storage) {
        const settings = { warningDays: 3, images: { normal: "", warning: "", critical: "" } };
        try {
            if (storage) {
                settings.warningDays = validHeaderWarningDays(storage.getItem("cg-header-warning-days")) ?? 3;
                for (const [state, key] of Object.entries(headerImageKeys)) {
                    settings.images[state] = storage.getItem(key) || "";
                }
            }
        } catch (error) {
            console.warn("[CG] 背景設定を読み込めませんでした", error);
        }
        const bg = visual;
        const defaultImage = bg?.style.backgroundImage || "";
        let remaining = Infinity;
        const applyImages = () => {
            if (bg) {
                bg.style.backgroundImage = settings.images.normal ? `url(${JSON.stringify(settings.images.normal)})` : defaultImage;
                bg.dataset.cgBackgroundReady = "1";
                for (const state of ["warning", "critical"]) {
                    const property = `--cg-header-${state}-image`;
                    if (settings.images[state]) bg.style.setProperty(property, `url(${JSON.stringify(settings.images[state])})`);
                    else bg.style.removeProperty(property);
                }
            }
        };
        const render = value => {
            remaining = value;
            updateDeadlineBackground(visual, remaining, settings.warningDays);
        };
        const requireStorage = () => {
            if (!storage) throw new Error("このブラウザでは背景設定を保存できません．");
        };
        applyImages();
        return {
            settings, render,
            setWarningDays(value) {
                const days = validHeaderWarningDays(value);
                if (days === null) throw new Error("日数は2以上の整数にしてください．");
                requireStorage();
                storage.setItem("cg-header-warning-days", String(days));
                settings.warningDays = days;
                render(remaining);
            },
            setImage(state, image) {
                if (!Object.hasOwn(headerImageKeys, state)) throw new Error("背景の種類が不正です．");
                requireStorage();
                // Keep the displayed image intact if a storage write fails.
                if (image) storage.setItem(headerImageKeys[state], image);
                else storage.removeItem(headerImageKeys[state]);
                settings.images[state] = image;
                applyImages();
            }
        };
    }

    function installHomeTaskCountdown(background = null, gradeNotice = null) {
        if (document.getElementById("cg-home-task-countdown")) return;
        const notice = document.createElement("li");
        notice.id = "cg-home-task-countdown";
        notice.className = "index-notice-other-item";
        const style = document.createElement("style");
        style.textContent = `
            .index-notice-other-items.cg-notice-with-countdown {
                display: grid;
                grid-template-columns: var(--cg-task-card-width, 1fr) var(--cg-grade-card-width, 1fr);
                grid-template-rows: auto auto;
                align-content: start;
                align-items: stretch;
                width: 100%;
                height: auto;
                margin: 0;
                gap: 10px;
            }
            .cg-notice-with-countdown > .index-notice-other-item {
                width: auto;
                max-width: none;
                min-width: 0;
                height: auto;
                min-height: 0;
                max-height: none;
                margin: 0;
                box-sizing: border-box;
            }
            .cg-notice-with-countdown > .index-notice-other-item > .index-main-visual-notice-box,
            .cg-notice-with-countdown > .index-notice-other-item > .cg-index-main-visual-notice-box {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: 100%;
                height: 100%;
                min-height: 100px;
                padding: 12px 20px;
                margin: 0;
                box-sizing: border-box;
            }
            .cg-notice-with-countdown .index-main-visual-notice-box > .title,
            .cg-notice-with-countdown .cg-index-main-visual-notice-box > .title {
                margin: 0;
            }
            .cg-notice-with-countdown .index-main-visual-notice-box > .content,
            .cg-notice-with-countdown .cg-index-main-visual-notice-box > .content {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                height: auto;
                margin: 0;
            }
            .cg-notice-with-countdown .count { margin: 0; }
            .cg-notice-with-countdown > #cg-home-task-countdown {
                grid-column: 1 / -1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 12px;
                border: 2px solid #a1a1a1;
                border-radius: 4px;
                box-shadow: 0 0 3px 0 rgba(57, 57, 57, .15);
                background: #fff;
                box-sizing: border-box;
                color: #333;
                font-size: 1.4rem;
                line-height: 1.5;
                text-align: center;
            }
            #cg-home-task-countdown .cg-deadline-heading {
                color: #666;
                font-size: 1.2rem;
            }
            #cg-home-task-countdown .cg-deadline-clock {
                max-width: 100%;
                font-variant-numeric: tabular-nums;
                font-size: clamp(1.4rem, 1.5vw, 1.8rem);
                overflow-wrap: anywhere;
            }
            @media screen and (max-width: 560px) {
                .cg-notice-with-countdown > #cg-home-task-countdown {
                    gap: 4px;
                    padding: 10px 8px;
                }
                #cg-home-task-countdown .cg-deadline-heading {
                    font-size: 14px;
                }
                #cg-home-task-countdown .cg-deadline-clock {
                    font-size: clamp(12px, 3.4vw, 16px);
                    line-height: 1.6;
                }
            }
            #cg-home-task-countdown[hidden] { display: none; }
        `;
        document.head.appendChild(style);
        const title = document.createElement("div");
        title.textContent = "最も近い締め切り";
        title.className = "cg-deadline-heading";
        const timer = document.createElement("div");
        timer.className = "cg-deadline-clock";
        notice.append(title, timer);
        notice.hidden = true;

        const updateBackground = remaining => background ? background.render(remaining)
            : updateDeadlineBackground(document.getElementById("cg-page-background"), remaining);
        const renderClock = remaining => {
            renderDeadlineCountdown(timer, remaining, 0, background?.settings.warningDays ?? 3);
            updateBackground(remaining);
        };
        let layoutPanel;
        let layoutItems = [];
        const sizePanel = panel => {
            const items = Array.from(panel.children).filter(item => item !== notice).slice(0, 2);
            // Let CSS distribute the current cards instead of carrying over their old pixel widths.
            panel.classList.add("cg-notice-with-countdown");
            layoutPanel = panel;
            layoutItems = items;
        };
        window.addEventListener("resize", () => {
            if (layoutPanel?.isConnected) sizePanel(layoutPanel);
        });

        const update = () => {
            const panel = document.querySelector(".index-notice-other-items");
            if (!panel) {
                notice.hidden = true;
                return;
            }
            // The portal can replace the notice markup after DOMContentLoaded.
            if (gradeNotice && !panel.querySelector("#cg-grade-save-toggle")) panel.appendChild(gradeNotice);
            const items = Array.from(panel.children).filter(item => item !== notice).slice(0, 2);
            if (layoutPanel !== panel || items.length !== layoutItems.length || items.some((item, index) => item !== layoutItems[index])) {
                sizePanel(panel);
            }
            if (notice.parentElement !== panel || panel.lastElementChild !== notice) panel.appendChild(notice);
            const list = document.querySelector(".submissionList");
            // The server sends an empty list with this spinner; AJAX replaces it with tasks or an empty-state message.
            // Keep the initial deadline background and cache until that response has arrived.
            if (!list || list.querySelector("#notSubmitReading")) {
                notice.hidden = true;
                return;
            }
            const texts = Array.from(list.querySelectorAll(".submissionList_item"))
                .filter(item => item.classList.contains("is-yet") || item.querySelector(".c-status-yet"))
                .map(item => item.querySelector(".deadline")?.textContent || "");
            cacheHomeDeadlines(texts);
            const now = Date.now();
            const deadline = nearestHomeDeadline(texts, now);
            notice.hidden = false;
            if (Number.isFinite(deadline)) {
                renderClock(deadline - now);
                timer.title = new Date(deadline).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            } else {
                updateBackground(Infinity);
                timer.textContent = "締切前の課題はありません";
                Object.assign(timer.style, { color: "", fontWeight: "", textDecoration: "" });
                timer.removeAttribute("title");
            }
        };
        update();
        // Refresh task information and the countdown once a second.
        setInterval(update, 1000);
    }

    function formatClassPeriod(period) {
        const normalized = period.normalize("NFKC");
        const numbers = normalized.match(/\d+/g)?.map(Number);
        if (!numbers?.length || numbers.some(number => number < 1)) return period;
        const periods = numbers.length === 2 && /[～〜~−-]/.test(normalized) && numbers[1] >= numbers[0]
            ? Array.from({ length: numbers[1] - numbers[0] + 1 }, (_, index) => numbers[0] + index)
            : numbers;
        const classes = Array.from(new Set(periods.map(number => Math.ceil(number / 2))));
        return `${classes.join("・")}コマ`;
    }

    function collectTimetableOrder(doc) {
        const order = new Map();
        const slots = new Map();
        doc.querySelectorAll(".schedule-table tr").forEach(row => {
            const period = row.querySelector("th")?.textContent.normalize("NFKC").match(/\d+/);
            if (!period) return;
            row.querySelectorAll("td[id^=week]").forEach(cell => {
                const day = Number(cell.id.replace("week", "")) - 1;
                if (day < 0 || day > 6) return;
                const slot = day * 100 + Number(period[0]);
                cell.querySelectorAll("li[id]").forEach(course => {
                    // Registration IDs are year + subject code + class code.
                    const key = course.id.slice(4);
                    order.set(key, Math.min(order.get(key) ?? Infinity, slot));
                    if (!slots.has(key)) slots.set(key, []);
                    if (!slots.get(key).some(entry => entry.order === slot)) {
                        slots.get(key).push({ order: slot, day, period: row.querySelector("th").textContent.normalize("NFKC").replace(/\s+/g, "").trim() });
                    }
                });
            });
        });
        return {
            year: doc.querySelector(".stady-sec02-header .year")?.textContent.match(/\d{4}/)?.[0],
            semester: doc.querySelector(".stady-sec02-header .c-half-btn .is-active")?.textContent.trim(),
            order,
            slots
        };
    }

    function sortReferenceOptions(select, timetable, year, semester) {
        if (!select) return false;
        const valid = year === timetable.year && semester === timetable.semester && timetable.order.size > 0;
        const selected = select.value;
        const options = Array.from(select.options);
        const days = ["月", "火", "水", "木", "金", "土", "日"];
        const entries = options.map((option, index) => {
            if (option.dataset.cgOriginalLabel === undefined) {
                option.dataset.cgOriginalLabel = option.textContent;
                option.dataset.cgOriginalPosition = String(index);
            }
            const key = option.value.replace(/_/g, "");
            const order = valid ? timetable.order.get(key) : undefined;
            const meetings = (timetable.slots?.get(key) || []).slice().sort((a, b) => a.order - b.order);
            const day = order === undefined ? undefined : Math.floor(order / 100);
            const schedule = meetings.map(meeting => `${days[meeting.day]}曜 ${formatClassPeriod(meeting.period)}`).join("、");
            return {
                option,
                order: !valid ? Number(option.dataset.cgOriginalPosition) : !option.value ? -1 : order ?? Infinity,
                index,
                group: !valid || !option.value ? null : day === undefined ? "曜日・時限未確認" : `${days[day]}曜日`,
                label: schedule && valid ? `${schedule}｜${option.dataset.cgOriginalLabel}` : option.dataset.cgOriginalLabel
            };
        }).sort((a, b) => (a.order - b.order) || a.index - b.index);
        const unchanged = entries.every((entry, index) => entry.option === options[index] &&
            entry.option.textContent === entry.label &&
            (entry.option.parentElement?.tagName === "OPTGROUP" ? entry.option.parentElement.label : null) === entry.group);
        if (!unchanged) {
            const doc = select.ownerDocument;
            const fragment = doc.createDocumentFragment();
            const groups = new Map();
            entries.forEach(entry => {
                entry.option.textContent = entry.label;
                if (entry.group === null) {
                    fragment.appendChild(entry.option);
                } else {
                    if (!groups.has(entry.group)) {
                        const group = doc.createElement("optgroup");
                        group.label = entry.group;
                        groups.set(entry.group, group);
                        fragment.appendChild(group);
                    }
                    groups.get(entry.group).appendChild(entry.option);
                }
            });
            select.replaceChildren(fragment);
            select.value = selected;
        }
        return valid;
    }

    function installReferenceTimetableOrder() {
        if (!document.title.includes("授業参考情報")) return;
        void (async () => {
            try {
                const page = await fetchPage(explicitSubmission(document, location.href, "emptyForm", "SC_07002B00_01/initStudent"));
                if (page.doc.title !== "履修登録") throw new Error("履修時間割を取得できませんでした。");
                const timetable = collectTimetableOrder(page.doc);
                const sort = () => {
                    const year = document.getElementById("changeStartYearCmb")?.value;
                    const semester = document.getElementById("changeStartSemesterCmb")?.selectedOptions[0]?.textContent.trim();
                    sortReferenceOptions(document.getElementById("changeClassSubjectCmb"), timetable, year, semester);
                };
                sort();
                let timer;
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(sort, 100);
                });
                observer.observe(document.body, { childList: true, subtree: true });
                document.addEventListener("change", event => {
                    if (["changeStartYearCmb", "changeStartSemesterCmb"].includes(event.target.id)) sort();
                });
            } catch (error) {
                console.warn("[CG] 授業参考情報の時間割順ソート失敗", error);
            }
        })();
    }

    function styleHomeGradeFrame(frame) {
        try {
            const url = new URL(frame.src, location.href);
            if (url.origin !== location.origin || !url.pathname.endsWith("/recordDashBoard")) return;
            const doc = frame.contentDocument;
            if (!doc?.head) return;
            if (!doc.getElementById("cg-home-grade-glass")) {
                const style = doc.createElement("style");
                style.id = "cg-home-grade-glass";
                style.textContent = `
                html, body, .c-wrapper, .c-container, .c-contents, .c-box-shadow, body > div, canvas,
                .dashboard_box, .graphList_item, .c-footer-inner {
                    background-color: transparent !important;
                }
                html {
                    min-width: calc((100vw + 1px) / var(--cg-grade-frame-scale, 1));
                    min-height: calc((100vh + 1px) / var(--cg-grade-frame-scale, 1));
                }
            `;
                doc.head.appendChild(style);
            }
            // At reduced Safari page zoom, the root's transparent canvas can be
            // smaller than its iframe. Cover the viewport, including rounded edges.
            const root = doc.documentElement;
            if (root && doc.defaultView) {
                const layoutWidth = parseFloat(doc.defaultView.getComputedStyle(root).width);
                const renderedWidth = root.getBoundingClientRect().width;
                if (layoutWidth > 0 && renderedWidth > 0) {
                    root.style.setProperty("--cg-grade-frame-scale", String(Math.min(1, renderedWidth / layoutWidth)));
                }
            }
            if (doc.readyState === "complete" && doc.getElementById("dashBoards")) {
                frame.closest("#dashboard")?.classList.add("cg-grade-frame-ready");
            }
        } catch (error) { console.debug("[CG] 成績パネルの背景調整を省略", error); }
    }

    function installHomeGradeDisclosure() {
        const dashboard = document.querySelector("#dashboard");
        const button = dashboard?.querySelector(".c-btn-toggle.js-accordion");
        const body = dashboard?.querySelector(".index-contents-body");
        if (!button || !body || button.classList.contains("cg-grade-toggle")) return;
        button.classList.add("cg-grade-toggle");
        button.classList.remove("is-open");
        body.style.display = "none";
        body.id ||= "cg-home-grade-content";
        button.setAttribute("role", "button");
        button.setAttribute("aria-label", "成績ダッシュボードを開閉");
        button.setAttribute("aria-controls", body.id);
        const update = () => {
            const expanded = button.classList.contains("is-open");
            button.setAttribute("aria-expanded", String(expanded));
            dashboard.classList.toggle("cg-grade-collapsed", !expanded);
            if (expanded) requestAnimationFrame(() => {
                // Keep the portal's accordion handler; only resize charts after it opens.
                try {
                    const frame = body.querySelector("iframe");
                    if (frame) styleHomeGradeFrame(frame);
                    const frameWindow = frame?.contentWindow;
                    frameWindow?.dispatchEvent(new frameWindow.Event("resize"));
                } catch (error) { console.debug("[CG] 成績グラフのサイズ調整を省略", error); }
            });
        };
        update();
        new MutationObserver(update).observe(button, { attributes: true, attributeFilter: ["class"] });
        button.addEventListener("keydown", event => {
            if (event.key === " ") { event.preventDefault(); button.click(); }
        });
    }

    function parseHomeLecture(lines) {
        const period = lines[0]?.normalize("NFKC").match(/^\s*(\d+)(?:[・･]\d+)?限.*?(\d{1,2}:\d{2}\s*[-–〜~]\s*\d{1,2}:\d{2})/);
        if (!period || !lines[1]) return null;
        const slot = Math.ceil(Number(period[1]) / 2);
        if (slot < 1 || slot > 5) return null;
        return { slot, period: lines[0].trim(), subject: lines[1].trim(),
            // Without a classroom the portal emits only three lines; the last is the teacher.
            room: lines.length >= 4 ? lines[2].trim() : "" };
    }

    function installHomeSchedule() {
        const container = document.querySelector(".index-container");
        if (!container || document.getElementById("cg-home-schedule")) return;
        let calendar;
        const style = document.createElement("style");
        style.id = "cg-home-schedule";
        style.textContent = `
            .cg-home .calender_week .column { min-width: 0; }
            .cg-home .calender_week .content { min-width: 0; }
            .cg-home .calender_week .scheduleList.cg-slot-list {
                display: grid; grid-template-rows: repeat(5, var(--cg-slot-height, 120px));
                grid-auto-rows: auto; gap: 6px; padding: 5px; margin: 0; box-sizing: border-box;
            }
            .cg-home .cg-home-slot { min-width: 0; list-style: none; margin: 0; padding: 0; }
            .cg-home .cg-home-slot-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; min-height: 100%; }
            .cg-home .calender_week .scheduleList_item.cg-home-lecture {
                box-sizing: border-box; min-width: 0; width: 100%; margin: 0; padding: 8px 6px;
                background-color: rgba(255, 255, 255, .4);
                box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .1);
            }
            .cg-home .cg-home-lecture .index-schedule-type-lecuture { display: none; }
            .cg-home .cg-home-lecture .scheduleTitle {
                margin: 0; padding: 0; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere;
            }
            .cg-home .cg-home-lecture .scheduleTitle > span { display: block; }
            .cg-home .cg-home-subject { font-weight: 400; margin: 4px 0; }
            .cg-home .cg-home-room { color: #536174; }
        `;
        document.head.appendChild(style);
        const measure = () => {
            if (!calendar?.isConnected) return;
            let height = 0;
            calendar.querySelectorAll(".cg-home-slot-items").forEach(items => {
                const cards = [...items.children];
                const square = parseFloat(getComputedStyle(items).width) || 0;
                const natural = cards.reduce((sum, card) => {
                    const css = getComputedStyle(card);
                    return sum + card.querySelector(".scheduleTitle").scrollHeight
                        + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
                }, 0) + Math.max(0, cards.length - 1) * 6;
                height = Math.max(height, square, natural);
            });
            // Prefer squares; only grow when the text needs more room. Use CSS pixels even at page zoom.
            calendar.style.setProperty("--cg-slot-height", `${Math.ceil(height)}px`);
        };
        const update = () => {
            calendar = container.querySelector(".calender_week");
            if (!calendar) return;
            calendar.querySelectorAll(".column > .content").forEach(day => {
                let list = day.querySelector(".scheduleList");
                if (!list) {
                    list = document.createElement("ul");
                    list.className = "scheduleList";
                    day.appendChild(list);
                }
                if (!list.classList.contains("cg-slot-list")) {
                    list.classList.add("cg-slot-list");
                    for (let slot = 1; slot <= 5; slot++) {
                        const cell = document.createElement("li");
                        cell.className = "cg-home-slot";
                        cell.style.gridRow = slot;
                        const items = document.createElement("ul");
                        items.className = "cg-home-slot-items";
                        cell.appendChild(items);
                        list.appendChild(cell);
                    }
                }
                list.querySelectorAll(".scheduleList_item:not(.cg-home-lecture):not(.cg-home-other)").forEach(card => {
                    const title = card.querySelector(".scheduleTitle");
                    const copy = title?.cloneNode(true);
                    copy?.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
                    const lecture = card.querySelector(".index-schedule-type-lecuture")
                        && copy && parseHomeLecture(copy.textContent.split("\n"));
                    if (!lecture) {
                        card.classList.add("cg-home-other");
                        return; // Keep events and unrecognised periods intact after the five slots.
                    }
                    title.replaceChildren();
                    for (const key of ["period", "subject", "room"]) {
                        if (!lecture[key]) continue;
                        const line = document.createElement("span");
                        line.className = `cg-home-${key}`;
                        line.textContent = lecture[key];
                        title.appendChild(line);
                    }
                    card.classList.add("cg-home-lecture");
                    list.querySelectorAll(".cg-home-slot-items")[lecture.slot - 1].appendChild(card);
                });
            });
            measure();
        };
        update();
        // The portal replaces the calendar itself after startup; observe its stable parent.
        new MutationObserver(update).observe(container, { childList: true, subtree: true });
        let width = container.getBoundingClientRect().width;
        if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
            const next = container.getBoundingClientRect().width;
            if (next !== width) { width = next; requestAnimationFrame(measure); }
        }).observe(container);
        document.fonts?.ready.then(measure);
    }

    function installHomeAppearance() {
        document.documentElement.classList.add("cg-home");
        const style = document.createElement("style");
        style.id = "cg-home-appearance";
        style.textContent = `
            .cg-home .index-main-visual { overflow: visible; }
            .cg-home .index-main-visual .sp_box {
                display: grid; grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr); align-items: center;
                width: calc(100% - 40px); max-width: 1200px; margin: 24px auto; padding: 24px 28px; gap: 28px;
                box-sizing: border-box; border: 1px solid #ffffff9c; border-radius: 18px;
                background: rgba(255, 255, 255, .78); box-shadow: 0 8px 32px #18253b12;
                -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
            }
            .cg-home .index-main-visual-top { grid-column: 2; grid-row: 1; width: 100%; min-width: 0; margin: 0; padding: 0; }
            .cg-home .index-main-visual-bottom { grid-column: 1; grid-row: 1; width: 100%; min-width: 0; }
            .cg-home .index-main-visual-bottom .c-contents { width: 100%; min-width: 0; padding: 0; margin: 0; }
            .cg-home .index-main-visual-user-information { background: transparent; padding: 0; border-radius: 0; }
            .cg-home .index-main-visual-user-name { color: #253044; font-size: 20px; font-weight: 600; line-height: 1.5; }
            .cg-home .index-main-visual-user-last-login { color: #536174; font-size: 12px; line-height: 1.7; }
            .cg-home .cg-version-link { display: inline-block; margin-top: 4px; color: #536174; font-size: 11px; text-decoration: none; }
            .cg-home .cg-version-link:hover { text-decoration: underline; }
            .cg-home .index-main-visual-notice { width: 100%; height: auto; min-height: 0; margin: 0; padding: 0; }
            .cg-home .index-main-visual-notice-other { width: 100%; height: auto; min-width: 0; padding: 0; margin: 0; }
            .cg-home .index-notice-other-items.cg-notice-with-countdown {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); grid-template-rows: auto; gap: 20px;
                padding: 0; margin: 0;
            }
            .cg-home .cg-notice-with-countdown > .index-notice-other-item > .index-main-visual-notice-box,
            .cg-home .cg-notice-with-countdown > .index-notice-other-item > .cg-index-main-visual-notice-box,
            .cg-home .cg-notice-with-countdown > #cg-home-task-countdown {
                display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
                grid-column: auto; min-height: 72px; padding: 0 0 0 20px; margin: 0; gap: 8px;
                background: transparent; border: 0; border-left: 1px solid #5261742e;
                border-radius: 0; box-shadow: none; text-align: left; color: #253044;
            }
            .cg-home .cg-notice-with-countdown .title,
            .cg-home #cg-home-task-countdown .cg-deadline-heading {
                color: #536174; font: 500 12px/1.5 sans-serif; text-align: left !important; margin: 0;
            }
            .cg-home .cg-notice-with-countdown .content { justify-content: flex-start; }
            .cg-home .cg-notice-with-countdown .count { font-size: 13px; line-height: 1.2; }
            .cg-home .cg-notice-with-countdown .count .num { font-size: 30px; font-weight: 600; }
            .cg-home #cg-home-task-countdown .cg-deadline-clock { font-size: 16px; line-height: 1.6; text-align: left; }
            .cg-home .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn { transform: none; border-radius: 6px; font-size: 11px; }
            .cg-home .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:after,
            .cg-home .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:before { transform: none; }
            .cg-home .index-container .c-box-shadow {
                background: rgba(255, 255, 255, .76); border: 1px solid #ffffff8c; border-radius: 18px;
                box-shadow: 0 8px 32px #18253b12; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
            }
            .cg-home .index-container .c-box-shadow > div,
            .cg-home .index-container .c-box-shadow section,
            .cg-home .index-container .c-box-shadow iframe { background-color: transparent; }
            .cg-home .index-container .index-contents-heading { color: #253044; font-size: 20px; }
            .cg-home .cg-grade-toggle {
                position: relative; display: inline-flex; width: 34px; height: 34px;
                border: 1px solid #53617430; border-radius: 10px; background: rgba(255, 255, 255, .45);
                color: #536174; box-shadow: none;
            }
            .cg-home .cg-grade-toggle:hover { background: rgba(255, 255, 255, .75); }
            .cg-home .cg-grade-toggle::before { display: none; }
            .cg-home .cg-grade-toggle::after {
                content: ""; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: 0;
                opacity: 1; background: none; border: solid currentColor; border-width: 0 1.5px 1.5px 0;
                transform: translate(-50%, -65%) rotate(45deg);
            }
            .cg-home .cg-grade-toggle.is-open::after { transform: translate(-50%, -30%) rotate(225deg); }
            .cg-home .cg-grade-toggle:focus-visible { outline: 2px solid #536174; outline-offset: 3px; }
            .cg-home #dashboard.cg-grade-collapsed #recordDashBoardReading,
            .cg-home #dashboard.cg-grade-frame-ready #recordDashBoardReading { display: none !important; }
            .cg-home .index-container .scheduleList,
            .cg-home .index-container dd.content { background-color: transparent !important; }
            .cg-home .index-container .scheduleList_item,
            .cg-home .index-container .schedule-accordion,
            .cg-home .index-container .submissionList_item,
            .cg-home .index-container .live_box { background-color: rgba(255, 255, 255, .24); border-radius: 6px; }
            @media screen and (max-width: 900px) {
                .cg-home .index-main-visual .sp_box { grid-template-columns: 1fr; gap: 20px; padding: 20px; }
                .cg-home .index-main-visual-top { grid-column: 1; grid-row: 2; }
                .cg-home .index-main-visual-bottom { grid-column: 1; grid-row: 1; }
                .cg-home .cg-notice-with-countdown > .index-notice-other-item > .index-main-visual-notice-box,
                .cg-home .cg-notice-with-countdown > .index-notice-other-item > .cg-index-main-visual-notice-box,
                .cg-home .cg-notice-with-countdown > #cg-home-task-countdown { padding-left: 0; border-left: 0; }
            }
            @media screen and (max-width: 560px) {
                .cg-home .index-main-visual .sp_box { width: calc(100% - 24px); margin: 16px auto; padding: 18px; border-radius: 14px; }
                .cg-home .index-notice-other-items.cg-notice-with-countdown { grid-template-columns: 1fr; gap: 16px; }
                .cg-home .cg-notice-with-countdown > .index-notice-other-item > .index-main-visual-notice-box,
                .cg-home .cg-notice-with-countdown > .index-notice-other-item > .cg-index-main-visual-notice-box,
                .cg-home .cg-notice-with-countdown > #cg-home-task-countdown { min-height: 0; }
                .cg-home .index-container .index-contents-heading { font-size: 18px; }
            }
        `;
        document.head.appendChild(style);
        installHomeGradeDisclosure();
        document.querySelectorAll("iframe").forEach(styleHomeGradeFrame);
        window.addEventListener("resize", () => requestAnimationFrame(() => {
            document.querySelectorAll("iframe").forEach(styleHomeGradeFrame);
        }));
        document.addEventListener("load", event => {
            if (event.target.tagName === "IFRAME") styleHomeGradeFrame(event.target);
        }, true);
    }

    function prepareHeaderImage(img, maxLength = 3 * 1024 * 1024) {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!(width > 0 && height > 0)) throw new Error("画像のサイズを取得できませんでした．");
        const scale = Math.min(1, 2048 / width, 2048 / height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("画像を処理できませんでした．");
        // Save the entire image. CSS fits it to the viewport without baking in a crop.
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let image = canvas.toDataURL("image/png");
        if (image.length <= maxLength) return image;
        while (true) {
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (const quality of [0.9, 0.75, 0.6]) {
                image = canvas.toDataURL("image/jpeg", quality);
                if (image.length <= maxLength) return image;
            }
            if (Math.max(canvas.width, canvas.height) <= 256) break;
            canvas.width = Math.max(1, Math.round(canvas.width * 0.75));
            canvas.height = Math.max(1, Math.round(canvas.height * 0.75));
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        throw new Error("画像を十分に圧縮できませんでした．別の画像でお試しください．");
    }

    function saveHeaderImage(background, state, image) {
        let maxLength = 3 * 1024 * 1024;
        while (true) {
            const data = prepareHeaderImage(image, maxLength);
            try {
                background.setImage(state, data);
                return;
            } catch (error) {
                if (error?.name !== "QuotaExceededError" && error?.code !== 22 && error?.code !== 1014) {
                    throw new Error("画像を保存できませんでした．ブラウザの保存設定を確認してください．", { cause: error });
                }
                // Shrink only the selected image; failed writes leave every previous image intact.
                maxLength = Math.floor(Math.min(maxLength, data.length) * 0.6);
                if (maxLength < 64 * 1024) {
                    throw new Error("背景画像の保存容量が足りません．不要な背景を元に戻してから，もう一度画像を選んでください．", { cause: error });
                }
            }
        }
    }

    function installHeaderBackgroundSettings() {
        const visual = document.getElementById("cg-page-background");
        let storage;
        try { storage = localStorage; } catch (error) { console.warn("[CG] 保存先を利用できません", error); }
        const background = createHeaderBackgroundController(visual, storage);
        if (!visual || document.getElementById("cg-header-uploader")) return background;

        const style = document.createElement("style");
        style.textContent = `
            #cg-header-uploader { position: fixed; bottom: 20px; right: 20px; z-index: 20; }
            #cg-header-uploader-btn { background: #fff; box-shadow: 0 2px 12px #0003; }
            #cg-header-uploader button { cursor: pointer; font: inherit; }
            #cg-header-uploader-btn { min-width: auto; }
            #cg-header-settings {
                position: fixed; z-index: 10000;
                width: min(350px, calc(100vw - 32px)); max-height: 70vh; overflow-y: auto;
                padding: 16px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 8px;
                background: #fff; color: #333; box-shadow: 0 4px 20px #0003;
                font-size: 14px; line-height: 1.5; text-align: left;
            }
            #cg-header-settings[hidden] { display: none; }
            #cg-header-settings .cg-header-settings-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            #cg-header-settings button { cursor: pointer; font: inherit; padding: 5px 8px; border: 1px solid #bbb; border-radius: 4px; background: #f6f6f6; color: #333; }
            #cg-header-settings input[type="number"] { width: 70px; margin: 0 5px; padding: 4px; font: inherit; color: #333; background: #fff; border: 1px solid #bbb; }
            #cg-header-settings .cg-header-image-row { border-top: 1px solid #ddd; margin-top: 12px; padding-top: 10px; }
            #cg-header-settings .cg-header-image-actions { display: flex; gap: 8px; margin-top: 6px; }
            #cg-header-settings img { display: block; width: 100%; height: 100px; object-fit: contain; margin-top: 6px; }
            #cg-header-settings img[hidden] { display: none; }
            #cg-header-settings .cg-header-note { font-size: 12px; color: #666; margin-top: 8px; }
            #cg-header-settings-error { color: #b00020; margin-top: 8px; }
        `;
        document.head.appendChild(style);
        const wrapper = document.createElement("div");
        wrapper.id = "cg-header-uploader";
        const toggle = document.createElement("button");
        toggle.id = "cg-header-uploader-btn";
        toggle.type = "button";
        toggle.className = "c-btn c-btn-line";
        toggle.title = "背景画像の設定";
        toggle.setAttribute("aria-label", "背景画像の設定");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "cg-header-settings");
        toggle.innerHTML = '<span class="c-btn-link"><i class="c-icon-edit" style="margin: 0" aria-hidden="true"></i></span>';

        const panel = document.createElement("section");
        panel.id = "cg-header-settings";
        panel.hidden = true;
        panel.setAttribute("aria-label", "背景画像の設定");
        const heading = document.createElement("div");
        heading.className = "cg-header-settings-heading";
        const title = document.createElement("strong");
        title.textContent = "背景画像の設定";
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "閉じる";
        const positionPanel = () => {
            const rect = toggle.getBoundingClientRect();
            panel.style.top = `${Math.min(rect.bottom + 8, Math.max(16, window.innerHeight - panel.offsetHeight - 16))}px`;
            panel.style.right = `${Math.min(Math.max(16, window.innerWidth - rect.right), Math.max(16, window.innerWidth - panel.offsetWidth - 16))}px`;
        };
        const setOpen = open => {
            panel.hidden = !open;
            toggle.setAttribute("aria-expanded", String(open));
            if (open) positionPanel();
        };
        toggle.addEventListener("click", () => setOpen(panel.hidden));
        close.addEventListener("click", () => { setOpen(false); toggle.focus(); });
        heading.append(title, close);
        panel.appendChild(heading);

        const error = document.createElement("div");
        error.id = "cg-header-settings-error";
        error.setAttribute("role", "status");
        error.setAttribute("aria-live", "polite");
        const showError = message => { error.textContent = message; };
        const daysLabel = document.createElement("label");
        daysLabel.textContent = "警告背景に切り替える日数";
        const days = document.createElement("input");
        days.id = "cg-header-warning-days";
        days.type = "number";
        days.min = "2";
        days.step = "1";
        days.inputMode = "numeric";
        days.value = String(background.settings.warningDays);
        daysLabel.append(days, document.createTextNode("日未満"));
        panel.appendChild(daysLabel);
        const note = document.createElement("p");
        note.className = "cg-header-note";
        note.textContent = "画像を選ぶと保存容量に合わせて縮小・圧縮し，縦横比を保って画面全体に表示します．ホームでは締め切りに応じて切り替わり，他のページでは通常時の画像を使います．日数は2以上の整数です．";
        panel.appendChild(note);

        const labels = new Map();
        for (const [state, label] of [["normal", "通常時"], ["warning", `${background.settings.warningDays}日未満`], ["critical", "1日未満"]]) {
            const row = document.createElement("div");
            row.className = "cg-header-image-row";
            const caption = document.createElement("strong");
            caption.textContent = label;
            const thumbnail = document.createElement("img");
            const refresh = () => {
                const image = background.settings.images[state];
                thumbnail.hidden = !image;
                thumbnail.alt = `${caption.textContent}の背景`;
                if (image) thumbnail.src = image;
                else thumbnail.removeAttribute("src");
            };
            const actions = document.createElement("div");
            actions.className = "cg-header-image-actions";
            const choose = document.createElement("button");
            choose.type = "button";
            choose.textContent = "画像を選ぶ";
            choose.setAttribute("aria-label", `${label}の画像を選ぶ`);
            const reset = document.createElement("button");
            reset.type = "button";
            reset.textContent = "元に戻す";
            reset.setAttribute("aria-label", `${label}の背景を元に戻す`);
            const file = document.createElement("input");
            file.type = "file";
            file.accept = "image/*";
            file.hidden = true;
            choose.addEventListener("click", () => file.click());
            file.addEventListener("change", () => {
                const selected = file.files[0];
                file.value = "";
                if (!selected) return;
                showError("");
                choose.disabled = reset.disabled = true;
                const finish = () => { choose.disabled = reset.disabled = false; };
                const reader = new FileReader();
                reader.onerror = () => { showError("画像を読み込めませんでした．"); finish(); };
                reader.onload = () => {
                    const image = new Image();
                    image.onerror = () => { showError("この画像は読み込めません．PNGやJPEGでお試しください．"); finish(); };
                    image.onload = () => {
                        try {
                            saveHeaderImage(background, state, image);
                            refresh();
                        } catch (error) {
                            showError(error.message || "画像を変更できませんでした．");
                            console.warn("[CG] 背景画像の変更失敗", error);
                        } finally { finish(); }
                    };
                    image.src = reader.result;
                };
                reader.readAsDataURL(selected);
            });
            reset.addEventListener("click", () => {
                try {
                    background.setImage(state, "");
                    showError("");
                    refresh();
                } catch (error) { showError("背景を元に戻せませんでした．ブラウザの保存設定を確認してください．"); }
            });
            actions.append(choose, reset, file);
            row.append(caption, thumbnail, actions);
            panel.appendChild(row);
            labels.set(state, { caption, choose, reset, refresh });
            refresh();
        }
        days.addEventListener("change", () => {
            try {
                background.setWarningDays(days.value);
                const warning = labels.get("warning");
                const label = `${background.settings.warningDays}日未満`;
                warning.caption.textContent = label;
                warning.choose.setAttribute("aria-label", `${label}の画像を選ぶ`);
                warning.reset.setAttribute("aria-label", `${label}の背景を元に戻す`);
                warning.refresh();
                showError("");
            } catch (error) {
                showError(error.message);
                days.value = String(background.settings.warningDays);
            }
        });
        panel.appendChild(error);
        wrapper.appendChild(toggle);
        document.body.appendChild(wrapper);
        document.body.appendChild(panel);
        // The fixed layer follows the viewport through CSS, including behind the navigation bars.
        window.addEventListener("resize", () => { if (!panel.hidden) positionPanel(); });
        window.visualViewport?.addEventListener("resize", () => { if (!panel.hidden) positionPanel(); });
        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target) && !panel.contains(event.target)) setOpen(false);
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); }
        });
        return background;
    }

    async function fetchPreviewBlob(href, form = null) {
        const url = new URL(href, location.href);
        const method = (form?.method || "GET").toUpperCase();
        const options = { method, credentials: "same-origin" };
        if (form) {
            const data = new FormData(form);
            if (method === "GET") {
                new URLSearchParams(data).forEach((value, key) => url.searchParams.append(key, value));
            } else {
                options.body = data;
            }
        }
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`ファイル取得に失敗しました: HTTP ${response.status}`);
        return response.blob();
    }

    function installOtherPageDeadlineBackground(background) {
        if (document.title !== "ホーム画面（学生・保護者）") {
            const updateBackground = () => {
                const now = Date.now();
                background.render(cachedHomeDeadline(now) - now);
            };
            updateBackground();
            setInterval(updateBackground, 1000);
        }
    }

    function startKawaiiGakujo() {
        console.log("[CG] startKawaiiGakujo (DOM ready)");
        installReferenceTimetableOrder();
        const pageBackground = installHeaderBackgroundSettings();
        installOtherPageDeadlineBackground(pageBackground);

        const getHiddenTasks = () => {
            let hiddenTasks = [];
            const cookies = document.cookie.split(';');

            cookies.forEach(cookie => {
                const trimmed = cookie.trim();
                if (trimmed.startsWith('cg_hidden_')) {
                    const equalIndex = trimmed.indexOf('=');
                    if (equalIndex > -1) {
                        const value = trimmed.substring(equalIndex + 1);
                        try {
                            const task = JSON.parse(decodeURIComponent(value));
                            hiddenTasks.push(task);
                        } catch (e) {

                        }
                    }
                }
            });

            return hiddenTasks;
        };

        const addHiddenTask = (submissionType, subject, title, submittalTerm, submittalStatus) => {
            const hiddenTasks = getHiddenTasks();
            const exists = hiddenTasks.some(task =>
                task.submissionType === submissionType &&
                task.subject === subject &&
                task.title === title);
            if (!exists) {
                const uuid = self.crypto.randomUUID();
                const cookieName = `cg_hidden_${uuid}`;
                const task = { submissionType, subject, title, submittalTerm, submittalStatus };
                setCookie(cookieName, JSON.stringify(task), 365);
            }
        };

        const removeHiddenTask = (submissionType, subject, title) => {
            const cookies = document.cookie.split(';');
            cookies.forEach(cookie => {
                const trimmed = cookie.trim();
                if (trimmed.startsWith('cg_hidden_')) {
                    const equalIndex = trimmed.indexOf('=');
                    if (equalIndex > -1) {
                        const cookieName = trimmed.substring(0, equalIndex);
                        const value = trimmed.substring(equalIndex + 1);
                        try {
                            const task = JSON.parse(decodeURIComponent(value));
                            if (task.submissionType === submissionType &&
                                task.subject === subject &&
                                task.title === title) {
                                deleteCookie(cookieName);
                            }
                        } catch (e) {

                        }
                    }
                }
            });
        };

        if (document.title === "ホーム画面（学生・保護者）") {
            installHomeAppearance();
            installHomeSchedule();
            const versionLink = document.createElement("a");
            versionLink.className = "cg-version-link";
            versionLink.href = updateURL;
            versionLink.title = "Kawaii Gakujo をアップデート";
            versionLink.textContent = `Kawaii Gakujo v${version}`;
            document.querySelector(".index-main-visual-user-information")?.appendChild(versionLink);

            observeUntilReady(() => {
                const countElement = document.getElementsByClassName("count")[0];
                if (countElement) {
                    const countText = countElement.innerText;
                    const match = countText.match(/(\d+)件/);
                    let originalCount = 0;
                    if (match) {
                        originalCount = parseInt(match[1], 10);
                    }
                    const hiddenTasks = getHiddenTasks();
                    const now = new Date();
                    let hiddenCount = 0;
                    hiddenTasks.forEach(task => {
                        const submittalTerm = new Date(task.submittalTerm.split("～")[1].trim());
                        if (submittalTerm > now && task.submittalStatus === "未提出") {
                            hiddenCount++;
                        }
                    });
                    if (hiddenCount > 0) {
                        countElement.innerHTML = `<span class="num">${originalCount - hiddenCount}</span>件 + <span style="color: gray;">${hiddenCount}件</span>`;
                    }
                    return true;
                }
                return false;
            });
            showUpdateNotice();
            void checkGradeUpdates();

            const indexMainVisualNotice = document.getElementsByClassName("index-main-visual-notice")[0];
            if (!indexMainVisualNotice.querySelector(".index-main-visual-notice-other")) {
                const indexMainVisualNoticeOther = document.createElement("div");
                indexMainVisualNoticeOther.className = "index-main-visual-notice-other";
                const ul = document.createElement("ul");
                ul.className = "index-notice-other-items";
                indexMainVisualNoticeOther.appendChild(ul);
                indexMainVisualNotice.appendChild(indexMainVisualNoticeOther);
            }

            const indexNoticeOtherItems = document.getElementsByClassName("index-notice-other-items")[0];
            const li = document.createElement('li');
            li.className = 'index-notice-other-item';
            if (getCookie("cg_grade_save_enabled") === "1") {
                li.innerHTML = `
                    <div class="cg-index-main-visual-notice-box cg-index-notice-other-link">
                        <p class="title" style="text-align: center;">成績更新通知</p>
                        <div class="content">
                            <div class="cg-checkbox-wrapper-8">
                                <input type="checkbox" id="cg-grade-save-toggle" class="cg-tgl cg-tgl-skewed" checked>
                                <label for="cg-grade-save-toggle" data-tg-on="ON" data-tg-off="OFF" class="cg-tgl-btn"></label>
                            </div>
                        </div>
                    </div>
                    `;
            } else {
                li.innerHTML = `
                    <div class="cg-index-main-visual-notice-box cg-index-notice-other-link">
                        <p class="title" style="text-align: center;">成績更新通知</p>
                        <div class="content">
                            <div class="cg-checkbox-wrapper-8">
                                <input type="checkbox" id="cg-grade-save-toggle" class="cg-tgl cg-tgl-skewed">
                                <label for="cg-grade-save-toggle" data-tg-on="ON" data-tg-off="OFF" class="cg-tgl-btn"></label>
                            </div>
                        </div>
                    </div>
                    `;
            }
            const style = document.createElement('style');
            style.textContent = `
                .cg-index-main-visual-notice-box {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    padding: 0 12px;
                    border-radius: 4px;
                    box-shadow: 0 0 3px 0 rgba(57, 57, 57, .15);
                    border: 2px solid #a1a1a1;
                    background-color: #fff;
                }

                .cg-index-notice-other-link {
                    display: block;
                    height: 100%;
                    padding: 10px 5px;
                    text-align: center;
                    line-height: 1.2;
                    margin-bottom: 3px;
                }

                @media print, screen and (max-width: 560px) {
                    .cg-index-notice-other-link {
                        padding: 15px 15px 15px 5px;
                    }
                }

                .cg-index-main-visual-notice-box .title {
                    color: #333;
                    /*font-size: 1.6rem;*/
                    font-size: 1.5rem;
                }

                @media print, screen and (max-width: 560px) {
                    .cg-index-main-visual-notice-box .title {
                        font-size: 2.2rem;
                        margin-bottom: 5px;
                    }
                }

                .cg-checkbox-wrapper-8 .cg-tgl {
                    display: none;
                }

                .cg-checkbox-wrapper-8 .cg-tgl,
                .cg-checkbox-wrapper-8 .cg-tgl:after,
                .cg-checkbox-wrapper-8 .cg-tgl:before,
                .cg-checkbox-wrapper-8 .cg-tgl *,
                .cg-checkbox-wrapper-8 .cg-tgl *:after,
                .cg-checkbox-wrapper-8 .cg-tgl *:before,
                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn {
                    box-sizing: border-box;
                }

                .cg-checkbox-wrapper-8 .cg-tgl::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl:after::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl:before::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl *::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl *:after::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl *:before::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn::-moz-selection,
                .cg-checkbox-wrapper-8 .cg-tgl::selection,
                .cg-checkbox-wrapper-8 .cg-tgl:after::selection,
                .cg-checkbox-wrapper-8 .cg-tgl:before::selection,
                .cg-checkbox-wrapper-8 .cg-tgl *::selection,
                .cg-checkbox-wrapper-8 .cg-tgl *:after::selection,
                .cg-checkbox-wrapper-8 .cg-tgl *:before::selection,
                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn::selection {
                    background: none;
                }

                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn {
                    outline: 0;
                    display: block;
                    width: 4em;
                    height: 2em;
                    position: relative;
                    cursor: pointer;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }

                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn:after,
                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn:before {
                    position: relative;
                    display: block;
                    content: "";
                    width: 50%;
                    height: 100%;
                }

                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn:after {
                    left: 0;
                }

                .cg-checkbox-wrapper-8 .cg-tgl + .cg-tgl-btn:before {
                    display: none;
                }

                .cg-checkbox-wrapper-8 .cg-tgl:checked + .cg-tgl-btn:after {
                    left: 50%;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn {
                    overflow: hidden;
                    transform: skew(-10deg);
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                    transition: all 0.2s ease;
                    font-family: sans-serif;
                    background: #888;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:after,
                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:before {
                    transform: skew(10deg);
                    display: inline-block;
                    transition: all 0.2s ease;
                    width: 100%;
                    text-align: center;
                    position: absolute;
                    line-height: 2em;
                    font-weight: bold;
                    color: #fff;
                    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:after {
                    left: 100%;
                    content: attr(data-tg-on);
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:before {
                    left: 0;
                    content: attr(data-tg-off);
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:active {
                    background: #888;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed + .cg-tgl-btn:active:before {
                    left: -10%;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed:checked + .cg-tgl-btn {
                    background: #86d993;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed:checked + .cg-tgl-btn:before {
                    left: -100%;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed:checked + .cg-tgl-btn:after {
                    left: 0;
                }

                .cg-checkbox-wrapper-8 .cg-tgl-skewed:checked + .cg-tgl-btn:active:after {
                    left: 10%;
                }
                `;
            document.head.appendChild(style);
            indexNoticeOtherItems.appendChild(li);
            installHomeTaskCountdown(pageBackground, li);

            window.addEventListener('change', (e) => {
                if (e.target.id === 'cg-grade-save-toggle') {
                    if (e.target.checked) {
                        setCookie("cg_grade_save_enabled", "1");
                        void checkGradeUpdates();
                    } else {
                        deleteCookie("cg_grade_save_enabled");
                        deleteCookie("cg_grade");
                        deleteCookie("cg_grade_updated");
                        document.getElementsByClassName("cg-grade-notice-container")[0]?.remove();
                    }
                }
            });

        } else if (document.title === "課題・アンケートリスト") {
            let processedSet = new WeakSet();
            let hiddenCount = 0;

            const addHideButtonColumn = () => {
                const table = document.getElementById("dataTable01");
                if (!table) return;

                const thead = table.querySelector("thead");
                if (thead && !thead.querySelector('.hidebutton-header')) {
                    const th = document.createElement('th');
                    th.className = 'hidebutton-header';
                    th.style.width = "32px";
                    th.innerHTML = "非表示<br>にする"
                    thead.querySelector("tr").insertBefore(th, thead.querySelector("tr").firstChild);
                }

                const tbody = table.querySelector("tbody");
                if (tbody) {
                    tbody.querySelectorAll("tr").forEach(row => {
                        if (!row.querySelector('.row-hidebutton')) {
                            const td = document.createElement('td');
                            td.style.textAlign = 'center';

                            const btn = document.createElement('input');
                            btn.type = 'button';
                            btn.name = 'row-hidebutton';
                            btn.value = '−';
                            btn.className = 'row-hidebutton';
                            btn.style.width = '24px';
                            btn.style.height = '24px';
                            btn.style.fontSize = '18px';
                            btn.style.cursor = 'pointer';
                            btn.style.border = 'none';
                            btn.style.background = '#eee';
                            btn.style.borderRadius = '4px';
                            btn.style.transition = 'background 0.2s';

                            btn.addEventListener('mouseenter', () => {
                                btn.style.background = '#ccc';
                            });
                            btn.addEventListener('mouseleave', () => {
                                btn.style.background = '#eee';
                            });
                            btn.addEventListener('click', (e) => {
                                const row = e.target.closest('tr');
                                row.style.display = 'none';
                                const hiddenTasksTable = document.getElementById("hiddenTasksTable");
                                if (!hiddenTasksTable) return;
                                const hiddenRow = hiddenTasksTable.querySelector('#' + row.id);
                                if (hiddenRow) hiddenRow.style.display = '';
                                addHiddenTask(
                                    hiddenRow.querySelector('td[data-label*="提出物種別"]')?.textContent?.trim() || "",
                                    hiddenRow.querySelector('td[data-label*="講義名"]')?.innerHTML?.split('<br>')[0]?.trim() || "",
                                    hiddenRow.querySelector('td[data-label*="タイトル"]')?.textContent?.trim() || "",
                                    hiddenRow.querySelector('td[data-label*="提出期間"]')?.textContent?.trim() || "",
                                    hiddenRow.querySelector('td[data-label*="提出状況"]')?.textContent?.trim() || ""
                                );
                                const hiddenCountSpan = document.getElementById("hiddenCount");
                                if (hiddenCountSpan) {
                                    hiddenCount++;
                                    hiddenCountSpan.textContent = `(${hiddenCount})`;
                                }
                            });

                            td.appendChild(btn);
                            row.insertBefore(td, row.firstChild);
                        }
                    });
                }
            }

            const addHiddenTasksTable = () => {
                const originalTable = document.getElementById("dataTable01");
                if (!originalTable) return;
                const hiddenTasksTable = originalTable.cloneNode(true);
                if (!hiddenTasksTable) return;
                hiddenTasksTable.id = "hiddenTasksTable";
                hiddenTasksTable.style.marginTop = "2em";

                hiddenTasksTable.querySelectorAll('.row-hidebutton').forEach(btn => {
                    btn.value = '+';
                    btn.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        row.style.display = 'none';
                        const originalTable = document.getElementById("dataTable01");
                        if (!originalTable) return;
                        const hiddenRow = originalTable.querySelector('#' + row.id);
                        if (hiddenRow) hiddenRow.style.display = '';
                        removeHiddenTask(
                            row.querySelector('td[data-label*="提出物種別"]')?.textContent?.trim() || "",
                            row.querySelector('td[data-label*="講義名"]')?.innerHTML?.split('<br>')[0]?.trim() || "",
                            row.querySelector('td[data-label*="タイトル"]')?.textContent?.trim() || ""
                        );
                        const hiddenCountSpan = document.getElementById("hiddenCount");
                        if (hiddenCountSpan) {
                            hiddenCount--;
                            hiddenCountSpan.textContent = `(${hiddenCount})`;
                        }
                    });
                });
                hiddenTasksTable.querySelectorAll('.hidebutton-header').forEach(th => {
                    th.innerHTML = "表示<br>する";
                });

                hiddenTasksTable.querySelectorAll("tr").forEach(row => {
                    if (!row.querySelector('th')) {
                        row.style.display = 'none';
                    }
                });

                const hiddenTasks = getHiddenTasks();
                hiddenTasks.forEach(task => {
                    const rows = hiddenTasksTable.querySelectorAll("tr");
                    rows.forEach(row => {
                        const submissionType = row.querySelector('td[data-label*="提出物種別"]')?.textContent?.trim() || "";
                        const subject = row.querySelector('td[data-label*="講義名"]')?.innerHTML?.split('<br>')[0]?.trim() || "";
                        const title = row.querySelector('td[data-label*="タイトル"]')?.textContent?.trim() || "";

                        if (submissionType === task.submissionType && subject === task.subject && title === task.title) {
                            hiddenCount++;
                            row.style.display = '';
                            const originalRow = document.getElementById("dataTable01").querySelector('#' + row.id);
                            if (originalRow) {
                                originalRow.style.display = 'none';
                            }
                            const submittalTerm = row.querySelector('td[data-label*="提出期間"]')?.textContent?.trim() || "";
                            const submittalStatus = row.querySelector('td[data-label*="提出状況"]')?.textContent?.trim() || "";
                            if (submittalTerm !== task.submittalTerm || submittalStatus !== task.submittalStatus) {
                                removeHiddenTask(submissionType, subject, title);
                                addHiddenTask(submissionType, subject, title, submittalTerm, submittalStatus);
                            }
                        }
                    });
                });

                const details = document.createElement('details');
                details.style.marginTop = "2em";
                const summary = document.createElement('summary');
                summary.textContent = "非表示にした課題・アンケート ";
                summary.style.cursor = "pointer";
                summary.style.fontWeight = "bold";
                summary.style.fontSize = "1.1em";
                const countSpan = document.createElement('span');
                countSpan.id = "hiddenCount";
                countSpan.textContent = `(${hiddenCount})`;
                summary.appendChild(countSpan);
                details.appendChild(summary);
                details.appendChild(hiddenTasksTable);
                const pagination = document.getElementsByClassName("c-pagination")[1];
                document.getElementById("dataTable01_wrapper").getElementsByClassName("c-contents-body")[0].insertBefore(details, pagination);
            }

            const getDeadlineDate = (row) => {
                const td = row.querySelector('td[data-label*="提出期間"]');
                const text = td?.textContent?.trim();
                const match = text?.match(/～\s*([\d/]+)\s+([\d:]+)/);
                if (!match) return new Date(0);
                const dateStr = match[1].replace(/\//g, "-") + "T" + match[2];
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? new Date(0) : date;
            };

            const processTable = () => {
                const table = document.getElementById("dataTable01");
                const tbody = table?.querySelector("tbody");
                if (!tbody) return;

                tbody.querySelectorAll("tr").forEach((row, index) => {
                    row.id = `cg-task-row-${index}`;
                });

                const rows = Array.from(tbody.querySelectorAll("tr"));
                rows.sort((a, b) => getDeadlineDate(a) - getDeadlineDate(b)).forEach(row => {
                    tbody.appendChild(row);
                });

                addHideButtonColumn();
                addHiddenTasksTable();

                for (const row of rows) {
                    if (processedSet.has(row)) continue;
                    processedSet.add(row);

                    const statusCell = row.querySelector('td[data-label*="提出状況"]');
                    if (statusCell && statusCell.textContent.includes("提出済")) {
                        row.style.backgroundColor = "rgba(229, 255, 229, .55)";
                        row.addEventListener('mouseover', () => {
                            row.style.backgroundColor = "rgba(209, 255, 209, .7)";
                        });
                        row.addEventListener('mouseout', () => {
                            row.style.backgroundColor = "rgba(229, 255, 229, .55)";
                        });
                    }

                    const deadline = getDeadlineDate(row);
                    const now = Date.now();

                    const td = row.querySelector('td[data-label*="提出期間"]');
                    if (!td) continue;

                    if (deadline.getHours() < 12) {
                        const last5 = td.textContent.slice(-5);
                        td.innerHTML = td.textContent.slice(0, -5) +
                            `<span style="color:red;font-weight:bold">${last5}</span>`;
                    }

                    let timer = td.querySelector('.timer');
                    if (!timer) {
                        timer = document.createElement('div');
                        timer.className = 'timer';
                        timer.style.textAlign = 'center';
                        td.appendChild(timer);
                    }

                    timer.dataset.deadline = deadline.getTime().toString();
                }
            };

            const debounce = (fn, delay = 300) => {
                let timer = null;
                return function (...args) {
                    clearTimeout(timer);
                    timer = setTimeout(() => fn.apply(this, args), delay);
                };
            };

            const triggerLengthChangeAndWait = () => {
                const lengthSelect = document.querySelector('select[name="dataTable01_length"]');
                const table = document.getElementById("dataTable01");
                const tbody = table?.querySelector("tbody");

                if (!lengthSelect || !tbody) return;

                if (lengthSelect.value === "-1") {
                    processTable();
                    return;
                }
                const observer = new MutationObserver((mutations, obs) => {
                    for (const m of mutations) {
                        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
                            obs.disconnect();
                            processedSet = new WeakSet();
                            processTable();
                            break;
                        }
                    }
                });

                observer.observe(tbody, { childList: true });

                lengthSelect.value = "-1";
                lengthSelect.dispatchEvent(new Event("change", { bubbles: true }));
            };

            observeUntilReady(() => {
                const table = document.getElementById("dataTable01");
                const tbody = table?.querySelector("tbody");
                const lengthSelect = document.querySelector('select[name="dataTable01_length"]');

                if (table && tbody && tbody.querySelectorAll("tr").length > 0 && lengthSelect) {
                    triggerLengthChangeAndWait();
                    return true;
                }
                return false;
            });

            setInterval(() => {
                const now = Date.now();
                document.querySelectorAll('.timer').forEach(timer => {
                    const deadline = Number(timer.dataset.deadline);
                    const remaining = deadline - now;

                    renderDeadlineCountdown(timer, remaining);
                });
            }, 1000);

            if (sessionStorage.getItem("cg_return_to_task") != null) {
                const { title: taskTitle, subject: subjectName } = JSON.parse(sessionStorage.getItem("cg_return_to_task"));
                sessionStorage.removeItem("cg_return_to_task");

                const rows = document.querySelectorAll("#dataTable01 tbody tr");

                console.log(`[CG] Returning to task: ${subjectName} - ${taskTitle}`);

                for (const row of rows) {
                    const subjectCell = row.querySelector('td[data-label^="講義名"]');
                    const titleCell = row.querySelector('td[data-label="タイトル"]');

                    if (!subjectCell || !titleCell) continue;

                    const subjectText = subjectCell.innerText.split("\n")[0].trim();
                    const titleText = titleCell.innerText.trim();

                    if (subjectText.includes(subjectName) && titleText === taskTitle) {
                        row.childNodes[1].click();
                        return true;
                    }
                }
            }
        } else if (document.title === "課題・アンケート詳細") {
            const btn = document.getElementsByClassName("c-btn-submit02")[0];
            if (btn && !btn.dataset.cgHooked) {
                btn.dataset.cgHooked = "1";
                btn.addEventListener("click", () => {
                    const title = document.getElementsByClassName("c-heading")[0].innerText.trim();
                    const subject = document.getElementsByClassName("submission_subject")[0].childNodes[3].innerText.trim();
                    sessionStorage.setItem("cg_return_to_task", JSON.stringify({ title, subject }));
                }, true);
            }


        } else if (document.title === "成績情報" || document.title === "成績情報詳細") {
            deleteCookie("cg_grade_updated");

            function collectYearSemesters() {
                const years = new Set();
                const yearSemesters = new Set();

                const table = document.getElementById("02");
                if (!table) return { years: [], yearSemesters: [] };

                table.querySelectorAll("tbody tr").forEach(tr => {
                    const cell = tr.querySelector('td[data-label="成績報告時期"]');
                    const text = cell?.innerText.trim();
                    if (!text) return;

                    const m = text.match(/(\d{4})年度\s*(前期|後期)/);
                    if (!m) return;

                    years.add(m[1]);
                    yearSemesters.add(`${m[1]}-${m[2]}`);
                });

                return {
                    years: Array.from(years).sort(),
                    yearSemesters: Array.from(yearSemesters).sort((a, b) => {
                        const [ya, sa] = a.split("-");
                        const [yb, sb] = b.split("-");
                        if (ya !== yb) return ya - yb;
                        return sa === "前期" ? -1 : 1;
                    })
                };
            }

            function applyYearSemesterFilter(value) {
                const table = document.getElementById("02");
                if (!table) return;

                table.querySelectorAll("tbody tr").forEach(tr => {
                    const cell = tr.querySelector('td[data-label="成績報告時期"]');
                    const text = cell?.innerText || "";

                    if (value === "all") {
                        tr.style.display = "";
                        return;
                    }

                    if (/^\d{4}$/.test(value)) {
                        tr.style.display = text.includes(`${value}年度`) ? "" : "none";
                        return;
                    }

                    const [y, s] = value.split("-");
                    tr.style.display =
                        text.includes(`${y}年度`) && text.includes(s)
                            ? ""
                            : "none";
                });
            }

            function getDefaultYearSemester() {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1;

                if (month >= 2 && month <= 7) {
                    return `${year - 1}-後期`;
                }

                if (month >= 8) {
                    return `${year}-前期`;
                }

                return `${year - 1}-前期`;
            }

            function initYearSemesterFilter() {
                const table = document.getElementById("02");
                if (!table) return;

                const upper = document.getElementsByClassName("seiseki-marker-contents-body")[0];
                if (!upper) return;
                if (document.getElementById("cg-year-semester-box")) return;

                const { years, yearSemesters } = collectYearSemesters();
                if (years.length === 0) return;

                upper.style.display = "flex";
                upper.style.justifyContent = "space-between";

                const box = document.createElement("div");
                box.className = "c-form-box u-w100per-sp";
                box.id = "cg-year-semester-box";

                box.appendChild(document.createTextNode("年度・期："));

                const wrapper = document.createElement("div");
                wrapper.className = "select_wrapper u-w100per-sp";

                const select = document.createElement("select");
                select.className = "select u-w260-pc u-w100per-sp js-select";

                select.appendChild(new Option("すべて表示", "all"));

                years.forEach(y => {
                    select.appendChild(new Option(`${y}年度`, y));
                });

                yearSemesters.forEach(v => {
                    const [y, s] = v.split("-");
                    select.appendChild(new Option(`${y}年度 ${s}`, v));
                });

                select.addEventListener("change", () => {
                    applyYearSemesterFilter(select.value);
                });

                wrapper.appendChild(select);
                box.appendChild(wrapper);
                upper.appendChild(box);

                const defaultValue = getDefaultYearSemester();

                if ([...select.options].some(o => o.value === defaultValue)) {
                    select.value = defaultValue;
                    applyYearSemesterFilter(defaultValue);
                } else {
                    applyYearSemesterFilter("all");
                }

                console.log("[CG] Year/Semester filter initialized");
            }

            observeUntilReady(() => {
                const table = document.getElementById("02");
                const tbody = table?.querySelector("tbody tr");
                if (table && tbody) {
                    if (!document.getElementsByClassName("seiseki-marker-contents-body")[0]) return false;
                    initYearSemesterFilter();
                    void checkGradeUpdates();
                    const reportDate = document.getElementById("reportDate");
                    if (reportDate) {
                        reportDate.click();
                    }
                    return true;
                }
                return false;
            });
        } else if (document.title === "連絡一覧") {
            const cPageNation = document.getElementsByClassName("c-pagination")[0];
            if (cPageNation) {
                const markAsRead = document.createElement('div');
                markAsRead.className = "c-filter_box c-form-box";
                markAsRead.style.left = "20px";
                markAsRead.innerHTML = `<button type="button" id="cg-mark-as-read" dialogtype="" reportoutputconfirm="true" loading="true" class="c-btn c-btn-submit01" filetype="null"><span class="c-btn-link"><span class="c-btn-text ">すべて既読にする</span></span></button>`;
                cPageNation.childNodes[0].insertBefore(markAsRead, cPageNation.childNodes[0].firstChild);

                document.getElementById("cg-mark-as-read").addEventListener("click", () => {
                    const lengthSelect = document.querySelector('select[name="dataTable01_length"]');
                    if (lengthSelect) {
                        lengthSelect.value = "-1";
                        lengthSelect.dispatchEvent(new Event("change", { bubbles: true }));
                        setTimeout(() => {
                            const checkAll = document.getElementById("checkAllId");
                            if (checkAll) {
                                checkAll.click();
                                setTimeout(() => {
                                    const cBtnSubmit01 = document.getElementsByClassName("c-btn-submit01")[1];
                                    if (cBtnSubmit01) {
                                        cBtnSubmit01.click();
                                    }
                                }, 500);
                            }
                        }, 500);
                    }
                });
            }
        }

        if (location.hostname === "idp.shizuoka.ac.jp") {
            if (document.body.innerText.includes("過去のリクエスト")) {
                location.href = "https://gakujo.shizuoka.ac.jp/";
            } else {
                const btn = document.getElementsByName("_eventId_proceed")[0];

                if (btn) {
                    console.log("[CG] Auto login click");
                    btn.click();
                }
            }
        } else if (location.href === "https://gakujo.shizuoka.ac.jp/lcu-web/" && document.referrer == "https://idp.shizuoka.ac.jp/") {
            const btn = document.getElementById("btnSsoStart");
            if (btn) {
                console.log("[CG] Auto SSO start click");
                btn.click();
            }
        }

        const previewMimeTypes = {
            pdf: "application/pdf",
            txt: "text/plain",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            bmp: "image/bmp",
            avif: "image/avif"
        };
        const getPreviewType = link => {
            const extensionPattern = /\.(pdf|txt|png|jpe?g|gif|webp|bmp|avif)(?=$|[\s?#&])/i;
            const textMatch = link.innerText.trim().match(extensionPattern);
            const hrefMatch = (link.href || "").match(extensionPattern);
            const match = textMatch || hrefMatch;
            return match ? previewMimeTypes[match[1].toLowerCase()] : null;
        };
        const fileLinks = Array.from(document.querySelectorAll("a")).filter(a => getPreviewType(a));

        fileLinks.forEach(link => {
            if (link.dataset.cgFilePreviewed) return;
            link.dataset.cgFilePreviewed = "1";

            const wrapper = document.createElement("div");
            wrapper.className = "cg-preview-wrapper";
            wrapper.style.marginTop = "10px";
            wrapper.style.marginBottom = "20px";
            wrapper.style.width = "100%";
            wrapper.style.border = "1px solid #ccc";
            wrapper.style.borderRadius = "4px";
            wrapper.style.overflow = "hidden";
            wrapper.style.display = "none";

            const iframe = document.createElement("iframe");
            iframe.style.width = "100%";
            iframe.style.height = "600px";
            iframe.style.border = "none";
            iframe.style.display = "block";
            iframe.src = "about:blank";
            wrapper.appendChild(iframe);

            const showPreview = blob => {
                const type = getPreviewType(link) || blob.type;
                const url = URL.createObjectURL(new Blob([blob], { type }));
                if (type.startsWith("image/")) {
                    const image = document.createElement("img");
                    image.alt = link.innerText.trim();
                    image.style.display = "block";
                    image.style.maxWidth = "100%";
                    image.style.maxHeight = "600px";
                    image.style.width = "auto";
                    image.style.height = "auto";
                    image.style.margin = "0 auto";
                    image.onload = image.onerror = () => URL.revokeObjectURL(url);
                    image.src = url;
                    iframe.style.display = "none";
                    wrapper.style.width = "fit-content";
                    wrapper.style.maxWidth = "100%";
                    wrapper.appendChild(image);
                } else {
                    iframe.src = url;
                }
            };

            const insertWrapper = (shouldScroll) => {
                const historyBlock = link.closest(".histry-my-block, .history-my-block");
                if (historyBlock) {
                    historyBlock.appendChild(wrapper);
                } else {
                    const blockParent = link.closest("table, ul, dl, .c-form-box, .c-contents-body");
                    const insertTarget = blockParent ? blockParent : link;

                    let next = insertTarget.nextSibling;
                    while (next && next.classList && next.classList.contains("cg-preview-wrapper")) {
                        next = next.nextSibling;
                    }
                    if (next) {
                        insertTarget.parentNode.insertBefore(wrapper, next);
                    } else {
                        insertTarget.parentNode.appendChild(wrapper);
                    }
                }

                if (shouldScroll) {
                    setTimeout(() => wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                }
            };

            if (link.href && link.href.startsWith("javascript:")) {
                iframe.name = "file_preview_" + Math.random().toString(36).substr(2, 9);

                const previewBtn = document.createElement("button");
                previewBtn.innerText = "ファイルをプレビュー";
                previewBtn.type = "button";
                previewBtn.className = "c-btn c-btn-line c-btn-sm";
                previewBtn.style.marginTop = "5px";
                previewBtn.style.marginBottom = "5px";
                previewBtn.style.display = "block";

                previewBtn.addEventListener("click", () => {
                    wrapper.style.display = "block";
                    previewBtn.style.display = "none";
                    insertWrapper(true);

                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc) doc.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px;'>読み込み中...</div>";

                    const originalJqSubmit = window.jQuery ? window.jQuery.fn.submit : null;
                    const originalNativeSubmit = HTMLFormElement.prototype.submit;
                    let submittedForm = null;

                    if (originalJqSubmit) {
                        window.jQuery.fn.submit = function () {
                            submittedForm = this[0];
                            return this;
                        };
                    }
                    HTMLFormElement.prototype.submit = function () {
                        submittedForm = this;
                    };

                    link.click();

                    setTimeout(async () => {
                        if (originalJqSubmit) window.jQuery.fn.submit = originalJqSubmit;
                        HTMLFormElement.prototype.submit = originalNativeSubmit;

                        if (typeof isSubmit !== 'undefined') window.isSubmit = false;
                        if (typeof closeLoading === 'function') window.closeLoading();

                        if (submittedForm) {
                            try {
                                const blob = await fetchPreviewBlob(submittedForm.action, submittedForm);
                                showPreview(blob);
                            } catch (e) {
                                const doc2 = iframe.contentDocument || iframe.contentWindow.document;
                                if (doc2) doc2.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px; color: red;'>読み込みに失敗しました。</div>";
                            }
                        } else {
                            const doc2 = iframe.contentDocument || iframe.contentWindow.document;
                            if (doc2) doc2.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px; color: red;'>フォームの送信を検知できませんでした。</div>";
                        }
                    }, 50);
                });

                link.parentNode.insertBefore(previewBtn, link.nextSibling);
            } else {
                wrapper.style.display = "block";
                insertWrapper(false);

                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc) doc.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px;'>読み込み中...</div>";

                fetchPreviewBlob(link.href)
                    .then(blob => {
                        showPreview(blob);
                    })
                    .catch(e => {
                        const doc2 = iframe.contentDocument || iframe.contentWindow.document;
                        if (doc2) doc2.body.innerHTML = "<div style='font-family: sans-serif; padding: 20px; color: red;'>読み込みに失敗しました。</div>";
                    });
            }
        });

        document.addEventListener("click", event => {
            const button = event.target.closest("#cg-credit-info");
            if (!button) return;
            event.preventDefault();
            void openCreditInfo(button);
        });

        const cMainMenu = document.getElementsByClassName("c-main-menu")[0];
        if (cMainMenu) {
            const sidebar = document.createElement('nav');
            sidebar.classList = "c-gnav";
            sidebar.id = "cg-sidebar";
            cMainMenu.appendChild(sidebar);
            const style = document.createElement('style');
            style.textContent = `
                #cg-sidebar {
                    display: block;
                    top: 0;
                    z-index: 2;
                    width: 88px;
                    height: 100vh;
                    padding-top: 76px;
                }
                #cg-sidebar a {
                    display: block;
                    text-align: center;
                    height: 76px;
                    padding: 15px 10px;
                    white-space: nowrap;
                    text-decoration: none;
                    border-top: 1px solid #ccc;
                    border-bottom: 1px solid #ccc;
                    font-size: 10px;
                }
                .c-container {
                    padding-left: 88px;
                }
                @media screen and (min-width: 561px) {
                    .cg-page-appearance .c-main-menu .c-main-menu-btn {
                        width: 88px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .cg-page-appearance .c-main-menu .c-main-menu-btn img {
                        position: static;
                        margin: 0;
                        transform: none;
                    }
                }
                @media print, screen and (max-width: 560px) {
                    #cg-sidebar {
                        display: none;
                    }
                    .c-container {
                        padding-left: 0;
                    }
                }
                .c-page-back-link {
                    border-top: 1px solid #ccc;
                    border-bottom: 1px solid #ccc;
                    border-right: 1px solid #ccc;
                }
                .cg-gnav-link i {
                    display: block;
                    font-size: 24px;
                    margin-bottom: 8px;
                }
                `;
            document.head.appendChild(style);
            sidebar.innerHTML = `
                    <a href="javascript:void(0);" onclick="javascript:ClearStorage(); javascript:postSubmit('emptyForm', 'SC_06001B00_01/init')" class="c-gnav-link cg-gnav-link"><i class="c-icon-search" aria-hidden="true"></i>シラバス</a>
                    <a href="javascript:void(0);" onclick="javascript:ClearStorage(); javascript:postSubmit('emptyForm', 'SC_12001B00_01/initFromHome')" class="c-gnav-link cg-gnav-link"><i class="c-icon-edit" aria-hidden="true"></i>授業情報</a>
                    <a href="javascript:void(0);" onclick="javascript:ClearStorage(); javascript:postSubmit('emptyForm', 'SC_14002B00_01/init')" class="c-gnav-link cg-gnav-link"><i class="c-icon-uploaed" aria-hidden="true"></i>課題提出</a>
                    <a href="javascript:void(0);" onclick="javascript:ClearStorage(); javascript:postSubmit('emptyForm', 'SC_07002B00_01/initStudent')" class="c-gnav-link cg-gnav-link"><i class="c-icon-submission" aria-hidden="true"></i>履修登録</a>
                    <a href="javascript:void(0);" onclick="javascript:ClearStorage(); javascript:postSubmit('emptyForm', 'SC_15005B00_01/init')" class="c-gnav-link cg-gnav-link"><i class="c-icon-graph" aria-hidden="true"></i>成績</a>
                    <a href="javascript:void(0);" id="cg-credit-info" class="c-gnav-link cg-gnav-link"><i class="c-icon-check" aria-hidden="true"></i>単位情報</a>
                `;
        }
    }

    installEarlyAppearance();
})();
