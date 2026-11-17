/* Index 1999 — a search engine for a world that never existed. */
const GEN = "https://gen.pollinations.ai";
const ENTER = "https://enter.pollinations.ai";
const TEXT_MODEL = "openai";
const KEY_STORE = "index1999.key";
// Optional: your own App Key (pk_...) from enter.pollinations.ai/keys, with
// this page's URL as a redirect URI. It names the app on the sign-in screen and
// lets you turn on developer earnings. Sign-in works without it.
const APP_KEY = "";
const HITS_STORE = "index1999.hits";

const $ = (id) => document.getElementById(id);

const state = {
    key: "",
    busy: false,
    sample: false,
    query: "",
    variation: 0,
    results: null,
};

const SAMPLE_QUERY = "why is the internet empty";

const SAMPLE = {
    corrected: null,
    notice: "Showing results from the June 12, 1999 crawl.",
    results: [
        {
            title: "The Empty Web Project — FAQ",
            url: "http://www.geocities.com/SiliconValley/EmptyWeb/",
            snippet:
                "We counted every page on the web twice. There are 4,102 of them. The rest is a rumor. Updated April 1999.",
            page: {
                title: "The Empty Web Project — FAQ",
                author: "Marjorie Chen, webmaster",
                last_updated: "April 17, 1999",
                body: [
                    "We started counting on January 1, 1999. The first count took eleven days and produced 4,102 pages. We expected more. The web, it turns out, is mostly a rumor told by search engines.",
                    "Why does my browser show nothing after 11 PM? Several readers have written in. The web is not closed at night. What you are seeing is the Internet catching its breath. Try reloading. If that fails, try tomorrow.",
                    "Is my homepage part of the Empty Web? If you have a homepage, yes. Everything is. The Empty Web is not a place; it is a habit of linking to pages that link back to you.",
                    "We are often asked whether the web will ever be full. We believe it will, eventually, but not in our lifetime. Until then, please sign the guestbook. It is the only page that is always growing.",
                ],
                footer:
                    "This page has been visited 000,014 times since April 1999. Best viewed in Netscape Navigator 4.0. Sign my guestbook!",
            },
        },
        {
            title: "alt.internet.empty — Frequently Asked Questions",
            url: "http://www.deja.com/alt.internet.empty/",
            snippet:
                "Why does my browser show nothing after 11 PM? Is the web closed? An archive of 2,300 Usenet posts from people who noticed.",
        },
        {
            title: "The Last Homepage",
            url: "http://members.tripod.com/~lastpage/",
            snippet:
                "A single GIF of a blinking mailbox and the sentence: “If you are reading this, the web has ended.” Guestbook unavailable.",
        },
        {
            title: "Dr. Eleanor Voss — Department of Internet Studies",
            url: "http://www.cs.university.edu/~evoss/empty/",
            snippet:
                "A 1998 paper arguing that the web is not empty, only filed under “Miscellaneous”. Includes a 14-page bibliography and one broken link.",
        },
        {
            title: "WebRing: The Empty Ring",
            url: "http://www.webring.org/empty/",
            snippet:
                "67 sites. All of them say “Next site” and link to each other. Ringmaster: Dave, last updated March 1999.",
        },
    ],
};

const CRAWL_MESSAGES = [
    "Resolving imaginary DNS…",
    "Crawling 4,096 pages…",
    "Consulting the guestbook…",
    "Compressing GIFs…",
    "Asking the webmaster…",
    "Indexing under construction…",
    "Alphabetizing the miscellaneous…",
];

let crawlerTimer = null;
let toastTimer = null;

function setBusy(busy) {
    state.busy = busy;
    $("searchForm").querySelector(".search-button").disabled = busy;
    $("luckyButton").disabled = busy || !state.results;
}

function showCrawler() {
    const crawler = $("crawler");
    const bar = $("crawlerBar");
    const text = $("crawlerText");
    crawler.hidden = false;
    bar.style.width = "6%";
    let i = 0;
    text.textContent = CRAWL_MESSAGES[0];
    clearInterval(crawlerTimer);
    crawlerTimer = setInterval(() => {
        i += 1;
        text.textContent = CRAWL_MESSAGES[i % CRAWL_MESSAGES.length];
        const width = Math.min(92, 6 + i * 11);
        bar.style.width = `${width}%`;
    }, 850);
}

function hideCrawler() {
    clearInterval(crawlerTimer);
    crawlerTimer = null;
    const bar = $("crawlerBar");
    bar.style.width = "100%";
    setTimeout(() => {
        $("crawler").hidden = true;
        bar.style.width = "4%";
    }, 320);
}

function showToast(message, ms = 3400) {
    const toast = $("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, ms);
}

function formatHits(n) {
    return String(n).padStart(6, "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function bumpHits() {
    const n = Number(localStorage.getItem(HITS_STORE) || "14") + 1;
    localStorage.setItem(HITS_STORE, String(n));
    $("hitCounter").textContent = formatHits(n);
}

function readStoredKey() {
    try {
        return sessionStorage.getItem(KEY_STORE) || "";
    } catch {
        return "";
    }
}

function storeKey(value) {
    try {
        sessionStorage.setItem(KEY_STORE, value);
    } catch {
        /* private mode: keep it in memory */
    }
}

function clearStoredKey() {
    try {
        sessionStorage.removeItem(KEY_STORE);
    } catch {
        /* ignore */
    }
}

function maskKey(value) {
    return value.length > 12
        ? `${value.slice(0, 7)}…${value.slice(-4)}`
        : value;
}

function setConnected(value) {
    state.key = value;
    const el = $("keyState");
    if (value) {
        el.textContent = `Connected · ${maskKey(value)}`;
        el.classList.add("connected");
        $("disconnectButton").hidden = false;
        $("connectButton").hidden = true;
    } else {
        el.textContent = "Not connected";
        el.classList.remove("connected");
        $("disconnectButton").hidden = true;
        $("connectButton").hidden = false;
    }
}

function openKeyPanel() {
    $("keyPanel").hidden = false;
    $("signInButton").focus();
    $("keyError").textContent = "";
}

function closeKeyPanel() {
    $("keyPanel").hidden = true;
    $("keyError").textContent = "";
}

// Pollinations asks the visitor to approve this app, then sends them back with
// a key for their own Pollen in the URL fragment: #api_key=sk_...
function signIn() {
    const params = new URLSearchParams({
        redirect_uri: window.location.origin + window.location.pathname,
    });
    if (APP_KEY) params.set("client_id", APP_KEY);
    window.location.href = `${ENTER}/authorize?${params}`;
}

function readSignInResult() {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.has("api_key") && !hash.has("error")) return;
    const { pathname, search } = window.location;
    history.replaceState(null, "", pathname + search);
    const key = hash.get("api_key");
    if (key) {
        storeKey(key);
        showToast("Connected. Every search spends your own Pollen.");
    } else {
        showToast("Sign-in was cancelled.");
    }
}

async function chatJSON(system, user, maxTokens) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    let response;
    try {
        response = await fetch(`${GEN}/v1/chat/completions`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${state.key}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: TEXT_MODEL,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                temperature: 0.9,
                max_tokens: maxTokens,
                reasoning_effort: "low",
                response_format: { type: "json_object" },
            }),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        let message = "";
        try {
            const body = await response.json();
            message = body?.error?.message || body?.message || "";
        } catch {
            /* not JSON */
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Your sign-in expired. Disconnect and sign in again.",
            );
        }
        if (response.status === 402) {
            throw new Error(
                "Out of Pollen, or the sign-in budget is used up. Top up or sign in again.",
            );
        }
        if (response.status === 429) {
            throw new Error("The Index is rate-limited. Wait a moment.");
        }
        throw new Error(
            message || `The Index returned HTTP ${response.status}.`,
        );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("The Index returned a blank card catalogue.");
    }
    return parseModelJson(content);
}

function parseModelJson(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("The Index returned prose instead of a card catalogue.");
    }
    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch {
        throw new Error(
            "The Index returned a card catalogue that would not open.",
        );
    }
}

function asText(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanUrl(value) {
    const text = asText(value, 300);
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    return `http://${text.replace(/^\/+/, "")}`;
}

function normalizeResults(raw) {
    const list = Array.isArray(raw?.results) ? raw.results : [];
    const results = list
        .map((entry) => ({
            title: asText(entry?.title, 180),
            url: cleanUrl(entry?.url),
            snippet: asText(entry?.snippet, 600),
        }))
        .filter((entry) => entry.title && entry.url && entry.snippet)
        .slice(0, 5);
    if (results.length < 3) {
        throw new Error("The Index lost most of its card catalogue.");
    }
    return {
        corrected: asText(raw?.corrected, 120) || null,
        notice: asText(raw?.notice, 200) || null,
        results,
    };
}

function renderResults(data, { sample = false, query = "", scroll = true } = {}) {
    state.results = data;
    state.sample = sample;
    state.query = query;
    $("searchError").hidden = true;
    $("emptyState").hidden = true;
    $("resultsSection").hidden = false;
    $("sampleFlag").hidden = !sample;
    $("rerollButton").hidden = sample || !state.key;
    $("luckyButton").disabled = false;

    const stats = $("resultsStats");
    const count = data.results.length;
    stats.textContent = `${count} result${count === 1 ? "" : "s"} of 4,102 pages (0.42 seconds)`;

    const corrected = $("corrected");
    if (data.corrected && data.corrected.toLowerCase() !== query.toLowerCase()) {
        corrected.hidden = false;
        corrected.replaceChildren();
        const prefix = document.createTextNode("Showing results for ");
        const strong = document.createElement("strong");
        strong.textContent = data.corrected;
        const suffix = document.createTextNode(". Search instead for ");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "link-button";
        button.textContent = query;
        button.addEventListener("click", () => {
            $("queryInput").value = query;
            search(query);
        });
        corrected.append(prefix, strong, suffix, button);
    } else {
        corrected.hidden = true;
        corrected.replaceChildren();
    }

    const notice = $("notice");
    notice.textContent = data.notice || "";
    notice.hidden = !data.notice;

    const list = $("resultsList");
    list.replaceChildren();
    data.results.forEach((result, index) => {
        const item = document.createElement("li");
        item.className = "result";

        const title = document.createElement("button");
        title.type = "button";
        title.className = "result-title";
        title.textContent = result.title;
        title.addEventListener("click", () => openPage(result, index));

        const url = document.createElement("span");
        url.className = "result-url";
        url.textContent = result.url;

        const snippet = document.createElement("p");
        snippet.className = "result-snippet";
        snippet.textContent = result.snippet;

        const tag = document.createElement("span");
        tag.className = "result-tag";
        tag.textContent = sample ? "sample page" : "invented page";

        item.append(title, url, snippet, tag);
        list.append(item);
    });

    $("paginationNote").textContent = `Results 1–${count} of a very small web.`;
    if (scroll) {
        $("resultsSection").scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
}

function showSample({ scroll = true } = {}) {
    closeKeyPanel();
    renderResults(SAMPLE, { sample: true, query: SAMPLE_QUERY, scroll });
    $("queryInput").value = SAMPLE_QUERY;
    bumpHits();
    showToast("Sample search. Sign in to search the rest of the web.");
}

const RESULTS_SYSTEM = `You are INDEX 1999, the search engine of a fictional web frozen in 1999. You do not know about anything after 1999 and you never mention being an AI. Given a query, invent five search results from that web. Each result is a page that could exist on Geocities, Tripod, Angelfire, a university department, a Usenet archive, or a personal homepage. Titles are specific and a little odd. Snippets are one or two sentences in the page's own voice, with concrete 1999 details (guestbooks, hit counters, MIDI files, Netscape, under construction). URLs start with http:// and look period-correct. The five results should form a coherent little corner of the web. Never use real current websites or real people. Return JSON only, with this exact shape: {"corrected": string or null, "notice": string or null, "results": [{"title": string, "url": string, "snippet": string}]} with exactly five results.`;

function resultsPrompt(query, variation) {
    const extra =
        variation > 0
            ? ` This is variation ${variation}; show a different corner of the web than the obvious one.`
            : "";
    return `Query: "${query}"${extra}\n\nReturn the five results as JSON.`;
}

async function search(query) {
    if (state.busy) return;
    const q = query.trim();
    if (!q) {
        $("queryInput").focus();
        showToast("Type something first. The Index cannot search a silence.");
        return;
    }
    if (!state.key) {
        openKeyPanel();
        showToast("Connect a Pollinations key, or try the free sample.");
        return;
    }

    state.variation += 1;
    setBusy(true);
    showCrawler();
    $("resultsSection").hidden = true;
    $("emptyState").hidden = true;

    try {
        const raw = await chatJSON(
            RESULTS_SYSTEM,
            resultsPrompt(q, state.variation - 1),
            900,
        );
        const data = normalizeResults(raw);
        renderResults(data, { sample: false, query: q });
        bumpHits();
    } catch (err) {
        $("emptyState").hidden = false;
        const message =
            err instanceof Error
                ? err.message
                : "The Index could not reach its imaginary servers.";
        const error = $("searchError");
        error.textContent = message;
        error.hidden = false;
        showToast(message, 5200);
    } finally {
        hideCrawler();
        setBusy(false);
    }
}

const PAGE_SYSTEM = `You are the webmaster of a page on the fictional 1999 web. Write the page at the given URL in the voice of 1999. Return JSON only, with this exact shape: {"title": string, "author": string or null, "last_updated": string, "body": [string, string, string], "footer": string}. The body has 3 to 5 paragraphs of plain text (no HTML, no markdown). Include period details (a guestbook, a hit counter, a midi file, a broken link, a webring) and a little dry humor. Write it straight-faced: the app already discloses that everything is invented, so do not put a disclaimer inside the page.`;

function pagePrompt(result) {
    return `URL: ${result.url}\nTitle: ${result.title}\nSnippet: ${result.snippet}\n\nWrite the page as JSON.`;
}

async function generatePage(result) {
    const prompt = pagePrompt(result);
    try {
        return await chatJSON(PAGE_SYSTEM, prompt, 1000);
    } catch (first) {
        // A page is one small call; retry once for a transient upstream
        // hiccup. Never retry a key or billing failure.
        if (
            first instanceof Error &&
            /rejected|out of Pollen|rate-limited/i.test(first.message)
        ) {
            throw first;
        }
        await new Promise((resolve) => setTimeout(resolve, 900));
        return await chatJSON(PAGE_SYSTEM, prompt, 1000);
    }
}

function renderPage(page) {
    $("pageLoading").hidden = true;
    $("pageError").hidden = true;
    $("pageContent").hidden = false;
    $("pageTitle").textContent = page.title;
    $("pageByline").textContent = [page.author, page.last_updated]
        .filter(Boolean)
        .join(" · ");
    const container = $("pageParagraphs");
    container.replaceChildren();
    for (const paragraph of page.body) {
        const p = document.createElement("p");
        p.textContent = paragraph;
        container.append(p);
    }
    $("pageFooter").textContent = page.footer || "";
    $("pageTitleBar").textContent = page.title;
}

function showPageError(message) {
    $("pageLoading").hidden = true;
    $("pageContent").hidden = true;
    $("pageError").hidden = false;
    $("pageError").textContent = message;
}

function fallbackPage(result) {
    return {
        title: result.title,
        author: "The Index",
        last_updated: "sometime in 1999",
        body: [
            result.snippet,
            "This page is under construction. The webmaster ran out of animated GIFs and went to get more from a friend with a zip drive.",
            "You have reached the end of the invented web. Please turn back, or sign the guestbook on your way out.",
        ],
        footer:
            "This page has been visited 000,003 times. Best viewed at 800×600. Sign my guestbook!",
    };
}

async function openPage(result) {
    const dialog = $("pageDialog");
    $("pageTitleBar").textContent = result.title;
    $("pageUrlBar").textContent = result.url;
    $("pageStatus").textContent = "Contacting the server…";
    $("pageLoading").hidden = false;
    $("pageContent").hidden = true;
    $("pageError").hidden = true;
    if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }

    if (state.sample && result.page) {
        renderPage(result.page);
        $("pageStatus").textContent = "Document: done (0.00 secs)";
        return;
    }

    if (!state.key) {
        renderPage(fallbackPage(result));
        $("pageStatus").textContent = "Document: done (imaginary)";
        return;
    }

    try {
        const raw = await generatePage(result);
        const body = Array.isArray(raw?.body)
            ? raw.body.map((p) => asText(p, 2000)).filter(Boolean)
            : [];
        if (!body.length) throw new Error("empty page");
        renderPage({
            title: asText(raw.title, 180) || result.title,
            author: asText(raw.author, 120),
            last_updated: asText(raw.last_updated, 80),
            body: body.slice(0, 6),
            footer: asText(raw.footer, 300),
        });
        $("pageStatus").textContent = "Document: done (0.42 secs)";
        bumpHits();
    } catch (err) {
        window.__lastPageError =
            err instanceof Error ? err.stack || err.message : String(err);
        console.error("Index page generation failed", err);
        renderPage(fallbackPage(result));
        $("pageStatus").textContent = "Document: done (with apologies)";
        showToast("That page did not load. The Index improvised.");
    }
}

function closePage() {
    const dialog = $("pageDialog");
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
}

function openFirstResult() {
    if (!state.results?.results?.length) {
        showToast("Search first. There is nothing to be lucky about yet.");
        return;
    }
    openPage(state.results.results[0], 0);
}

function bindEvents() {
    $("connectButton").addEventListener("click", openKeyPanel);
    $("signInButton").addEventListener("click", signIn);
    $("disconnectButton").addEventListener("click", () => {
        clearStoredKey();
        setConnected("");
        closeKeyPanel();
        showToast("Disconnected. The imaginary web will wait.");
    });
    $("sampleButton").addEventListener("click", showSample);
    $("emptySampleButton").addEventListener("click", showSample);
    $("searchForm").addEventListener("submit", (event) => {
        event.preventDefault();
        search($("queryInput").value);
    });
    $("luckyButton").addEventListener("click", openFirstResult);
    $("rerollButton").addEventListener("click", () => {
        if (state.query) search(state.query);
    });
    $("nextButton").addEventListener("click", () => {
        showToast(
            "There is no next page. The Index is 4,102 pages total, and you have seen five.",
            4200,
        );
    });
    $("closePageButton").addEventListener("click", closePage);
    $("pageDialog").addEventListener("click", (event) => {
        if (event.target === $("pageDialog")) closePage();
    });
    document.querySelectorAll(".suggestion").forEach((button) => {
        button.addEventListener("click", () => {
            const query = button.dataset.query || "";
            $("queryInput").value = query;
            if (state.key) search(query);
            else {
                openKeyPanel();
                showToast("Sign in, or try the free sample search.");
            }
        });
    });
}

function init() {
    bindEvents();
    readSignInResult();
    const stored = readStoredKey();
    setConnected(stored);
    const hits = Number(localStorage.getItem(HITS_STORE) || "14");
    $("hitCounter").textContent = formatHits(hits);
    $("visitorCount").textContent = String(9 + (hits % 19));
    // A direct link for screenshots and reviewers: open the sample results.
    const params = new URLSearchParams(window.location.search);
    if (params.has("sample")) {
        showSample({ scroll: false });
        window.scrollTo(0, 0);
        if (params.has("page")) {
            setTimeout(() => openPage(SAMPLE.results[0]), 250);
        }
    }
}

init();
